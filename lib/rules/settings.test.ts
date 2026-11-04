import { describe, expect, it } from "vitest";
import { settingsProblems } from "./settings";

describe("settingsProblems", () => {
  const today = "2026-11-04";
  it("accepts a normal change", () => {
    expect(settingsProblems({ displayName: "Nick", timeZone: "Europe/Helsinki", weeklyRecapDay: 1, pausedUntil: today }, today)).toEqual([]);
    expect(settingsProblems({ pausedUntil: null, emailsEnabled: false }, today)).toEqual([]);
  });

  it("explains what's wrong", () => {
    expect(settingsProblems({ timeZone: "Nowhere", weeklyRecapDay: -1, pausedUntil: "2026-11-03" }, today)).toEqual([
      "Pick your time zone.",
      "Pick a day for your weekly recap.",
      "Pick a day from today on.",
    ]);
    expect(settingsProblems({ pausedUntil: "2027-12-01" }, today)).toEqual(["Pause for up to a year (until 2027-11-04)."]);
    expect(settingsProblems({ pausedUntil: "soon" as never }, today)).toEqual(["Pick a day from today on."]);
  });
});
