import { describe, expect, it } from "vitest";
import { dailyAction, nextLesson, remindersAfterRead, type LearnerState } from "./delivery";

const today = "2026-11-10";
const base: LearnerState = {
  emailsEnabled: true,
  lastActiveOn: "2026-11-09",
  pausedUntil: null,
  deliveredToday: false,
  unreadCount: 0,
  waitingRemindersSent: 0,
  waitingReminderSentOn: null,
};

describe("dailyAction", () => {
  it("delivers when there's room in the inbox", () => {
    expect(dailyAction({ ...base, unreadCount: 2 }, today)).toEqual({ kind: "deliver" });
  });

  it("skips if today's lesson was already delivered (safe to run twice)", () => {
    expect(dailyAction({ ...base, deliveredToday: true }, today)).toEqual({ kind: "skip", reason: "already_delivered" });
  });

  it("skips while paused, through the last pause day", () => {
    expect(dailyAction({ ...base, pausedUntil: "2026-11-10" }, today).kind).toBe("skip");
    expect(dailyAction({ ...base, pausedUntil: "2026-11-09" }, today).kind).toBe("deliver");
  });

  it("keeps delivering with emails off for 14 days after the last visit", () => {
    const off = { ...base, emailsEnabled: false };
    expect(dailyAction({ ...off, lastActiveOn: "2026-10-27" }, today).kind).toBe("deliver"); // 14 days
    expect(dailyAction({ ...off, lastActiveOn: "2026-10-26" }, today)).toEqual({ kind: "skip", reason: "inactive" });
    expect(dailyAction({ ...off, lastActiveOn: null }, today).kind).toBe("skip");
  });

  describe("full inbox", () => {
    const full = { ...base, unreadCount: 3 };

    it("sends the first reminder on the first full day", () => {
      expect(dailyAction(full, today)).toEqual({ kind: "waiting_reminder", remindersSent: 1 });
    });

    it("stays quiet for the next 6 days", () => {
      const s = { ...full, waitingRemindersSent: 1, waitingReminderSentOn: "2026-11-04" };
      expect(dailyAction(s, today)).toEqual({ kind: "skip", reason: "inbox_full_quiet" });
    });

    it("sends the second reminder a week later", () => {
      const s = { ...full, waitingRemindersSent: 1, waitingReminderSentOn: "2026-11-03" };
      expect(dailyAction(s, today)).toEqual({ kind: "waiting_reminder", remindersSent: 2 });
    });

    it("stays quiet for 29 days after the second", () => {
      const s = { ...full, waitingRemindersSent: 2, waitingReminderSentOn: "2026-10-12" };
      expect(dailyAction(s, today)).toEqual({ kind: "skip", reason: "inbox_full_quiet" });
    });

    it("sends a last note 30 days after the second", () => {
      const s = { ...full, waitingRemindersSent: 2, waitingReminderSentOn: "2026-10-11" };
      expect(dailyAction(s, today)).toEqual({ kind: "waiting_reminder", remindersSent: 3 });
    });

    it("never sends a fourth", () => {
      const s = { ...full, waitingRemindersSent: 3, waitingReminderSentOn: "2026-01-01" };
      expect(dailyAction(s, today)).toEqual({ kind: "skip", reason: "inbox_full_quiet" });
    });

    it("starts over after a lesson is read", () => {
      const quiet = { ...full, waitingRemindersSent: 2, waitingReminderSentOn: "2026-11-01" };
      const s = { ...quiet, ...remindersAfterRead() };
      expect(dailyAction(s, today)).toEqual({ kind: "waiting_reminder", remindersSent: 1 });
    });
  });
});

describe("nextLesson", () => {
  const lessons = [
    { id: "l3", position: 30, level: 2 },
    { id: "l1", position: 10, level: 1 },
    { id: "l2", position: 20, level: 1 },
  ];

  it("returns the lowest-position lesson not yet delivered", () => {
    expect(nextLesson(lessons, new Set())?.id).toBe("l1");
    expect(nextLesson(lessons, new Set(["l1"]))?.id).toBe("l2");
  });

  it("picks up a lesson inserted earlier in the path", () => {
    const withInsert = [...lessons, { id: "l1b", position: 15, level: 1 }];
    expect(nextLesson(withInsert, new Set(["l1", "l2"]))?.id).toBe("l1b");
  });

  it("returns null when the path is done", () => {
    expect(nextLesson(lessons, new Set(["l1", "l2", "l3"]))).toBeNull();
  });
});
