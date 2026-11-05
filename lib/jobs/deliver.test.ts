import { describe, expect, it } from "vitest";
import { runDailyDelivery, type DeliveryDeps } from "./deliver";
import type { DeliveryStore, EmailMessage, Learner, LearnerDay, RecapData } from "./types";

// 11:00 UTC on Tuesday, Nov 10, 2026.
const now = new Date("2026-11-10T11:00:00Z");

const learner = (over: Partial<Learner> = {}): Learner => ({
  id: "u1",
  email: "u1@example.com",
  displayName: null,
  timeZone: "UTC",
  weeklyRecapDay: 0,
  emailsEnabled: true,
  pausedUntil: null,
  lastActiveAt: null,
  waitingRemindersSent: 0,
  waitingReminderSentOn: null,
  ...over,
});

const day = (over: Partial<LearnerDay> = {}): LearnerDay => ({
  deliveredToday: false,
  unreadCount: 0,
  recentPicks: [],
  topics: [
    {
      topicId: "astro",
      name: "Astronomy",
      interest: 3,
      lastDeliveredOn: null,
      hasNextLesson: true,
      nextLesson: { id: "l1", title: "Light-years", readingMinutes: 3 },
    },
  ],
  ...over,
});

const noRecap: RecapData = { lessonsReadThisWeek: 0, dueReview: [], missedThisWeek: [], questionsThisWeek: [] };

function fakes(learners: Learner[], days: Record<string, LearnerDay>, recap: RecapData = noRecap) {
  const deliveries: { userId: string; lessonId: string; localDate: string }[] = [];
  const reminders: Record<string, { sent: number; on: string | null }> = {};
  const recaps: { userId: string; weekStart: string; questionIds: string[] }[] = [];
  const sent: EmailMessage[] = [];
  const store: DeliveryStore = {
    listLearners: async () => learners,
    loadDay: async (l) => {
      const d = days[l.id];
      if (!d) throw new Error("database is down");
      return { ...d, deliveredToday: d.deliveredToday || deliveries.some((x) => x.userId === l.id) };
    },
    recordDelivery: async (d) => {
      if (deliveries.some((x) => x.userId === d.userId && x.localDate === d.localDate)) return false;
      deliveries.push(d);
      return true;
    },
    setWaitingReminders: async (userId, s, on) => {
      reminders[userId] = { sent: s, on };
    },
    loadRecapData: async () => recap,
    saveRecap: async (userId, weekStart, questionIds) => {
      recaps.push({ userId, weekStart, questionIds });
      return true;
    },
  };
  const deps: DeliveryDeps = {
    store,
    mailer: { send: async (m) => void sent.push(m) },
    random: () => 0,
    baseUrl: "https://getpisara.com",
    unsubscribeSecret: "s",
  };
  return { deps, deliveries, reminders, recaps, sent };
}

describe("runDailyDelivery", () => {
  it("delivers a lesson and emails it", async () => {
    const f = fakes([learner()], { u1: day() });
    const summary = await runDailyDelivery(now, f.deps);
    expect(summary.delivered).toBe(1);
    expect(f.deliveries).toEqual([{ userId: "u1", lessonId: "l1", topicId: "astro", localDate: "2026-11-10", deliveredAt: now }]);
    expect(f.sent.map((m) => m.subject)).toEqual(["Light-years (3 min)"]);
  });

  it("uses each learner's own date", async () => {
    const f = fakes([learner({ timeZone: "Pacific/Kiritimati" })], { u1: day() });
    await runDailyDelivery(now, f.deps);
    expect(f.deliveries[0]!.localDate).toBe("2026-11-11");
  });

  it("is safe to run twice", async () => {
    const f = fakes([learner()], { u1: day() });
    await runDailyDelivery(now, f.deps);
    const second = await runDailyDelivery(now, f.deps);
    expect(second.skipped).toBe(1);
    expect(f.deliveries).toHaveLength(1);
    expect(f.sent).toHaveLength(1);
  });

  it("delivers without email when emails are off but the learner is active", async () => {
    const f = fakes([learner({ emailsEnabled: false, lastActiveAt: new Date("2026-11-09T08:00:00Z") })], { u1: day() });
    const summary = await runDailyDelivery(now, f.deps);
    expect(summary.outcomes[0]).toMatchObject({ outcome: "delivered", emailed: false });
    expect(f.sent).toHaveLength(0);
  });

  it("sends the lessons-waiting reminder when the inbox is full", async () => {
    const f = fakes([learner()], { u1: day({ unreadCount: 3 }) });
    const summary = await runDailyDelivery(now, f.deps);
    expect(summary.reminders).toBe(1);
    expect(f.deliveries).toHaveLength(0);
    expect(f.reminders.u1).toEqual({ sent: 1, on: "2026-11-10" });
    expect(f.sent[0]!.subject).toBe("You have 3 lessons waiting");
  });

  it("sends the last \"still here\" note 30 days after the second reminder", async () => {
    const f = fakes([learner({ waitingRemindersSent: 2, waitingReminderSentOn: "2026-10-11" })], { u1: day({ unreadCount: 3 }) });
    await runDailyDelivery(now, f.deps);
    expect(f.reminders.u1).toEqual({ sent: 3, on: "2026-11-10" });
    expect(f.sent[0]!.subject).toBe("Your lessons are still here");
    expect(f.sent[0]!.text).toContain("last reminder");
  });

  it("skips learners with nothing left to pick", async () => {
    const f = fakes([learner()], { u1: day({ topics: [] }) });
    const summary = await runDailyDelivery(now, f.deps);
    expect(summary.outcomes[0]).toEqual({ userId: "u1", outcome: "skipped", reason: "nothing_to_pick" });
    expect(f.sent).toHaveLength(0);
  });

  it("builds the weekly recap on recap day and mentions it in the email", async () => {
    const recap: RecapData = { lessonsReadThisWeek: 3, dueReview: [], missedThisWeek: ["q1"], questionsThisWeek: ["q1", "q2"] };
    // Tuesday is weekday 2.
    const f = fakes([learner({ weeklyRecapDay: 2 })], { u1: day() }, recap);
    const summary = await runDailyDelivery(now, f.deps);
    expect(summary.outcomes[0]).toMatchObject({ outcome: "delivered", recap: true });
    expect(f.recaps).toEqual([{ userId: "u1", weekStart: "2026-11-04", questionIds: ["q1", "q2"] }]);
    expect(f.sent[0]!.text).toContain("weekly recap");
  });

  it("keeps going when one learner fails", async () => {
    const f = fakes([learner({ id: "broken" }), learner({ id: "u1" })], { u1: day() });
    const summary = await runDailyDelivery(now, f.deps);
    expect(summary.failed).toBe(1);
    expect(summary.delivered).toBe(1);
    expect(summary.outcomes[0]).toMatchObject({ userId: "broken", outcome: "failed", error: "database is down" });
  });
});
