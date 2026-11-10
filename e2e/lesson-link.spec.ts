// The "Begin lesson" link in the daily email (lesson-link.ts). The page tests
// have no Supabase, so signing in falls back to the sign-in page, set to come
// back to the lesson; with Supabase it goes to the lesson signed in.

import { expect, test } from "@playwright/test";
import { lessonLinkToken } from "../lib/email/lesson-link";
import { expectAccessible, signInAs } from "./helpers";
import { IDS } from "./seed";

const lesson = IDS.lessons[0];
const secret = process.env.UNSUBSCRIBE_SECRET!;
const link = (when = new Date(), user: string = IDS.learner) => `/auth/lesson/${lessonLinkToken(user, lesson, when, secret)}`;
const signInForLesson = `/sign-in?next=${encodeURIComponent(`/lessons/${lesson}`)}`;

test("already signed in as that learner: straight to the lesson", async ({ page, context }) => {
  await signInAs(context, "learner");
  await page.goto(link());
  await expect(page).toHaveURL(`/lessons/${lesson}`);
});

test("signed out: signs in by itself, falling back to sign-in for the lesson", async ({ page, context }) => {
  await signInAs(context, "visitor");
  await page.goto(link());
  await expect(page).toHaveURL(signInForLesson);
});

test("expired: asks to sign in, then back to the lesson", async ({ page, context }) => {
  await signInAs(context, "visitor");
  await page.goto(link(new Date(Date.now() - 2 * 24 * 3600_000)));
  await expect(page).toHaveURL(signInForLesson);
});

test("forged: plain sign-in", async ({ page, context }) => {
  await signInAs(context, "visitor");
  await page.goto(link().replace(/[^.]+$/, "forged"));
  await expect(page).toHaveURL("/sign-in");
});

test.describe("without JavaScript, like a mail scanner", () => {
  test.use({ javaScriptEnabled: false });

  test("opening the link changes nothing and offers a button", async ({ page, context }) => {
    await signInAs(context, "visitor");
    await page.goto(link());
    await expect(page.getByRole("heading", { name: "Opening your lesson" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open lesson" })).toBeVisible();
  });
});

test("the page passes axe while it signs in", async ({ page, context }) => {
  await signInAs(context, "visitor");
  // Keep the form from submitting itself so the page stays put for axe.
  await page.addInitScript(() => {
    HTMLFormElement.prototype.requestSubmit = () => {};
  });
  await page.goto(link());
  await expect(page.getByRole("heading", { name: "Opening your lesson" })).toBeVisible();
  await expectAccessible(page);
  await expect(page.getByRole("heading", { name: "Opening your lesson" })).toBeVisible();
});
