import { TopBar } from "@/components/top-bar";
import { requireAuthor } from "./guard";

export default async function AuthorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthor();
  return (
    <>
      <TopBar
        user={user}
        links={[
          { href: "/author", label: "Author" },
          { href: "/home", label: "Learner view" },
        ]}
      />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
