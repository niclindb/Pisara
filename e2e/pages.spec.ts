// axe on every page, for each kind of visitor, in light mode on a desktop and in
// dark mode on a phone (design 10).

import { test } from "@playwright/test";
import { emailSettingsToken } from "../lib/email/unsubscribe";
import { expectAccessible, signInAs, type Persona } from "./helpers";
import { IDS } from "./seed";

const [lesson1, lesson2] = IDS.lessons;
const pages: Record<Exclude<Persona, "newcomer">, string[]> = {
  visitor: [
    "/",
    "/sign-in",
    "/sign-in/expired",
    "/explore",
    `/explore/${IDS.stars}`,
    `/explore/${IDS.stars}/preview`,
    "/privacy",
    "/terms",
    "/no-such-page",
    `/email/${emailSettingsToken(IDS.learner, process.env.UNSUBSCRIBE_SECRET!)}`,
  ],
  learner: [
    "/home",
    "/topics",
    "/explore",
    `/explore/${IDS.stars}`,
    `/lessons/${lesson1}`,
    "/history",
    "/progress",
    "/settings",
    `/recap/${IDS.recap}`,
  ],
  author: ["/author", `/author/topics/${IDS.stars}`, `/author/lessons/${lesson2}`, `/author/lessons/${lesson2}/preview`],
};

/** Readable test names: ids become what they stand for. */
const names = new Map<string, string>([
  [IDS.stars, "stars"],
  [IDS.recap, "recap"],
  ...IDS.lessons.map((id, i) => [id, `lesson-${i + 1}`] as [string, string]),
]);
const title = (url: string) => {
  let t = url.startsWith("/email/") ? "/email/[token]" : url;
  for (const [id, name] of names) t = t.replaceAll(id, name);
  return t;
};

const looks = [
  { name: "light, desktop", colorScheme: "light" as const, viewport: { width: 1280, height: 900 } },
  { name: "dark, phone", colorScheme: "dark" as const, viewport: { width: 390, height: 844 } },
];

for (const [who, urls] of Object.entries(pages) as [Persona, string[]][]) {
  for (const look of looks) {
    test.describe(`${who}, ${look.name}`, () => {
      test.use({ colorScheme: look.colorScheme, viewport: look.viewport });
      for (const url of urls) {
        test(title(url), async ({ page, context }) => {
          await signInAs(context, who);
          await page.goto(url);
          await expectAccessible(page);
        });
      }
    });
  }
}
