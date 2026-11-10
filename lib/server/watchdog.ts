// A time limit on every database call the app makes.
//
// On Vercel, a server instance is frozen between requests. While it's frozen,
// the pooler can drop its database connection without the instance noticing.
// Queries sent on that dead connection never get an answer, so every page that
// needs the database waits until Vercel gives up after 5 minutes. The watchdog
// fails a call that runs past the limit instead, and tells the caller to throw
// the connection away so the next request opens a fresh one.

import type { Sql } from "../jobs/postgres-store";

/** A database call that ran past the time limit. */
export class StuckQueryError extends Error {
  constructor(what: string, limitMs: number) {
    super(`The database didn't answer a ${what} within ${limitMs / 1000} seconds.`);
    this.name = "StuckQueryError";
  }
}

/**
 * Wraps `sql` so each awaited query and each transaction rejects with
 * StuckQueryError after `limitMs`. The first time that happens, `onStuck` runs
 * (once): close the client there and stop handing it out.
 */
export function withWatchdog(sql: Sql, limitMs: number, onStuck: (error: StuckQueryError) => void): Sql {
  let tripped = false;
  const guard = <T>(work: PromiseLike<T>, what: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limit = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new StuckQueryError(what, limitMs);
        if (!tripped) {
          tripped = true;
          onStuck(error);
        }
        reject(error);
      }, limitMs);
    });
    return Promise.race([work, limit]).finally(() => clearTimeout(timer));
  };

  return new Proxy(sql, {
    apply(target, thisArg, args) {
      const query = Reflect.apply(target, thisArg, args);
      // Only awaited queries are timed. A query nested inside another one as a
      // fragment is never awaited, and helpers such as sql(list) aren't queries.
      if (query && typeof query.then === "function") {
        const then = query.then.bind(query);
        query.then = (ok?: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => guard({ then }, "query").then(ok, fail);
      }
      return query;
    },
    get(target, prop, receiver) {
      if (prop === "begin") {
        return (...args: unknown[]) => guard((target.begin as (...a: unknown[]) => Promise<unknown>)(...args), "transaction");
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
