import AxeBuilder from "@axe-core/playwright";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { IDS } from "./seed";

export type Persona = "visitor" | "learner" | "newcomer" | "author";

/** Signs in as a seeded user through the development-only cookie. */
export async function signInAs(context: BrowserContext, who: Persona) {
  await context.clearCookies();
  if (who === "visitor") return;
  await context.addCookies([{ name: "pisara-dev-user", value: IDS[who], url: "http://localhost:3200" }]);
}

/** No WCAG 2.2 AA problems axe can find, and nothing scrolls sideways. */
export async function expectAccessible(page: Page) {
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    // The Next.js dev tools button only exists in development.
    .exclude("nextjs-portal")
    .analyze();
  const found = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
  expect(found, `axe problems on ${page.url()}`).toEqual([]);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(sideways, `${page.url()} scrolls sideways`).toBe(false);
}
