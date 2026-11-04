import { learnerLinks, TopBar } from "@/components/top-bar";
import { requireLearner } from "./guard";

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLearner();
  return (
    <>
      <TopBar user={user} links={learnerLinks(user)} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
