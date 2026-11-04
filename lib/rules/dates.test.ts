import { describe, expect, it } from "vitest";
import { addDays, daysBetween, localDate, weekday } from "./dates";

describe("localDate", () => {
  // The daily run is at 11:00 UTC.
  const run = new Date("2026-11-03T11:00:00Z");

  it("gives each learner their own calendar date", () => {
    expect(localDate(run, "UTC")).toBe("2026-11-03");
    expect(localDate(run, "America/Los_Angeles")).toBe("2026-11-03"); // 3am
    expect(localDate(run, "Europe/Helsinki")).toBe("2026-11-03"); // 1pm
  });

  it("is already tomorrow far east of UTC", () => {
    expect(localDate(run, "Pacific/Kiritimati")).toBe("2026-11-04"); // UTC+14, 1am
  });

  it("handles half-hour offsets", () => {
    expect(localDate(new Date("2026-11-03T18:45:00Z"), "Asia/Kolkata")).toBe("2026-11-04"); // 00:15
  });

  it("handles daylight saving changes", () => {
    // US clocks fall back on Nov 1, 2026; the 11:00 UTC run moves from 7am to 6am in New York.
    expect(localDate(new Date("2026-10-31T11:00:00Z"), "America/New_York")).toBe("2026-10-31");
    expect(localDate(new Date("2026-11-01T11:00:00Z"), "America/New_York")).toBe("2026-11-01");
  });
});

describe("date math", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-11-01", "2026-11-03")).toBe(2);
    expect(daysBetween("2026-11-03", "2026-11-01")).toBe(-2);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2); // across US DST start
  });

  it("knows the weekday", () => {
    expect(weekday("2026-11-01")).toBe(0); // Sunday
    expect(weekday("2026-11-03")).toBe(2); // Tuesday
  });

  it("rejects malformed dates", () => {
    expect(() => addDays("11/03/2026", 1)).toThrow();
  });
});
