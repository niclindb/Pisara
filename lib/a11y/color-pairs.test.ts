import { describe, expect, it } from "vitest";
import { AA, contrastRatio } from "./contrast";
import { colors, modes, pairs } from "./color-pairs";

describe("design colors meet WCAG 2.2 AA", () => {
  for (const mode of modes) {
    describe(`${mode} mode`, () => {
      it.each(pairs)("$fg on $bg ($where)", ({ fg, bg, use }) => {
        const ratio = contrastRatio(colors[mode][fg], colors[mode][bg]);
        expect(
          ratio,
          `${fg} ${colors[mode][fg]} on ${bg} ${colors[mode][bg]} is ${ratio.toFixed(2)}:1, needs ${AA[use]}:1 for ${use}`,
        ).toBeGreaterThanOrEqual(AA[use]);
      });
    });
  }
});
