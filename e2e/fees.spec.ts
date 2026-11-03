import { expect, test } from "@playwright/test";
import { reauthenticate, resetOrgStub, resetPlatformStub, resetStub, signedInAdmin } from "./helpers";

// Endod's service fee (the patient platform's /internal/admin/fees, through
// the admin API): the Service fee settings and the Fees report.

test.beforeEach(async ({ request }) => {
  await resetStub(request);
  await resetOrgStub(request);
  await resetPlatformStub(request);
});

test("service fee: shows what a 200 ETB bill becomes, and a change needs a reason and a fresh code", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "fee");
  await page.getByTestId("nav-service-fee").click();
  await expect(page.getByRole("heading", { name: "Service fee" })).toBeVisible();
  await expect(page.getByTestId("current-flat")).toHaveText("ETB 25.00");
  await expect(page.getByTestId("example-total")).toHaveText("ETB 225.00");

  // The example follows what is typed.
  await page.getByLabel("Flat fee per payment (ETB)").fill("30");
  await page.getByLabel("Plus a percentage of the bill (optional, %)").fill("1.5");
  await expect(page.getByTestId("example-fee")).toHaveText("ETB 33.00");
  await expect(page.getByTestId("example-total")).toHaveText("ETB 233.00");
  await page.getByLabel("Flat fee per payment (ETB)").fill("2000");
  await expect(page.getByText("0 to 1,000 birr, at most two decimals.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save fee" })).toBeDisabled();
  await page.getByLabel("Flat fee per payment (ETB)").fill("30");

  await page.getByRole("button", { name: "Save fee" }).click();
  const dialog = page.getByTestId("fee-dialog");
  await expect(dialog).toContainText("a 200 ETB bill becomes ETB 233.00");
  await expect(dialog.getByRole("button", { name: "Save fee" })).toBeDisabled();
  await dialog.getByLabel("Reason (kept in the audit log)").fill("New pricing from the CEO.");
  await dialog.getByRole("button", { name: "Save fee" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toContainText("ETB 30.00 + 1.5% per payment");
  await expect(page.getByTestId("current-flat")).toHaveText("ETB 30.00");
  await expect(page.getByTestId("fee-history")).toContainText("New pricing from the CEO.");

  // Switched off: no fee.
  await page.getByTestId("fee-enabled").uncheck();
  await expect(page.getByTestId("example-total")).toHaveText("ETB 200.00");
  await page.getByRole("button", { name: "Save fee" }).click();
  await page.getByTestId("fee-dialog").getByLabel("Reason (kept in the audit log)").fill("Paused for the launch.");
  await page.getByTestId("fee-dialog").getByRole("button", { name: "Save fee" }).click();
  await expect(page.getByTestId("success-banner")).toContainText("switched off");

  // Both changes are in the audit log.
  await page.goto("/super-admin/audit-logs");
  await expect(page.getByTestId("audit-action").filter({ hasText: "Service fee changed" }).first()).toBeVisible();
});

test("fees: per hospital, a drill-down, and settling owed fees with a reference", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "fees");
  await page.getByTestId("nav-fees").click();
  await expect(page.getByRole("heading", { name: "Fees" })).toBeVisible();
  await expect(page.getByTestId("kpi-owed")).toHaveText("ETB 75.00");
  await expect(page.getByTestId("kpi-collected")).toHaveText("ETB 25.00");
  await expect(page.getByTestId("fee-hospital")).toHaveCount(2);
  const tash = page.getByTestId("fee-hospital").filter({ hasText: "Tikur Anbessa" });
  await expect(tash.getByTestId("hospital-owed")).toHaveText("ETB 50.00");

  await tash.getByRole("button", { name: "Payments" }).click();
  const entries = page.getByTestId("fee-entries");
  await expect(entries.getByTestId("fee-entry")).toHaveCount(2); // the owed ones first
  await expect(entries.getByRole("button", { name: /Mark settled/ })).toBeDisabled();
  await entries.getByLabel("Select every owed payment").check();
  await entries.getByRole("button", { name: "Mark settled (ETB 50.00)" }).click();
  const dialog = page.getByTestId("settle-dialog");
  await dialog.getByLabel("Payment reference").fill("BANK-2026-11-03");
  await dialog.getByRole("button", { name: "Mark settled" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toContainText("2 payments of Tikur Anbessa Specialized Hospital settled: ETB 50.00");
  await expect(page.getByTestId("kpi-owed")).toHaveText("ETB 25.00");
  await expect(tash.getByTestId("hospital-owed")).toHaveText("ETB 0.00");

  // Every payment of the hospital, settled ones with their reference.
  await entries.getByLabel("Status").selectOption("");
  await expect(entries.getByTestId("fee-entry")).toHaveCount(4);
  await expect(entries).toContainText("BANK-2026-11-03");

  // A period without payments.
  await page.getByLabel("From").fill("2020-01-01");
  await page.getByLabel("To").fill("2020-01-31");
  await expect(page.getByTestId("fees-empty")).toBeVisible();
});
