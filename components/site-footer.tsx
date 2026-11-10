import Link from "next/link";

/** The footer on every page; the root layout renders it once. */
export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-[15px] text-text-muted sm:px-6">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/explore" className="py-1 hover:underline hover:text-accent">
            Browse topics
          </Link>
          <Link href="/privacy" className="py-1 hover:underline hover:text-accent">
            Privacy
          </Link>
          <Link href="/terms" className="py-1 hover:underline hover:text-accent">
            Terms
          </Link>
        </nav>
        <p className="py-1">
          © {new Date().getFullYear()}{" "}
          <a href="https://niclindb.github.io" className="hover:underline hover:text-accent">
            Lindberg Dev
          </a>
        </p>
      </div>
    </footer>
  );
}
