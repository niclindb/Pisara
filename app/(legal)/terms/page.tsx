import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms</h1>
      <p>Last updated November 5, 2026.</p>
      <p>By using Pisara you agree to these terms. They&rsquo;re short on purpose.</p>

      <h2>Using Pisara</h2>
      <ul>
        <li>Pisara is free, for your own learning.</li>
        <li>One account per person. Keep access to your email safe, since sign-in links go there.</li>
        <li>Don&rsquo;t try to break, overload or copy the service, or reach data that isn&rsquo;t yours.</li>
      </ul>

      <h2>The lessons</h2>
      <ul>
        <li>Lessons are written with care, but they can contain mistakes. They aren&rsquo;t professional advice.</li>
        <li>The lessons and quizzes belong to Pisara and its authors. You can read and share what you learn, but don&rsquo;t republish the lessons.</li>
      </ul>

      <h2>Changes and ending</h2>
      <ul>
        <li>Pisara may change, add or remove features and topics, and can pause or end the service.</li>
        <li>
          You can stop any time by deleting your account in <Link href="/settings">Settings</Link>. See{" "}
          <Link href="/privacy">Privacy</Link> for what that removes.
        </li>
        <li>Pisara is provided as it is, without warranties, as far as the law allows.</li>
        <li>If these terms change in a way that matters, we&rsquo;ll say so in an email before it takes effect.</li>
      </ul>
    </>
  );
}
