import type { Metadata, Viewport } from "next";
import { Karla, Libre_Baskerville } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const heading = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-baskerville",
  display: "swap",
});
const body = Karla({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-karla", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pisara", template: "%s · Pisara" },
  description: "One short lesson a day from topics you choose, with a quick quiz and review of what you missed.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E5E9EC" },
    { media: "(prefers-color-scheme: dark)", color: "#040F1C" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col bg-page text-text antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
