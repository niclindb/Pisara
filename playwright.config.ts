// Page tests (design 10): axe on every page as a visitor, a learner and an author,
// plus keyboard-only runs of sign-in, onboarding and a quiz. They run against
// `next dev` with the development-only sign-in override and a throwaway database.

import { defineConfig, devices } from "@playwright/test";

const port = 3200;
process.env.UNSUBSCRIBE_SECRET ??= "page-test-secret";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/seed.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, ...devices["Desktop Chrome"] },
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}/sign-in`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
      DEV_SIGNED_IN_USER_ID: "cookie",
      UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET,
      SITE_URL: `http://localhost:${port}`,
      // Sign-in links can't be sent from the tests; the form still has to work by keyboard.
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "page-tests",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
