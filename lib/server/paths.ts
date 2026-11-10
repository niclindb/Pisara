// Page addresses the server redirects to. The pages themselves come later;
// keep the names here so they change in one place.
export const paths = {
  home: "/home",
  onboarding: "/onboarding",
  signIn: "/sign-in",
  signInExpired: "/sign-in/expired",
  landing: "/",
  author: "/author",
} as const;

/** Only same-site paths are allowed as "next", so a sign-in link can't send someone elsewhere. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}

/** The sign-in page, set to come back to `next` afterwards. */
export function signInFor(next: string | null | undefined): string {
  const back = safeNext(next);
  return back ? `${paths.signIn}?next=${encodeURIComponent(back)}` : paths.signIn;
}

/** Request header the proxy sets to the path (and query) the visitor asked for. */
export const REQUESTED_PATH_HEADER = "x-pisara-path";

/**
 * Cookie that remembers where to go after the sign-in link is opened. The email
 * link itself doesn't carry it, so this works when the link is opened in the
 * same browser; elsewhere you land on the usual page.
 */
export const NEXT_COOKIE = "pisara-next";
