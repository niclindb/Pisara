import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { Card, Wordmark } from "@/components/ui";
import { afterSignIn, currentUser } from "@/lib/server/auth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await currentUser();
  if (user) redirect(afterSignIn(user, null));
  return (
    <>
      <main
        id="main"
        className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col justify-center px-4 py-12"
      >
        <div className="mb-8 text-center">
          <Wordmark />
        </div>
        <Card>
          <h1 className="mb-5 text-[28px]">Sign in</h1>
          <SignInForm />
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
