import { defineConfig, devices } from "@playwright/test";

// E2E target. Override with E2E_BASE_URL to point at a preview or production
// deploy. Defaults to the published site.
const baseURL = process.env.E2E_BASE_URL ?? "https://daily-canberra-site.lovable.app";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL,
    extraHTTPHeaders: { "user-agent": "tdc-e2e-bot" },
  },
  projects: [
    // Pure HTTP / SSR assertions. Uses the `request` fixture only, no browser.
    {
      name: "ssr",
      testMatch: /.*\.ssr\.spec\.ts/,
    },
    // Interactive tests for client-side filters (chips, This weekend).
    {
      name: "chromium",
      testMatch: /.*\.browser\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Legacy: the original best.spec.ts uses request only; keep it runnable.
    {
      name: "legacy",
      testMatch: /best\.spec\.ts/,
    },
  ],
});
