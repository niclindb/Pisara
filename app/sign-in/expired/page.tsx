import type { Metadata } from "next";
import { Card, Wordmark } from "@/components/ui";
import { SignInForm } from "../sign-in-form";

export const metadata: Metadata = { title: "Sign-in link expired" };

export default function ExpiredPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <Wordmark />
      </div>
      <Card>
        <h1 className="mb-3 text-[28px]">That link has expired</h1>
        <p className="mb-5">Sign-in links work once, for 15 minutes. Get a new one here.</p>
        <SignInForm />
      </Card>
    </main>
  );
}
