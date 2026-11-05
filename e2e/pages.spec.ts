// Every page passes axe's WCAG 2.2 AA checks (design 10), signed out, as a
// learner and as an author, in each project (light, dark, phone). Axe catches
// only part of what matters; docs/accessibility-checklist.md covers the rest.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { emailSettingsToken } from "../lib/email/unsubscribe";
import { AUTHOR, BLACK_HOLES, DATABASE_URL, LEARNER, NEWCOMER, RECAP, STARS, UNSUBSCRIBE_SECRET, lesson, question } from "./fixtures";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function signInAs(page: Page, who: string) {
  await page.context().addCookies([{ name: "pisara-dev-user", value: who, url: "http://localhost:3100" }]);
}

async function expectAccessible(page: Page) {
  // Next's dev-mode overlay button isn't part of the app.
  const results = await new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal").analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`);
  expect(summary, `axe found problems on ${page.url()}`).toEqual([]);
}

async function check(page: Page, path: string, heading?: RegExp) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should load`).toBeLessThan(500);
  await page.waitForLoadState("networkidle");
  if (heading) await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  await expectAccessible(page);
}

test.describe("signed out", () => {
  test.beforeEach(({ page }) => signInAs(page, "signed-out"));

  const pages: [string, RegExp?][] = [
    ["/", /One short lesson a day/],
    ["/explore"],
    [`/explore/${STARS}`, /Stars/],
    [`/explore/${BLACK_HOLES}`, /Black holes/],
    [`/explore/${STARS}/preview`, /Main sequence/],
    ["/sign-in"],
    ["/sign-in/expired"],
    [`/email/${emailSettingsToken(LEARNER, UNSUBSCRIBE_SECRET)}`, /Email settings|Emails are off/],
    ["/email/not-a-real-link", /doesn.t work/],
    ["/no-such-page", /isn.t here/],
  ];
  for (const [path, heading] of pages) {
    test(`${path} passes axe`, async ({ page }) => check(page, path, heading));
  }

  test("the preview quiz, after answering, passes axe", async ({ page }) => {
    await page.goto(`/explore/${STARS}/preview`);
    await page.waitForLoadState("networkidle"); // let React take over the form first
    await page.getByLabel("Planets form").first().check();
    await page.getByRole("button", { name: /check/i }).first().click();
    await expect(page.getByText("Not quite")).toBeVisible();
    await expectAccessible(page);
  });
});

test.describe("learner", () => {
  test.beforeEach(({ page }) => signInAs(page, LEARNER));

  const pages: [string, RegExp?][] = [
    ["/home"],
    [`/lessons/${lesson(2)}`, /Red giants/],
    ["/history"],
    ["/progress"],
    ["/topics"],
    ["/settings"],
    [`/recap/${RECAP}`],
    ["/explore"],
    [`/explore/${STARS}`, /Stars/],
  ];
  for (const [path, heading] of pages) {
    test(`${path} passes axe`, async ({ page }) => check(page, path, heading));
  }

  test("the lesson quiz with its results passes axe", async ({ page }) => {
    // Each project answers afresh.
    const sql = postgres(DATABASE_URL, { onnotice: () => {} });
    await sql`update public.deliveries set quiz_completed_at = null where user_id = ${LEARNER} and lesson_id = ${lesson(1)}`;
    await sql`delete from public.answers where user_id = ${LEARNER} and question_id = ${question(1)}`;
    await sql`delete from public.review_items where user_id = ${LEARNER} and question_id = ${question(1)}`;
    await sql`update public.review_items set due_on = current_date - 1, step = 0 where user_id = ${LEARNER}`;
    await sql.end();

    await page.goto(`/lessons/${lesson(1)}`);
    await page.waitForLoadState("networkidle"); // let React take over the form first
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Main sequence/);
    await page.getByText("Show solution").click();
    // The lesson's question plus the review question that's due.
    for (const option of await page.getByLabel("Planets form").all()) await option.check();
    await page.getByRole("button", { name: /check|submit/i }).first().click();
    await expect(page.getByText("Not quite").first()).toBeVisible();
    await expectAccessible(page);
  });
});

test.describe("newcomer", () => {
  test("onboarding passes axe", async ({ page }) => {
    await signInAs(page, NEWCOMER);
    await check(page, "/onboarding");
  });
});

test.describe("author", () => {
  test.beforeEach(({ page }) => signInAs(page, AUTHOR));

  const pages: [string, RegExp?][] = [
    ["/author"],
    [`/author/topics/${STARS}`],
    [`/author/lessons/${lesson(1)}`],
    [`/author/lessons/${lesson(1)}/preview`],
  ];
  for (const [path, heading] of pages) {
    test(`${path} passes axe`, async ({ page }) => check(page, path, heading));
  }
});
