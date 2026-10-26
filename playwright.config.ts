import path from "node:path";
import { defineConfig } from "@playwright/test";
import {
  API_PORT,
  API_URL,
  BFF_SECRET,
  ORG_PLATFORM_KEY,
  ORG_STUB_PORT,
  ORG_STUB_URL,
  PLATFORM_KEY,
  STUB_PORT,
  STUB_URL,
  UNCONNECTED_API_PORT,
  UNCONNECTED_API_URL,
  WEB_ORIGIN,
  WEB_PORT,
  apiEnv,
  backendDir,
  python,
  unconnectedApiEnv,
} from "./e2e/env";

// Browser tests run the real stack: the admin API (uvicorn, a throwaway
// SQLite database, migrated with Alembic), tiny stubs of the hospital
// service's and TenaCare's platform APIs, and the web app built with `next build` and served
// by `next start`. Set E2E_NEXT_DEV=1 to use `next dev` instead.

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // The specs share one API and one stub: run them in order.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: WEB_ORIGIN,
    headless: true,
    viewport: { width: 1440, height: 900 },
    // The installed Google Chrome (`chrome` channel): no browser download.
    channel: "chrome",
    launchOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] },
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    acceptDownloads: true,
  },
  webServer: [
    {
      command: `"${python}" "${path.join(backendDir, "tests", "hospital_stub.py")}" ${STUB_PORT}`,
      cwd: backendDir,
      url: `${STUB_URL}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { STUB_PLATFORM_KEY: PLATFORM_KEY, PYTHONUNBUFFERED: "1" },
    },
    {
      command: `"${python}" "${path.join(backendDir, "tests", "organisation_stub.py")}" ${ORG_STUB_PORT}`,
      cwd: backendDir,
      url: `${ORG_STUB_URL}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { STUB_ORG_PLATFORM_KEY: ORG_PLATFORM_KEY, PYTHONUNBUFFERED: "1" },
    },
    {
      command: `"${python}" "${path.join(__dirname, "e2e", "api_server.py")}" ${API_PORT}`,
      cwd: backendDir,
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: apiEnv,
    },
    {
      // The same database without TenaCare's key: the "not connected" state (e2e/companies.spec.ts).
      command: `"${python}" "${path.join(__dirname, "e2e", "api_server.py")}" ${UNCONNECTED_API_PORT}`,
      cwd: backendDir,
      url: `${UNCONNECTED_API_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: unconnectedApiEnv,
    },
    {
      command: process.env.E2E_NEXT_DEV ? `npm run dev -- -p ${WEB_PORT}` : `npm run start -- -p ${WEB_PORT}`,
      url: `${WEB_ORIGIN}/login`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { ADMIN_API_URL: API_URL, SITE_ORIGIN: WEB_ORIGIN, BFF_SHARED_SECRET: BFF_SECRET },
    },
  ],
});
