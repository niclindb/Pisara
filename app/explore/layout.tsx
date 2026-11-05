import { learnerLinks, TopBar } from "@/components/top-bar";
import { currentUser } from "@/lib/server/auth";

// Explore is open to everyone, so visitors can look before signing up (A3, A9).
export default async function ExploreLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <>
      <TopBar user={user} links={user ? learnerLinks(user) : [{ href: "/explore", label: "Explore" }]} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
