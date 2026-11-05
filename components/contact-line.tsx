import { env } from "@/lib/server/env";

/** "Questions? Email hello@…", or nothing until CONTACT_EMAIL is set. */
export function ContactLine({ about }: { about: string }) {
  const email = env.contactEmail();
  if (!email) return null;
  return (
    <>
      <h2>Contact</h2>
      <p>
        Questions about {about}? Email <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </>
  );
}
