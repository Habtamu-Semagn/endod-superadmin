import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { STUB_URL, apiEnv, backendDir, python } from "./env";

// --- TOTP (RFC 6238, as Google Authenticator computes it) ---------------------------------

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error(`not base32: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(binary % 1_000_000).padStart(6, "0");
}

export const currentStep = () => Math.floor(Date.now() / 1000 / 30);

/** An admin's authenticator: each code is accepted once, so it tracks the last step used. */
export class Authenticator {
  constructor(
    readonly secret: string,
    public lastStep: number
  ) {}

  /** A code the API will accept now: newer than the last one, within one step of now. */
  async next(): Promise<string> {
    const wanted = this.lastStep + 1;
    // The window is one step either side of now; wait if we ran ahead.
    while (wanted > currentStep() + 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    const step = Math.max(wanted, currentStep());
    this.lastStep = step;
    return totpAt(this.secret, step);
  }
}

// --- the CLI ------------------------------------------------------------------------------------

export function cli(args: string[], stdin = ""): string {
  return execFileSync(python, ["-m", "app.cli", ...args], {
    cwd: backendDir,
    env: { ...process.env, ...apiEnv },
    input: stdin,
    encoding: "utf-8",
  });
}

let counter = 0;
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}@endod.example`;
}

export const PASSWORD = "a long e2e passphrase";

/**
 * An admin with a password (read from stdin) who still has to enrol an
 * authenticator, which only the printed setup link allows.
 */
export function createAdmin(
  prefix: string,
  name = "E2E Admin"
): { email: string; password: string; name: string; link: string } {
  const email = uniqueEmail(prefix);
  const out = cli(["create-admin", "--email", email, "--name", name, "--password-stdin"], `${PASSWORD}\n`);
  expect(out).not.toContain(PASSWORD);
  const link = out.trim().split(/\r?\n/).pop() ?? "";
  expect(link).toMatch(/\/setup#[A-Za-z0-9_-]{40,}$/);
  return { email, password: PASSWORD, name, link };
}

/** Through the setup link of an admin created with a password: enter it, then enrol. */
export async function confirmPasswordOnLink(page: Page, link: string, password: string) {
  await page.goto(link);
  await page.getByLabel("Your password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** An admin created without a password: returns the one-time setup link. */
export function createAdminWithLink(prefix: string, name: string): { email: string; link: string } {
  const email = uniqueEmail(prefix);
  const out = cli(["create-admin", "--email", email, "--name", name]);
  const link = out.trim().split(/\r?\n/).pop() ?? "";
  expect(link).toMatch(/\/setup#[A-Za-z0-9_-]{40,}$/);
  return { email, link };
}

// --- the browser -------------------------------------------------------------------------------

export async function passwordStep(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** On the enrolment page: read the key, confirm a code, accept the recovery codes. */
export async function enrolOnPage(page: Page): Promise<{ auth: Authenticator; recoveryCodes: string[] }> {
  await expect(page).toHaveURL(/\/enroll$/);
  await expect(page.getByTestId("totp-qr")).toBeVisible();
  const secret = ((await page.getByTestId("totp-secret").textContent()) ?? "").replace(/\s/g, "");
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  const step = currentStep();
  await page.getByLabel("Code from the app").fill(totpAt(secret, step));
  await page.getByRole("button", { name: "Confirm and continue" }).click();
  await expect(page.getByTestId("recovery-code")).toHaveCount(10);
  const recoveryCodes = await page.getByTestId("recovery-code").allTextContents();
  await page.getByLabel("I have saved my recovery codes").check();
  await page.getByRole("button", { name: "Continue to the dashboard" }).click();
  await expect(page).toHaveURL(/\/super-admin$/);
  return { auth: new Authenticator(secret, step), recoveryCodes };
}

/** A new admin, signed in and enrolled through the pages. */
export async function signedInAdmin(page: Page, prefix: string) {
  const admin = createAdmin(prefix);
  await confirmPasswordOnLink(page, admin.link, admin.password);
  const { auth } = await enrolOnPage(page);
  await expect(page.getByTestId("signed-in-email")).toHaveText(admin.email);
  return { ...admin, auth };
}

/** Answers the re-authentication prompt with a fresh code. */
export async function reauthenticate(page: Page, auth: Authenticator) {
  const dialog = page.getByTestId("reauth-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Authenticator code").fill(await auth.next());
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
}

export async function resetStub(request: APIRequestContext) {
  const response = await request.post(`${STUB_URL}/__reset`);
  expect(response.ok()).toBe(true);
}

export const STUB = {
  TENA: "a1".repeat(16),
  BETHEL: "b2".repeat(16),
  DRAFT: "c3".repeat(16),
  YEKATIT: "d4".repeat(16),
  SELAM: "e5".repeat(16),
  EVIL: "f6".repeat(16),
};
