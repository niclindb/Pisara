import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { Card, Field, PageTitle } from "@/components/ui";
import { loadSettings } from "@/lib/jobs/settings";
import { addDays, formatDate } from "@/lib/rules/dates";
import { DISPLAY_NAME_MAX } from "@/lib/rules/onboarding";
import { MAX_PAUSE_DAYS } from "@/lib/rules/settings";
import { db } from "@/lib/server/db";
import { deleteAccountAction, pauseAction, resumeAction, saveSettingsAction } from "../actions";
import { requireLearner } from "../guard";

export const metadata: Metadata = { title: "Settings" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Settings (A5, A10, B3, D6, D9).
export default async function SettingsPage() {
  const user = await requireLearner();
  const s = await loadSettings(db(), user.id, new Date());
  if (!s) return null;
  const zones = Intl.supportedValuesOf("timeZone");
  if (!zones.includes(s.timeZone)) zones.unshift(s.timeZone);
  const year = Number(s.today.slice(0, 4));
  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle>Settings</PageTitle>

      <Card aria-labelledby="you-heading">
        <h2 id="you-heading" className="mb-4 text-[22px]">
          You and your lessons
        </h2>
        <ActionForm action={saveSettingsAction} submit="Save settings" className="space-y-5">
          <p>
            <span className="font-medium">Email</span>
            <span className="block text-text-muted">{s.email}</span>
          </p>
          <Field label="Your name (optional)" hint="Only used to greet you. Nobody else sees it.">
            {(p) => <input {...p} name="displayName" autoComplete="given-name" maxLength={DISPLAY_NAME_MAX} defaultValue={s.displayName ?? ""} />}
          </Field>
          <Field label="Time zone" hint="Lessons arrive at 8am Eastern. Your time zone decides what counts as today.">
            {(p) => (
              <select {...p} name="timeZone" defaultValue={s.timeZone}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Weekly recap day" hint="A few questions on the week's lessons, on Home.">
            {(p) => (
              <select {...p} name="weeklyRecapDay" defaultValue={String(s.weeklyRecapDay)}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" name="emailsEnabled" defaultChecked={s.emailsEnabled} className="h-5 w-5" />
            <span>
              <span className="font-medium">Email me each lesson</span>
              <span className="block text-[15px] text-text-muted">With emails off, lessons still wait on Home.</span>
            </span>
          </label>
        </ActionForm>
      </Card>

      <Card aria-labelledby="pause-heading">
        <h2 id="pause-heading" className="mb-2 text-[22px]">
          Pause lessons
        </h2>
        {s.pausedUntil ? (
          <>
            <p className="mb-4">
              Paused. Lessons start again on {formatDate(addDays(s.pausedUntil, 1), year)}.
            </p>
            <ActionForm action={resumeAction} submit="Resume now" variant="secondary" />
          </>
        ) : (
          <>
            <p className="mb-4 text-text-muted">Going away? No lessons arrive while paused, and your progress stays.</p>
            <ActionForm action={pauseAction} submit="Pause" variant="secondary" className="space-y-4">
              <Field label="Last day with no lessons">
                {(p) => <input {...p} type="date" name="pausedUntil" min={s.today} max={addDays(s.today, MAX_PAUSE_DAYS)} required />}
              </Field>
            </ActionForm>
          </>
        )}
      </Card>

      <Card aria-labelledby="account-heading">
        <h2 id="account-heading" className="mb-4 text-[22px]">
          Account
        </h2>
        <form action="/auth/sign-out" method="post" className="mb-6">
          <button className="font-medium text-primary underline underline-offset-4 hover:no-underline">Sign out</button>
        </form>
        <p className="mb-3 text-text-muted">Deleting your account removes your topics, lessons, answers and progress for good.</p>
        <ActionForm
          action={deleteAccountAction}
          submit="Delete my account"
          pendingLabel="Deleting…"
          variant="danger"
          confirm="Delete your account and everything in it? This can't be undone."
        />
      </Card>
    </div>
  );
}
