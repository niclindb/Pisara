// Settings, email preferences and account deletion against a real Postgres
// database. Needs TEST_DATABASE_URL (see supabase/README.md). Deletes all data in that database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { emailSettingsToken } from "../email/unsubscribe";
import { connect } from "./postgres-store";
import { deleteAccount, loadSettings, openEmailPreferences, SettingsError, updateEmailPreferences, updateSettings } from "./settings";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? connect(url) : (null as never);

const U = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const SECRET = "test-secret";
const now = new Date("2026-11-04T12:00:00Z");

async function reset() {
  await sql`truncate auth.users, public.categories, public.topics, public.lessons cascade`;
  await sql`insert into auth.users (id, email) values (${U}, 'nick@example.com'), (${OTHER}, 'other@example.com')`;
}

describe.skipIf(!url)("settings on Postgres", () => {
  beforeEach(reset);
  afterAll(async () => {
    if (url) await sql.end();
  });

  it("changes only the settings given", async () => {
    await updateSettings(sql, U, { displayName: " Nick ", timeZone: "Europe/Helsinki" }, now);
    const s = await updateSettings(sql, U, { weeklyRecapDay: 3, pausedUntil: "2026-11-20" }, now);
    expect(s).toMatchObject({
      email: "nick@example.com",
      displayName: "Nick",
      timeZone: "Europe/Helsinki",
      weeklyRecapDay: 3,
      emailsEnabled: true,
      pausedUntil: "2026-11-20",
    });
    expect((await updateSettings(sql, U, { pausedUntil: null, displayName: "" }, now))).toMatchObject({ pausedUntil: null, displayName: null });

    const err = await updateSettings(sql, U, { timeZone: "Nowhere", pausedUntil: "2026-01-01" }, now).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(SettingsError);
    expect(err.problems).toEqual(["Pick your time zone.", "Pick a day from today on."]);
  });

  it("hides a pause that has ended", async () => {
    await sql`update public.profiles set paused_until = '2026-11-01' where id = ${U}`;
    expect((await loadSettings(sql, U, now))!.pausedUntil).toBeNull();
  });

  it("turns emails off from the email link, with Undo and a pause", async () => {
    const token = emailSettingsToken(U, SECRET);
    expect(await openEmailPreferences(sql, `${U}.forged`, SECRET, now)).toBeNull();
    expect(await openEmailPreferences(sql, emailSettingsToken(U, "wrong"), SECRET, now)).toBeNull();
    expect(await openEmailPreferences(sql, token, SECRET, now)).toMatchObject({ emailsEnabled: false, email: "nick@example.com" });
    expect(await updateEmailPreferences(sql, token, SECRET, { emailsEnabled: true }, now)).toMatchObject({ emailsEnabled: true });
    expect(await updateEmailPreferences(sql, token, SECRET, { pausedUntil: "2026-11-11" }, now)).toMatchObject({
      emailsEnabled: true,
      pausedUntil: "2026-11-11",
    });
    // The other learner is untouched.
    expect(await sql`select emails_enabled, paused_until from public.profiles where id = ${OTHER}`).toEqual([
      { emails_enabled: true, paused_until: null },
    ]);
  });

  it("deletes an account and all its data", async () => {
    await sql`insert into public.categories (id, name) values ('10000000-0000-4000-8000-000000000001', 'Science')`;
    await sql`insert into public.topics (id, category_id, name) values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Stars')`;
    await sql`insert into public.user_topics (user_id, topic_id) values (${U}, '20000000-0000-4000-8000-000000000001')`;
    expect(await deleteAccount(sql, U)).toBe(true);
    expect(await sql`select id from public.profiles`).toEqual([{ id: OTHER }]);
    expect(await sql`select * from public.user_topics`).toEqual([]);
    expect(await deleteAccount(sql, U)).toBe(false);
  });
});
