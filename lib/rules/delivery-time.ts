// When the daily run goes out: 8am Eastern, all year. Vercel Cron only speaks
// UTC, so it calls the job at both 12:00 and 13:00 UTC, and only the call that
// lands in the 8am hour in New York (12:00 in summer, 13:00 in winter) runs.

import { DELIVERY_HOUR, DELIVERY_TIME_ZONE } from "./constants";

export function hourIn(now: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(hour);
}

export function isDeliveryHour(now: Date): boolean {
  return hourIn(now, DELIVERY_TIME_ZONE) === DELIVERY_HOUR;
}
