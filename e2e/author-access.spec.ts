// Who can open the author pages (design 10): signed-out visitors are sent to
// sign in and come back afterwards; signed-in learners get the not-found page.

import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";
import { IDS } from "./seed";

for (const path of ["/author", `/author/topics/${IDS.stars}`]) {
  test(`signed out, ${path === "/author" ? path : "/author/topics/[id]"} goes to sign in`, async ({ page, context }) => {
    await signInAs(context, "visitor");
    await page.goto(path);
    await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent(path)}`);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
}

test("a learner gets the not-found page on /author", async ({ page, context }) => {
  await signInAs(context, "learner");
  const response = await page.goto("/author");
  expect(response?.status()).toBe(404);
});
