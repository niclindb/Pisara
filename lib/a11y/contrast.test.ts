import { describe, expect, it } from "vitest";
import { contrastRatio, meetsAA, parseHex, relativeLuminance } from "./contrast";

describe("contrast math", () => {
  it("parses short and long hex", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("1D4ED8")).toEqual([29, 78, 216]);
    expect(() => parseHex("blue")).toThrow();
  });

  it("matches the WCAG reference values", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBe(1);
    expect(contrastRatio("#000", "#fff")).toBe(21);
    expect(contrastRatio("#fff", "#fff")).toBe(1);
    // Known values (WebAIM contrast checker)
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("doesn't care about order", () => {
    expect(contrastRatio("#1d4ed8", "#fff")).toBe(contrastRatio("#fff", "#1d4ed8"));
  });

  it("applies the AA thresholds without rounding up", () => {
    expect(meetsAA("#767676", "#fff", "text")).toBe(true);
    expect(meetsAA("#777777", "#fff", "text")).toBe(false); // 4.48 is not 4.5
    expect(meetsAA("#777777", "#fff", "largeText")).toBe(true);
    expect(meetsAA("#949494", "#fff", "ui")).toBe(true); // ~3.03
    expect(meetsAA("#959595", "#fff", "ui")).toBe(false); // ~2.99
  });
});
