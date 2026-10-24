import { expect, test } from "@playwright/test";
import { STUB, cli, createAdmin, createAdminWithLink, enrolOnPage, passwordStep, uniqueEmail } from "./helpers";
import { PLATFORM_KEY } from "./env";

test("pages redirect to the sign-in when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  for (const path of ["/super-admin", "/super-admin/verifications", `/super-admin/organisations/${STUB.YEKATIT}`,
    "/super-admin/audit-logs", "/super-admin/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  }
  // The BFF refuses API calls and documents without a session.
  expect((await page.request.get("/api/dashboard")).status()).toBe(401);
  expect((await page.request.get(`/api/documents/${STUB.TENA}/moh_license`)).status()).toBe(401);
  // Paths outside the allowlist do not exist.
  expect((await page.request.get("/api/platform/hospitals")).status()).toBe(404);
});

test("setup link, then enrolment, then sign-in with a TOTP code", async ({ page, context }) => {
  const { email, link } = createAdminWithLink("setup", "Selam Tesfaye");
  await page.goto(link);
  await expect(page.getByTestId("setup-name")).toHaveText("Selam Tesfaye");
  // The token is taken out of the address bar.
  await expect(page).toHaveURL(/\/setup$/);

  await page.getByLabel("New password").fill("password1");
  await page.getByLabel("Repeat the password").fill("password1");
  await page.getByRole("button", { name: "Set password and continue" }).click();
  await expect(page.getByTestId("form-error")).toContainText("too common");

  await page.getByLabel("New password").fill("kebele seven blue door");
  await page.getByLabel("Repeat the password").fill("kebele seven blue door");
  await page.getByRole("button", { name: "Set password and continue" }).click();
  const { auth, recoveryCodes } = await enrolOnPage(page);
  expect(new Set(recoveryCodes).size).toBe(10);
  await expect(page.getByTestId("signed-in-name")).toHaveText("Selam Tesfaye");

  // The session is an httpOnly, SameSite=Strict cookie the page cannot read.
  const cookie = (await context.cookies()).find((c) => c.name.endsWith("endod_admin"));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Strict");
  expect(cookie?.secure).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain("endod_admin");
  const me = await page.request.get("/api/auth/me");
  expect(JSON.stringify(await me.json())).not.toMatch(/session_token|token/);

  // The link worked once.
  const reuse = await page.context().newPage();
  await reuse.goto(link);
  await expect(reuse.getByTestId("form-error")).toContainText("invalid or has expired");
  await reuse.close();

  // Sign out, then sign in: password, then a new code.
  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/super-admin");
  await expect(page).toHaveURL(/\/login\?next=/);

  await passwordStep(page, email, "kebele seven blue door");
  await expect(page.getByRole("heading", { name: "Two-step verification" })).toBeVisible();
  await page.getByLabel("Authentication code").fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByTestId("form-error")).toContainText("not valid");
  await page.getByLabel("Authentication code").fill(await auth.next());
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/super-admin$/);
  await expect(page.getByTestId("signed-in-email")).toHaveText(email);

  // A recovery code works once in place of the app.
  await page.getByRole("button", { name: "Sign Out" }).click();
  await passwordStep(page, email, "kebele seven blue door");
  await page.getByRole("button", { name: "Use a recovery code" }).click();
  await page.getByLabel("Recovery code").fill(recoveryCodes[0]);
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/super-admin$/);
});

test("an admin created with a password must enrol before anything else", async ({ page }) => {
  const admin = createAdmin("forced");
  await passwordStep(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/enroll$/);
  // Nothing else is reachable with the half-finished sign-in.
  expect((await page.request.get("/api/dashboard")).status()).toBe(403);
  await page.goto("/super-admin/verifications");
  await expect(page).toHaveURL(/\/enroll$/);
  await enrolOnPage(page);
});

test("lockout after repeated failures, with the same message as a wrong email", async ({ page }) => {
  const admin = createAdmin("lock");
  await passwordStep(page, uniqueEmail("nobody"), admin.password);
  await expect(page.getByTestId("form-error")).toHaveText("Incorrect email or password.");
  await page.getByLabel("Email").fill(admin.email);
  for (let i = 0; i < 5; i += 1) {
    await page.getByLabel("Password").fill(`wrong password ${i}`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("form-error")).toHaveText("Incorrect email or password.");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  }
  // Locked: now even the right password gets the same answer.
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("form-error")).toHaveText("Incorrect email or password.");
  await expect(page).toHaveURL(/\/login$/);
  expect(cli(["list"])).toMatch(new RegExp(`${admin.email.replace(/[.]/g, "\\.")}\\s+locked`));
});

test("cross-site requests and the platform key never get through", async ({ page }) => {
  const evil = await page.request.post("/api/auth/login", {
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    data: { email: "x@endod.example", password: "whatever-1" },
  });
  expect(evil.status()).toBe(403);
  const noOrigin = await page.request.post("/api/auth/login", {
    headers: { "Content-Type": "application/json" },
    data: { email: "x@endod.example", password: "whatever-1" },
  });
  expect(noOrigin.status()).toBe(403);
  const html = await page.request.get("/login");
  expect(await html.text()).not.toContain(PLATFORM_KEY);
  expect(html.headers()["x-frame-options"]).toBe("DENY");
});
