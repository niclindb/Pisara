import Link from "next/link";
import type { CurrentUser } from "@/lib/server/auth";
import { Wordmark } from "./ui";

/**
 * The top bar on signed-in pages. One set of links, no duplicates elsewhere on
 * the page. On a phone the links fold into a Menu that works without JavaScript.
 */
export function TopBar({ user, links }: { user: CurrentUser | null; links: { href: string; label: string }[] }) {
  const signOut = user && (
    <form action="/auth/sign-out" method="post">
      <button className="py-2 text-text-muted hover:underline">Sign out</button>
    </form>
  );
  return (
    <header className="relative border-b border-hairline bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-x-6 px-4 py-3 sm:px-6">
        <Wordmark href={user ? "/home" : "/"} />
        <nav aria-label="Main" className="hidden flex-1 flex-wrap items-center gap-x-5 gap-y-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="py-2 font-medium hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">{signOut}</div>
        <details className="group ml-auto md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-control border border-border px-4 font-medium [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <div className="absolute inset-x-0 z-20 mt-3 border-b border-hairline bg-surface px-4 pb-4 shadow-[0_8px_24px_-12px_rgb(11_37_69/0.25)]">
            <nav aria-label="Main">
              <ul>
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="block border-b border-hairline py-3 font-medium">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="pt-2">{signOut}</div>
          </div>
        </details>
      </div>
    </header>
  );
}
