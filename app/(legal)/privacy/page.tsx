import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

// What Pisara collects and how to delete it (design 9). Plain words; keep it in
// step with what the app actually stores.
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p>Last updated November 5, 2026.</p>
      <p>Pisara keeps only what it needs to send you lessons and show your progress. It doesn&rsquo;t sell your data or show ads.</p>

      <h2>What we keep</h2>
      <ul>
        <li>Your email address, to sign you in and send your lessons.</li>
        <li>Your name, if you give one. It&rsquo;s only used to greet you, and nobody else sees it.</li>
        <li>Your time zone and settings: your topics and how often each comes up, your recap day, whether emails are on, and any pause.</li>
        <li>Your learning: which lessons you got and read, your quiz answers, which questions are due for review, and your milestones.</li>
      </ul>

      <h2>What we don&rsquo;t do</h2>
      <ul>
        <li>No ads, no tracking pixels in emails, and no third-party analytics.</li>
        <li>The only cookie is the one that keeps you signed in.</li>
        <li>We never sell or share your data with anyone for marketing.</li>
      </ul>

      <h2>Who helps run Pisara</h2>
      <p>These services store or handle your data only to run the app:</p>
      <ul>
        <li>Supabase: the database and sign-in.</li>
        <li>Vercel: hosting the website.</li>
        <li>Resend: sending lesson emails.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>
          Turn emails off, or pause lessons, in <Link href="/settings">Settings</Link> or from the Email settings link in any email.
        </li>
        <li>
          Delete your account in <Link href="/settings">Settings</Link>. It removes your email, name, settings and all your learning
          right away, and it can&rsquo;t be undone.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>If this page changes in a way that matters, we&rsquo;ll say so in an email before it takes effect.</p>
    </>
  );
}
