import { describe, expect, it } from "vitest";
import { isValidLevel, levelName, MAX_LEVEL } from "./levels";

describe("levels", () => {
  it("has three, named in words", () => {
    expect(MAX_LEVEL).toBe(3);
    expect([1, 2, 3].map(levelName)).toEqual(["Beginner", "Intermediate", "Advanced"]);
  });
  it("rejects anything else", () => {
    for (const n of [0, 4, 1.5, -1]) expect(isValidLevel(n)).toBe(false);
    expect(() => levelName(4)).toThrow();
  });
});
