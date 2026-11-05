// Page checks (design 10): every page, signed out, as a learner and as an
// author, in light and dark mode, checked with axe for WCAG 2.2 AA.
// Runs against `next dev` with a local Postgres database (E2E_DATABASE_URL),
// which e2e/global-setup.ts fills with sample content. No Supabase needed:
// in development the pisara-dev-user cookie picks who is signed in.

import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/pisara_e2e";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Pages change data (opening a lesson marks it read), so one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3100",
    // A browser already on this machine (set PLAYWRIGHT_CHROMIUM_PATH), or Playwright's own.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
    { name: "phone", use: { ...devices["Pixel 7"], colorScheme: "light" } },
  ],
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: databaseUrl,
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e",
      CRON_SECRET: "e2e",
      UNSUBSCRIBE_SECRET: "e2e-unsubscribe",
      SITE_URL: "http://localhost:3100",
      DEV_SIGNED_IN_USER_ID: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
