import { LinkButton, Wordmark } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-12 text-center">
      <div>
        <Wordmark />
      </div>
      <h1 className="text-[28px]">This page isn’t here</h1>
      <p>The link may be old, or the page may have moved.</p>
      <div>
        <LinkButton href="/">Go to Pisara</LinkButton>
      </div>
    </main>
  );
}
