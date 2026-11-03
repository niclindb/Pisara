import { connect, type Sql } from "../jobs/postgres-store";
import { env } from "./env";

let sql: Sql | null = null;

/** One shared connection per server instance. */
export function db(): Sql {
  sql ??= connect(env.databaseUrl());
  return sql;
}
