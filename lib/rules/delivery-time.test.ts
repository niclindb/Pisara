import { describe, expect, it } from "vitest";
import { isDeliveryHour } from "./delivery-time";

describe("isDeliveryHour", () => {
  it("is 13:00 UTC in winter and 12:00 UTC in summer (8am in New York)", () => {
    expect(isDeliveryHour(new Date("2026-11-10T13:00:00Z"))).toBe(true);
    expect(isDeliveryHour(new Date("2026-11-10T12:00:00Z"))).toBe(false);
    expect(isDeliveryHour(new Date("2026-07-10T12:00:00Z"))).toBe(true);
    expect(isDeliveryHour(new Date("2026-07-10T13:00:00Z"))).toBe(false);
  });

  it("covers the whole hour, since Vercel's free plan can fire late in the hour", () => {
    expect(isDeliveryHour(new Date("2026-11-10T13:59:00Z"))).toBe(true);
    expect(isDeliveryHour(new Date("2026-11-10T14:00:00Z"))).toBe(false);
  });

  it("switches with daylight saving time", () => {
    // US clocks fall back on Nov 1, 2026.
    expect(isDeliveryHour(new Date("2026-10-31T12:00:00Z"))).toBe(true);
    expect(isDeliveryHour(new Date("2026-11-01T13:00:00Z"))).toBe(true);
  });
});
