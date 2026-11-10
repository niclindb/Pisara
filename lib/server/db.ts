import { connect, type Sql } from "../jobs/postgres-store";
import { env } from "./env";
import { withWatchdog } from "./watchdog";

/** Longest a single query or transaction may take before its connection is replaced. */
export const QUERY_LIMIT_MS = 20_000;

let sql: Sql | null = null;

/**
 * The shared database client for this server instance. A few connections, so
 * one slow page (or a burst of link prefetches) doesn't hold up the rest.
 * Idle connections close after 20 seconds and none lives past 5 minutes, so a
 * connection the pooler dropped while the instance was frozen isn't reused for
 * long; the watchdog catches the rest.
 */
export function db(): Sql {
  if (!sql) {
    const client = connect(env.databaseUrl(), { max: 5, idle_timeout: 20, max_lifetime: 5 * 60, connect_timeout: 10 });
    const guarded = withWatchdog(client, QUERY_LIMIT_MS, (error) => {
      console.error(`${error.message} Opening a new connection for the next request.`);
      if (sql === guarded) sql = null;
      void client.end({ timeout: 0 });
    });
    sql = guarded;
  }
  return sql;
}
