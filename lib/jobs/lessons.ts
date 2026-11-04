// Opening a lesson marks it read (decided Nov 4, 2026: no "Done reading"
// button). That clears it from the inbox and resets the "lessons waiting"
// reminders (B6). Learners can only open lessons delivered to them, or a
// topic's free preview; the database access rules enforce the same thing.

import type { Sql } from "./postgres-store";

export type OpenResult = "opened" | "already_read" | "not_delivered";

export async function markLessonOpened(sql: Sql, userId: string, lessonId: string, now: Date): Promise<OpenResult> {
  return sql.begin(async (tx) => {
    const [delivery] = await tx`
      select id, read_at from public.deliveries
      where user_id = ${userId} and lesson_id = ${lessonId}
      for update`;
    await tx`update public.profiles set last_active_at = ${now} where id = ${userId}`;
    if (!delivery) return "not_delivered";
    if (delivery.read_at) return "already_read";
    await tx`update public.deliveries set read_at = ${now} where id = ${delivery.id}`;
    await tx`
      update public.profiles set waiting_reminders_sent = 0, waiting_reminder_sent_on = null
      where id = ${userId}`;
    return "opened";
  });
}
