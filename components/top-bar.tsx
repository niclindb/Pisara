import Link from "next/link";
import type { CurrentUser } from "@/lib/server/auth";
import { Wordmark } from "./ui";

/** The top bar on signed-in pages. One set of links, no duplicates elsewhere on the page. */
export function TopBar({ user, links }: { user: CurrentUser | null; links: { href: string; label: string }[] }) {
  return (
    <header className="border-b border-hairline bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Wordmark href={user ? "/home" : "/"} />
        <nav aria-label="Main" className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="py-2 font-medium hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        {user && (
          <form action="/auth/sign-out" method="post">
            <button className="py-2 text-text-muted hover:underline">Sign out</button>
          </form>
        )}
      </div>
    </header>
  );
}
