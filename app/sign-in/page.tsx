import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Wordmark } from "@/components/ui";
import { afterSignIn, currentUser } from "@/lib/server/auth";
import { safeNext } from "@/lib/server/paths";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next: raw } = await searchParams;
  const next = safeNext(typeof raw === "string" ? raw : null);
  const user = await currentUser();
  if (user) redirect(afterSignIn(user, next));
  return (
    <>
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12"
      >
        <div className="mb-8 text-center">
          <Wordmark />
        </div>
        <Card>
          <h1 className="mb-5 text-[28px]">Sign in</h1>
          <SignInForm next={next} />
        </Card>
      </main>
    </>
  );
}
