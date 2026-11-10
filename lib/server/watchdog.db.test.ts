// The database time limit against a real Postgres database. Needs
// TEST_DATABASE_URL (see supabase/README.md). Reads only.

import { afterAll, describe, expect, it } from "vitest";
import { connect } from "../jobs/postgres-store";
import { StuckQueryError, withWatchdog } from "./watchdog";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database watchdog", () => {
  const clients: ReturnType<typeof connect>[] = [];
  const client = () => {
    const c = connect(url!);
    clients.push(c);
    return c;
  };
  afterAll(async () => {
    await Promise.all(clients.map((c) => c.end({ timeout: 0 })));
  });

  it("passes quick queries, fragments and transactions through unchanged", async () => {
    const stuck: StuckQueryError[] = [];
    const sql = withWatchdog(client(), 2_000, (e) => stuck.push(e));
    const [row] = await sql`select ${sql`1`}::int + ${2}::int as n`;
    expect(row!.n).toBe(3);
    const fromTx = await sql.begin(async (tx) => (await tx`select 'ok' as v`)[0]!.v);
    expect(fromTx).toBe("ok");
    expect(stuck).toEqual([]);
  });

  it("fails a query that runs past the limit, and reports it once", async () => {
    const stuck: StuckQueryError[] = [];
    const sql = withWatchdog(client(), 300, (e) => stuck.push(e));
    await expect(sql`select pg_sleep(2)`).rejects.toBeInstanceOf(StuckQueryError);
    await expect(sql.begin((tx) => tx`select pg_sleep(2)`)).rejects.toBeInstanceOf(StuckQueryError);
    expect(stuck).toHaveLength(1);
  });

  it("fails queries waiting behind a stuck one", async () => {
    const sql = withWatchdog(client(), 300, () => {});
    const slow = sql`select pg_sleep(2)`;
    const behind = sql`select 1`;
    await expect(Promise.all([slow, behind])).rejects.toBeInstanceOf(StuckQueryError);
    await expect(behind).rejects.toBeInstanceOf(StuckQueryError);
  });
});
