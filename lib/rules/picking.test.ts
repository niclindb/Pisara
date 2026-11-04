import { describe, expect, it } from "vitest";
import { freshness, pickTopic, type TopicCandidate } from "./picking";

const today = "2026-11-10";
const topic = (topicId: string, interest: number, lastDeliveredOn: string | null = null, hasNextLesson = true): TopicCandidate => ({
  topicId,
  interest,
  lastDeliveredOn,
  hasNextLesson,
});
const fixed = (r: number) => () => r;

describe("freshness", () => {
  it("grows 10% a day and stops at 2x", () => {
    expect(freshness("2026-11-10", today)).toBe(1);
    expect(freshness("2026-11-05", today)).toBeCloseTo(1.5);
    expect(freshness("2026-10-01", today)).toBe(2);
  });

  it("treats a topic that never came up as fully fresh", () => {
    expect(freshness(null, today)).toBe(2);
  });
});

describe("pickTopic", () => {
  it("weights by interest times freshness", () => {
    const { odds } = pickTopic({
      candidates: [topic("a", 5, "2026-11-10"), topic("b", 1, null)],
      today,
      recentPicks: [],
      random: fixed(0),
    });
    // a: 5 × 1.0 = 5, b: 1 × 2.0 = 2
    expect(odds.map((o) => o.score)).toEqual([5, 2]);
    expect(odds[0]!.chance).toBeCloseTo(5 / 7);
    expect(odds[1]!.chance).toBeCloseTo(2 / 7);
  });

  it("uses the random number to choose", () => {
    const candidates = [topic("a", 1, today), topic("b", 1, today)];
    expect(pickTopic({ candidates, today, recentPicks: [], random: fixed(0.1) }).topicId).toBe("a");
    expect(pickTopic({ candidates, today, recentPicks: [], random: fixed(0.9) }).topicId).toBe("b");
  });

  it("matches the odds over many picks", () => {
    let seed = 42;
    const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const candidates = [topic("a", 4, today), topic("b", 1, today)];
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 10_000; i++) {
      const id = pickTopic({ candidates, today, recentPicks: [], random }).topicId as "a" | "b";
      counts[id]++;
    }
    expect(counts.a / 10_000).toBeGreaterThan(0.77);
    expect(counts.a / 10_000).toBeLessThan(0.83);
  });

  it("never picks topics that are off or have no lessons left", () => {
    const { topicId, odds } = pickTopic({
      candidates: [topic("off", 0), topic("done", 5, null, false), topic("ok", 1)],
      today,
      recentPicks: [],
      random: fixed(0),
    });
    expect(topicId).toBe("ok");
    expect(odds.find((o) => o.topicId === "off")!.excluded).toBe("off");
    expect(odds.find((o) => o.topicId === "done")!.excluded).toBe("no_lessons");
  });

  it("returns null when nothing can be picked", () => {
    expect(pickTopic({ candidates: [topic("off", 0)], today, recentPicks: [], random: fixed(0) }).topicId).toBeNull();
    expect(pickTopic({ candidates: [], today, recentPicks: [], random: fixed(0) }).topicId).toBeNull();
  });

  it("doesn't pick the same topic a third day in a row", () => {
    const recentPicks = [
      { date: "2026-11-09", topicId: "a" },
      { date: "2026-11-08", topicId: "a" },
    ];
    const result = pickTopic({ candidates: [topic("a", 5), topic("b", 1)], today, recentPicks, random: fixed(0) });
    expect(result.topicId).toBe("b");
    expect(result.odds.find((o) => o.topicId === "a")!.excluded).toBe("streak");
  });

  it("allows a third day when it's the only topic left", () => {
    const recentPicks = [
      { date: "2026-11-09", topicId: "a" },
      { date: "2026-11-08", topicId: "a" },
    ];
    expect(pickTopic({ candidates: [topic("a", 5), topic("b", 0)], today, recentPicks, random: fixed(0) }).topicId).toBe("a");
  });

  it("only counts consecutive days for the streak", () => {
    const recentPicks = [
      { date: "2026-11-09", topicId: "a" },
      { date: "2026-11-07", topicId: "a" }, // a gap on the 8th
    ];
    expect(pickTopic({ candidates: [topic("a", 5), topic("b", 1)], today, recentPicks, random: fixed(0) }).topicId).toBe("a");
  });
});
