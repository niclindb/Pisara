// The CSS color variables must match the checked design tokens.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colors } from "@/lib/a11y/color-pairs";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function vars(section: string): Record<string, string> {
  return Object.fromEntries([...section.matchAll(/--([a-z-]+): (#[0-9A-Fa-f]{6});/g)].map((m) => [m[1]!, m[2]!]));
}

describe("globals.css colors", () => {
  const light = vars(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")));
  const dark = vars(css.slice(css.indexOf("@media (prefers-color-scheme: dark)")));
  for (const mode of ["light", "dark"] as const) {
    it(`match color-pairs.ts in ${mode} mode`, () => {
      const expected = Object.fromEntries(Object.entries(colors[mode]).map(([k, v]) => [kebab(k), v]));
      expect(mode === "light" ? light : dark).toEqual(expected);
    });
  }
});
