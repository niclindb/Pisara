import { PublicShell } from "@/components/public-shell";

// Explore is open to everyone, so visitors can look before signing up (A3, A9).
export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
