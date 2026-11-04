import { TopBar } from "@/components/top-bar";
import { requireLearner } from "./guard";

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLearner();
  const links = [
    { href: "/home", label: "Home" },
    { href: "/topics", label: "My topics" },
    { href: "/explore", label: "Explore" },
    { href: "/progress", label: "Progress" },
    { href: "/history", label: "History" },
    { href: "/settings", label: "Settings" },
  ];
  if (user.role === "author") links.push({ href: "/author", label: "Author" });
  return (
    <>
      <TopBar user={user} links={links} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
