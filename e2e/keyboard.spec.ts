// Keyboard-only runs of sign-in, onboarding and a quiz (design 10).

import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, signInAs } from "./helpers";
import { IDS } from "./seed";

/** Presses Tab until the focused element matches, like a keyboard user would. */
async function tabTo(page: Page, name: RegExp, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? `${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""} ${(el as HTMLInputElement).labels?.[0]?.textContent ?? ""}` : "";
    });
    if (name.test(label)) return;
  }
  throw new Error(`Tab never reached ${name}`);
}

test("the first Tab on a page reaches Skip to content", async ({ page, context }) => {
  await signInAs(context, "learner");
  await page.goto("/home");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText("Skip to content");
});

test("sign-in works from the keyboard", async ({ page, context }) => {
  await signInAs(context, "visitor");
  await page.goto("/sign-in");
  await tabTo(page, /Email/);
  await page.keyboard.type("someone@example.com");
  await page.keyboard.press("Enter");
  // No Supabase in the page tests, so the send fails, but the answer has to reach the person.
  await expect(page.getByText(/Check your email|try again|couldn/i).first()).toBeVisible();
});

test("onboarding works from the keyboard", async ({ page, context }) => {
  await signInAs(context, "newcomer");
  await page.goto("/onboarding");
  await expectAccessible(page);
  await tabTo(page, /Turn on Stars/);
  await page.keyboard.press("Enter");
  await expect(page.locator(":focus")).toHaveAttribute("value", "3");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(":focus")).toHaveAttribute("value", "4");
  await tabTo(page, /Start learning/);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/home");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
});

test("a lesson quiz works from the keyboard", async ({ page, context }) => {
  await signInAs(context, "learner");
  await page.goto(`/lessons/${IDS.lessons[1]}`);
  await tabTo(page, /Gravity/);
  await page.keyboard.press("Space");
  await tabTo(page, /Check answers/);
  await page.keyboard.press("Enter");
  await expect(page.getByText(/1 of 1 right/)).toBeVisible();
  await expect(page.locator(":focus")).toContainText("1 of 1 right");
});
