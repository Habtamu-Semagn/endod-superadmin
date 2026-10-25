import { spawn, type ChildProcess } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { API_URL, BFF_SECRET } from "./env";

// Only our nginx may call the web app: in production every request needs
// X-Endod-Edge-Key (= EDGE_SHARED_SECRET), except the container's own
// healthcheck (GET /login from 127.0.0.1 or ::1). These tests start the same
// build again in production mode (https SITE_ORIGIN), one server at a time.

const EDGE_SECRET = "e2e-edge-secret-0123456789abcdefghijklmnop";
const PROD_ORIGIN = "https://admin.endod.example";
const PROD_PORT = 3231;
const UNSET_PORT = 3232;
const repoRoot = path.join(__dirname, "..");

async function startServer(port: number, env: Record<string, string>): Promise<ChildProcess> {
  const nextBin = require.resolve("next/dist/bin/next", { paths: [repoRoot] });
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: repoRoot,
    env: { ...process.env, ADMIN_API_URL: API_URL, BFF_SHARED_SECRET: BFF_SECRET, SITE_ORIGIN: PROD_ORIGIN, ...env },
    stdio: "ignore",
  });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      // The healthcheck path answers from localhost in any state.
      const response = await fetch(`http://127.0.0.1:${port}/login`, { redirect: "manual" });
      if (response.status === 200 || response.status === 503) return child;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill();
  throw new Error(`next start on port ${port} did not come up`);
}

async function stopServer(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await exited;
}

/** This machine's first non-loopback IPv4 address: requests to it do not come from 127.0.0.1. */
function lanAddress(): string | undefined {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return undefined;
}

const get = (request: APIRequestContext, url: string, headers: Record<string, string> = {}) =>
  request.get(url, { headers, maxRedirects: 0, failOnStatusCode: false });

test.describe("edge key, production with EDGE_SHARED_SECRET", () => {
  test.describe.configure({ mode: "serial" });
  let server: ChildProcess | undefined;
  const base = `http://127.0.0.1:${PROD_PORT}`;
  const key = { "X-Endod-Edge-Key": EDGE_SECRET };

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    server = await startServer(PROD_PORT, { EDGE_SHARED_SECRET: EDGE_SECRET });
  });
  test.afterAll(async () => {
    await stopServer(server);
  });

  test("without the key or with a wrong one: 403 on pages, API routes and assets", async ({ request }) => {
    for (const headers of [{}, { "X-Endod-Edge-Key": "wrong" }, { "X-Endod-Edge-Key": `${EDGE_SECRET}x` }] as Record<string, string>[]) {
      for (const url of ["/", "/setup", "/super-admin", "/api/dashboard", "/api/auth/session", "/favicon.ico"]) {
        const response = await get(request, `${base}${url}`, { ...headers, "X-Endod-Client-IP": "203.0.113.9" });
        expect(response.status(), `${url} ${JSON.stringify(headers)}`).toBe(403);
      }
    }
    const post = await request.post(`${base}/api/auth/login`, {
      headers: { Origin: PROD_ORIGIN, "Content-Type": "application/json", "X-Endod-Edge-Key": "wrong" },
      data: { email: "a@b.example", password: "x" },
      failOnStatusCode: false,
    });
    expect(post.status()).toBe(403);
    expect(await post.text()).not.toContain("wrong");
  });

  test("with the key the site works", async ({ request }) => {
    const login = await get(request, `${base}/login`, key);
    expect(login.status()).toBe(200);
    expect(await login.text()).not.toContain(EDGE_SECRET);
    expect(JSON.stringify(login.headers())).not.toContain(EDGE_SECRET);
    const root = await get(request, `${base}/`, key);
    expect(root.status()).toBe(307);
    expect(root.headers().location).toContain("/login");
    // The BFF is reached (and answers for itself).
    expect((await get(request, `${base}/api/dashboard`, { ...key, "X-Endod-Client-IP": "203.0.113.9" })).status()).toBe(401);
  });

  test("the localhost healthcheck (GET /login) needs no key; nothing else does", async ({ request }) => {
    expect((await get(request, `${base}/login`)).status()).toBe(200);
    expect((await get(request, `http://[::1]:${PROD_PORT}/login`)).status()).toBe(200);
    // A forged loopback marker changes nothing.
    expect((await get(request, `${base}/login`, { "X-Endod-Loopback": "1" })).status()).toBe(200);
    expect((await get(request, `${base}/setup`)).status()).toBe(403);
    expect((await get(request, `${base}/login?x=1`)).status()).toBe(200);
    expect((await get(request, `${base}/login/`)).status()).not.toBe(200);
    const post = await request.post(`${base}/login`, { failOnStatusCode: false, maxRedirects: 0 });
    expect(post.status()).toBe(403);
  });

  test("from another address the healthcheck path needs the key too, whatever headers say", async ({ request }) => {
    const lan = lanAddress();
    test.skip(!lan, "no non-loopback network address on this machine");
    const url = `http://${lan}:${PROD_PORT}/login`;
    const forged = { "X-Forwarded-For": "127.0.0.1", "X-Real-IP": "127.0.0.1", "X-Endod-Loopback": "1", Host: `127.0.0.1:${PROD_PORT}` };
    expect((await get(request, url)).status()).toBe(403);
    expect((await get(request, url, forged)).status()).toBe(403);
    expect((await get(request, url, key)).status()).toBe(200);
  });
});

test.describe("edge key, production without EDGE_SHARED_SECRET", () => {
  test.describe.configure({ mode: "serial" });
  let server: ChildProcess | undefined;
  const base = `http://127.0.0.1:${UNSET_PORT}`;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    server = await startServer(UNSET_PORT, { EDGE_SHARED_SECRET: "" });
  });
  test.afterAll(async () => {
    await stopServer(server);
  });

  test("every request gets 503 not configured", async ({ request }) => {
    for (const url of ["/login", "/", "/api/dashboard"]) {
      for (const headers of [{}, { "X-Endod-Edge-Key": "" }, { "X-Endod-Edge-Key": EDGE_SECRET }] as Record<string, string>[]) {
        const response = await get(request, `${base}${url}`, headers);
        expect(response.status(), url).toBe(503);
        expect((await response.json()).error_code).toBe("NOT_CONFIGURED");
      }
    }
  });

  test("a key shorter than 32 characters counts as unset", async ({ request }) => {
    test.setTimeout(120_000);
    await stopServer(server);
    server = await startServer(UNSET_PORT, { EDGE_SHARED_SECRET: "too-short-secret" });
    const response = await get(request, `${base}/login`, { "X-Endod-Edge-Key": "too-short-secret" });
    expect(response.status()).toBe(503);
  });
});
