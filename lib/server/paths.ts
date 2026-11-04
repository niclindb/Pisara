// Page addresses the server redirects to. The pages themselves come later;
// keep the names here so they change in one place.
export const paths = {
  home: "/home",
  onboarding: "/onboarding",
  signIn: "/sign-in",
  signInExpired: "/sign-in/expired",
  landing: "/",
} as const;

/** Only same-site paths are allowed as "next", so a sign-in link can't send someone elsewhere. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}
