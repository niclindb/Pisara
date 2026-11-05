import { PublicShell } from "@/components/public-shell";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>
      <article className="prose-lesson mx-auto max-w-[44rem]">{children}</article>
    </PublicShell>
  );
}
