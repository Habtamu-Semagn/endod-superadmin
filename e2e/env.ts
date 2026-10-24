import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Settings shared by playwright.config.ts and the specs. */

export const API_PORT = 8130;
export const STUB_PORT = 8131;
export const WEB_PORT = 3230;
export const API_URL = `http://127.0.0.1:${API_PORT}`;
export const STUB_URL = `http://127.0.0.1:${STUB_PORT}`;
export const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
export const PLATFORM_KEY = "e2e-platform-key";
export const BFF_SECRET = "e2e-bff-secret-0123456789abcdefghijklmnop";

// The backend's Python: E2E_PYTHON (CI), else the repo's virtualenv.
export const python =
  process.env.E2E_PYTHON ??
  path.join(__dirname, "..", ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
export const backendDir = path.join(__dirname, "..", "backend");

// A fresh database per run. Set once in the main process (which also clears
// earlier runs' files); test workers inherit it, so they use the same one.
if (!process.env.E2E_DB) {
  for (const name of fs.readdirSync(os.tmpdir())) {
    if (name.startsWith("endod-admin-e2e-")) fs.rmSync(path.join(os.tmpdir(), name), { force: true });
  }
  process.env.E2E_DB = path.join(os.tmpdir(), `endod-admin-e2e-${Date.now()}.db`).replace(/\\/g, "/");
}

/** The admin API's settings for the run (the CLI runs with them too). */
export const apiEnv: Record<string, string> = {
  ADMIN_ENVIRONMENT: "development",
  ADMIN_DATABASE_URL: `sqlite:///${process.env.E2E_DB}`,
  SESSION_SECRET: "e2e-session-secret-0123456789abcdefghijklmnop",
  HOSPITAL_API_URL: STUB_URL,
  HOSPITAL_PLATFORM_KEY: PLATFORM_KEY,
  SITE_ORIGIN: WEB_ORIGIN,
  BFF_SHARED_SECRET: BFF_SECRET,
  // The browser tests all come from 127.0.0.1; the per-address limit is tested in pytest.
  ADMIN_IP_FAILURE_LIMIT: "100",
  PYTHONUNBUFFERED: "1",
};
