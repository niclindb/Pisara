import { describe, expect, it } from "vitest";
import { addressOf, MIGRATIONS, setupChecks, type MigrationName, type SetupCheck } from "./setup-check";

const allApplied = Object.fromEntries(MIGRATIONS.map((m) => [m, true])) as Record<MigrationName, boolean>;
const live = {
  SITE_URL: "https://pisara.vercel.app",
  CRON_SECRET: "c",
  UNSUBSCRIBE_SECRET: "u",
  SMTP_USER: "pisara.lessons@gmail.com",
  SMTP_PASSWORD: "abcd efgh ijkl mnop",
  CONTACT_EMAIL: "pisara.lessons@gmail.com",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
};
const check = (env: Record<string, string | undefined>, migrations = allApplied) =>
  new Proxy({} as Record<"Site address" | "Secrets" | "Lesson email sign-in" | "Email" | "Contact address" | "Database", SetupCheck>, {
    get: (_, label) => {
      const found = setupChecks({ env, migrations }).find((c) => c.label === label);
      if (!found) throw new Error(`no check named ${String(label)}`);
      return found;
    },
  });

describe("setupChecks", () => {
  it("is all green for a finished setup", () => {
    expect(setupChecks({ env: live, migrations: allApplied }).every((c) => c.state === "ok")).toBe(true);
  });

  it("flags a missing, local or slash-ended site address", () => {
    expect(check({ ...live, SITE_URL: undefined })["Site address"].state).toBe("problem");
    expect(check({ ...live, SITE_URL: "http://localhost:3000" })["Site address"].state).toBe("problem");
    expect(check({ ...live, SITE_URL: "https://pisara.vercel.app/" })["Site address"].detail).toContain("https://pisara.vercel.app");
  });

  it("names missing secrets without showing any value", () => {
    const c = check({ ...live, CRON_SECRET: "" })["Secrets"];
    expect(c.state).toBe("problem");
    expect(c.detail).toContain("CRON_SECRET");
    expect(check(live)["Secrets"].detail).not.toContain("c,");
  });

  it("never shows the Gmail app password", () => {
    const text = JSON.stringify(setupChecks({ env: live, migrations: allApplied }));
    expect(text).not.toContain("abcd efgh");
  });

  it("catches a Gmail sender that doesn't match the account", () => {
    const c = check({ ...live, EMAIL_FROM: "Pisara <lessons@getpisara.com>" })["Email"];
    expect(c.state).toBe("problem");
    expect(c.detail).toContain("Pisara <pisara.lessons@gmail.com>");
    expect(check({ ...live, EMAIL_FROM: "Pisara <Pisara.Lessons@gmail.com>" })["Email"].state).toBe("ok");
  });

  it("lets SendGrid send from its verified sender, but needs EMAIL_FROM", () => {
    const sendgrid = { ...live, SMTP_HOST: "smtp.sendgrid.net", SMTP_USER: "apikey", SMTP_PASSWORD: "SG.secret" };
    expect(check({ ...sendgrid, EMAIL_FROM: "Pisara <pisara.lessons@gmail.com>" })["Email"]).toMatchObject({ state: "ok" });
    expect(check({ ...sendgrid, EMAIL_FROM: "Pisara <pisara.lessons@gmail.com>" })["Email"].detail).toContain("smtp.sendgrid.net");
    expect(check(sendgrid)["Email"].state).toBe("problem");
  });

  it("needs the app password with SMTP_USER", () => {
    expect(check({ ...live, SMTP_PASSWORD: "" })["Email"].state).toBe("problem");
  });

  it("treats no email and no contact address as to-dos, not errors", () => {
    const c = check({ ...live, SMTP_USER: "", CONTACT_EMAIL: undefined });
    expect(c["Email"].state).toBe("todo");
    expect(c["Contact address"].state).toBe("todo");
    expect(check({ ...live, SMTP_USER: "", RESEND_API_KEY: "re_x" })["Email"].state).toBe("ok");
  });

  it("treats a missing service role key as a to-do, without showing the key", () => {
    expect(check({ ...live, SUPABASE_SERVICE_ROLE_KEY: undefined })["Lesson email sign-in"].state).toBe("todo");
    expect(check(live)["Lesson email sign-in"].detail).not.toContain("service-role");
  });

  it("lists migrations that aren't applied", () => {
    const c = check(live, { ...allApplied, "daily run log": false, "third waiting reminder": false })["Database"];
    expect(c.state).toBe("problem");
    expect(c.detail).toContain("daily run log, third waiting reminder");
  });
});

describe("addressOf", () => {
  it("takes the address out of a display name", () => {
    expect(addressOf("Pisara <A@b.com>")).toBe("a@b.com");
    expect(addressOf("a@b.com")).toBe("a@b.com");
  });
});
