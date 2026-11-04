import { describe, expect, it } from "vitest";
import { checkMilestones, isLongMemory, milestoneMessage, type MilestoneInput } from "./milestones";

const base: MilestoneInput = {
  lessonsRead: 0,
  levelUps: [],
  topicsFinished: [],
  longMemoryQuestionIds: [],
  earned: new Set(),
  shownToday: false,
};

describe("checkMilestones", () => {
  it("celebrates the first lesson", () => {
    expect(checkMilestones({ ...base, lessonsRead: 1 })).toEqual({ newlyEarned: ["lessons_1"], show: "lessons_1" });
  });

  it("celebrates 10, 25, 50, 100, then every 100", () => {
    const earned = new Set(["lessons_1", "lessons_10", "lessons_25", "lessons_50", "lessons_100"]);
    expect(checkMilestones({ ...base, lessonsRead: 200, earned }).newlyEarned).toEqual(["lessons_200"]);
    expect(checkMilestones({ ...base, lessonsRead: 150, earned }).newlyEarned).toEqual([]);
  });

  it("earns each milestone once", () => {
    expect(checkMilestones({ ...base, lessonsRead: 10, earned: new Set(["lessons_1", "lessons_10"]) }).newlyEarned).toEqual([]);
  });

  it("celebrates new levels above 1, finished topics and long memories", () => {
    const r = checkMilestones({
      ...base,
      lessonsRead: 5,
      earned: new Set(["lessons_1"]),
      levelUps: [{ topicId: "astro", level: 1 }, { topicId: "rome", level: 2 }],
      topicsFinished: ["astro"],
      longMemoryQuestionIds: ["q9"],
    });
    expect(r.newlyEarned).toEqual(["level_up:rome:2", "topic_goal:astro", "long_memory:q9"]);
  });

  it("shows only the biggest one", () => {
    const r = checkMilestones({
      ...base,
      lessonsRead: 10,
      earned: new Set(["lessons_1"]),
      levelUps: [{ topicId: "rome", level: 3 }],
      topicsFinished: ["rome"],
    });
    expect(r.show).toBe("topic_goal:rome");
    expect(r.newlyEarned).toContain("lessons_10");
  });

  it("shows none if one was already shown today, but still records them", () => {
    const r = checkMilestones({ ...base, lessonsRead: 1, shownToday: true });
    expect(r).toEqual({ newlyEarned: ["lessons_1"], show: null });
  });
});

describe("isLongMemory", () => {
  it("counts a right answer at the 21-day step or later", () => {
    expect(isLongMemory(2)).toBe(false);
    expect(isLongMemory(3)).toBe(true);
  });
});

describe("milestoneMessage", () => {
  const names = (id: string) => ({ t1: "Stars" })[id];
  it("says each kind in plain words", () => {
    expect(milestoneMessage("lessons_1", names)).toBe("You read your first lesson.");
    expect(milestoneMessage("lessons_25", names)).toBe("You've read 25 lessons.");
    expect(milestoneMessage("level_up:t1:2", names)).toBe("You reached level 2 in Stars.");
    expect(milestoneMessage("topic_goal:t1", names)).toBe("You finished Stars.");
    expect(milestoneMessage("long_memory:q1", names)).toBe("You remembered that one after three weeks or more.");
  });
  it("never mentions days in a row", () => {
    for (const k of ["lessons_1", "lessons_100", "level_up:t1:3", "topic_goal:t1", "long_memory:q"]) {
      expect(milestoneMessage(k, names)).not.toMatch(/in a row|streak|missed/i);
    }
  });
});
