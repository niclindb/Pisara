import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, Card, Wordmark } from "@/components/ui";
import { readLessonLinkToken } from "@/lib/email/lesson-link";
import { currentUser } from "@/lib/server/auth";
import { env } from "@/lib/server/env";
import { signInFor } from "@/lib/server/paths";
import { openLessonFromEmailAction } from "./actions";
import { AutoSubmitForm } from "./auto-submit";

export const metadata: Metadata = { title: "Opening your lesson", robots: { index: false } };

// The "Begin lesson" link in the daily email (lesson-link.ts). Already signed in
// as that learner: straight to the lesson. Otherwise the page signs in with a
// form that submits itself, so mail scanners that open every link don't sign in
// or mark the lesson read. An expired or broken link asks for a sign-in email.
export default async function LessonLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const token = decodeURIComponent((await params).token);
  const link = readLessonLinkToken(token, env.unsubscribeSecret(), new Date());
  if (!link.ok) redirect(signInFor(link.lessonId ? `/lessons/${link.lessonId}` : null));
  const user = await currentUser();
  if (user?.id === link.userId) redirect(`/lessons/${link.lessonId}`);
  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <Wordmark />
      </div>
      <Card>
        <h1 className="mb-3 text-[28px]">Opening your lesson</h1>
        <p className="mb-5">Signing you in. If nothing happens, press the button.</p>
        <AutoSubmitForm action={openLessonFromEmailAction.bind(null, token)}>
          <Button type="submit">Open lesson</Button>
        </AutoSubmitForm>
      </Card>
    </main>
  );
}
