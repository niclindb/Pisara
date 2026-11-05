import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { Card, Field, Wordmark } from "@/components/ui";
import { openEmailPreferences } from "@/lib/jobs/settings";
import { addDays } from "@/lib/rules/dates";
import { MAX_PAUSE_DAYS } from "@/lib/rules/settings";
import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { emailsOnAction, pauseFromEmailAction } from "../actions";

export const metadata: Metadata = { title: "Email settings", robots: { index: false } };

// Email preferences (B3, D6), opened from any email without signing in.
// Opening it turns emails off right away; Undo turns them back on.
export default async function EmailPreferencesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const prefs = await openEmailPreferences(db(), decodeURIComponent(token), env.unsubscribeSecret(), new Date());
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <Wordmark />
      </div>
      <Card>
        {!prefs ? (
          <>
            <h1 className="mb-3 text-[28px]">This link doesn&rsquo;t work</h1>
            <p>Use the Email settings link in your latest Pisara email, or sign in and open Settings.</p>
          </>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="mb-2 text-[28px]">Emails are off</h1>
              <p>
                We won&rsquo;t email <span className="font-medium">{prefs.email}</span> any more. Lessons still wait on Home when you
                sign in.
              </p>
            </div>
            <ActionForm action={emailsOnAction.bind(null, token)} submit="Undo, keep emailing me" variant="secondary" />
            <div className="border-t border-hairline pt-6">
              <h2 className="mb-2 text-[22px]">Or take a break</h2>
              <p className="mb-4 text-text-muted">Pause lessons and emails until a date, then they start again.</p>
              <ActionForm action={pauseFromEmailAction.bind(null, token)} submit="Pause" variant="secondary" className="space-y-4">
                <Field label="Last day with no lessons">
                  {(p) => (
                    <input {...p} type="date" name="pausedUntil" min={prefs.today} max={addDays(prefs.today, MAX_PAUSE_DAYS)} required />
                  )}
                </Field>
              </ActionForm>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
