import { describe, expect, it } from "vitest";
import { cleanDisplayName, isValidTimeZone, onboardingProblems } from "./onboarding";

const pickable = new Set(["stars", "rome"]);

describe("onboardingProblems", () => {
  it("accepts one topic on and a real time zone", () => {
    expect(onboardingProblems({ topics: [{ topicId: "stars", interest: 3 }], timeZone: "Europe/Helsinki" }, pickable)).toEqual([]);
  });

  it("needs at least one topic turned on", () => {
    expect(onboardingProblems({ topics: [{ topicId: "stars", interest: 0 }], timeZone: "UTC" }, pickable)).toEqual([
      "Turn on at least one topic.",
    ]);
  });

  it("explains every other problem", () => {
    expect(
      onboardingProblems(
        {
          topics: [
            { topicId: "stars", interest: 6 },
            { topicId: "stars", interest: 2 },
            { topicId: "hidden", interest: 1 },
          ],
          timeZone: "Mars/Olympus",
          weeklyRecapDay: 7,
          displayName: "x".repeat(51),
        },
        pickable,
      ),
    ).toEqual([
      "A topic is listed twice.",
      "Interest goes from Off to 5.",
      "That topic isn't available yet.",
      "Pick your time zone.",
      "Pick a day for your weekly recap.",
      "Keep your name to 50 characters.",
    ]);
  });
});

describe("helpers", () => {
  it("checks time zones and tidies names", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("")).toBe(false);
    expect(cleanDisplayName("  Nick   L ")).toBe("Nick L");
    expect(cleanDisplayName("   ")).toBeNull();
  });
});
