import { expect, test } from "@playwright/test";
import { STUB, reauthenticate, resetStub, signedInAdmin } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("the list shows real applications with their status, submitted date and demo time", async ({ page }) => {
  await signedInAdmin(page, "list");
  await expect(page.getByTestId("kpi-pending")).toHaveText("3");
  await expect(page.getByTestId("kpi-approved")).toHaveText("1");
  await page.getByRole("link", { name: "Verifications" }).click();
  const cards = page.getByTestId("application-card");
  await expect(cards).toHaveCount(3); // submitted ones first
  const tena = cards.filter({ hasText: "Tena Clinic" });
  await expect(tena).toContainText("Submitted");
  await expect(tena).toContainText("Submitted: 20 Oct 2026");
  // 10:00 in Addis Ababa, whatever the browser's own time zone.
  await expect(tena).toContainText(/Demo: Tue,? 27 Oct 2026,? 10:00 EAT/);

  await page.getByRole("button", { name: /^All/ }).click();
  await expect(cards).toHaveCount(5);
  await page.getByLabel("Search applications").fill("hawassa");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Abebe Draft Clinic");
});

test("approve, with a confirmation and a fresh code", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "approve");
  await page.goto(`/super-admin/verifications/${STUB.TENA}`);
  await expect(page.getByTestId("license-number")).toHaveText("MOH/TENA/2026");
  await expect(page.getByTestId("map-link")).toHaveAttribute("href", /mlat=9\.010800&mlon=38\.761300/);
  await expect(page.getByText("contact@tena.example")).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  const dialog = page.getByTestId("approve-dialog");
  await expect(dialog).toContainText("Approve Tena Clinic?");
  await dialog.getByRole("button", { name: "Approve" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toHaveText("Tena Clinic is approved.");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Approved");

  await page.goto("/super-admin/audit-logs");
  const approved = page.getByTestId("audit-event").filter({ hasText: "Hospital approved" }).filter({ hasText: "Tena Clinic" });
  await expect(approved).toHaveCount(1);
  await expect(approved).toContainText("approve-");
});

test("approving an unsubmitted application shows the hospital service's 409", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "draft");
  await page.goto(`/super-admin/verifications/${STUB.DRAFT}`);
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByTestId("approve-dialog").getByRole("button", { name: "Approve" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("action-error")).toContainText(
    "The hospital's application is not submitted yet (status: draft)"
  );
  await expect(page.getByTestId("status-badge").first()).toHaveText("Draft");
});

test("reject needs a reason, which the hospital then sees", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "reject");
  await page.goto(`/super-admin/verifications/${STUB.BETHEL}`);
  await page.getByRole("button", { name: "Reject" }).click();
  const dialog = page.getByTestId("reject-dialog");
  await expect(dialog.getByRole("button", { name: "Reject" })).toBeDisabled();
  await dialog.getByLabel("Reason (required)").fill("The TIN certificate is unreadable; upload a clearer scan.");
  await dialog.getByRole("button", { name: "Reject" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toContainText("sent back to Bethel General Hospital");
  await expect(page.getByTestId("rejection-reason")).toHaveText("The TIN certificate is unreadable; upload a clearer scan.");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Sent back");

  // Within 10 minutes no new code is asked for; the hospital service refuses a second rejection.
  await page.getByRole("button", { name: "Reject" }).click();
  await dialog.getByLabel("Reason (required)").fill("Again.");
  await dialog.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByTestId("action-error")).toHaveText("Only a submitted application can be sent back.");
  await expect(page.getByTestId("reauth-dialog")).toBeHidden();
});

test("documents open as PDF or image with safe headers, and every view is audited", async ({ page }) => {
  await signedInAdmin(page, "docs");
  await page.goto(`/super-admin/verifications/${STUB.TENA}`);
  const row = page.getByTestId("document-moh_license");
  await expect(row).toContainText("Ministry of Health facility license");
  const href = await row.getByRole("link", { name: "View" }).getAttribute("href");
  expect(href).toBe(`/api/documents/${STUB.TENA}/moh_license`);

  const view = await page.request.get(href!);
  expect(view.status()).toBe(200);
  expect(view.headers()["content-type"]).toBe("application/pdf");
  expect(view.headers()["content-disposition"]).toMatch(/^inline; filename="moh_license\.pdf"/);
  expect(view.headers()["x-content-type-options"]).toBe("nosniff");
  expect(view.headers()["cache-control"]).toContain("no-store");
  expect(view.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect((await view.body()).subarray(0, 4).toString()).toBe("%PDF");

  const downloading = page.waitForEvent("download");
  await row.getByRole("link", { name: "Download" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("moh_license.pdf");

  const image = await page.request.get(`/api/documents/${STUB.BETHEL}/owner_id`);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect(image.headers()["content-security-policy"]).toContain("default-src 'none'");

  // An HTML file is never passed on.
  const html = await page.request.get(`/api/documents/${STUB.EVIL}/moh_license`);
  expect(html.status()).toBe(502);
  expect(await html.text()).not.toContain("<script>");

  await page.goto("/super-admin/audit-logs");
  await page.getByLabel("Action").selectOption("document_view");
  await expect(page.getByTestId("audit-event")).toHaveCount(4);
  await page.getByLabel("Result").selectOption("failure");
  await expect(page.getByTestId("audit-event")).toHaveCount(1);
});
