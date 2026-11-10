import { currentUser } from "@/lib/server/auth";
import { learnerLinks, TopBar } from "./top-bar";

/** Pages anyone can open (Explore, privacy, terms): the learner's links when signed in. */
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <>
      <TopBar user={user} links={user ? learnerLinks(user) : [{ href: "/explore", label: "Explore" }]} />
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
