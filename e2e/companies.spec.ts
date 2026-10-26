import { expect, test, type Page } from "@playwright/test";
import { BFF_SECRET, ORG_STUB_URL, UNCONNECTED_API_URL } from "./env";
import { ORG, reauthenticate, resetOrgStub, resetStub, signedInAdmin } from "./helpers";

// Company applications and companies, through the real admin API and a stub
// of TenaCare's platform API (backend/tests/organisation_stub.py).

test.beforeEach(async ({ request }) => {
  await resetStub(request);
  await resetOrgStub(request);
});

test("Verifications switches to companies: list, filters and search", async ({ page }) => {
  await signedInAdmin(page, "co-list");
  await expect(page.getByTestId("kpi-pending-companies")).toHaveText("3");
  await expect(page.getByTestId("kpi-pending")).toHaveText("3");

  await page.getByRole("link", { name: "Verifications" }).click();
  await expect(page.getByTestId("application-card")).toHaveCount(3);
  await page.getByTestId("kind-switch").getByRole("link", { name: "Companies" }).click();
  await expect(page).toHaveURL(/\/super-admin\/verifications\?type=companies$/);
  const cards = page.getByTestId("company-application-card");
  await expect(cards).toHaveCount(3); // submitted first
  const abay = cards.filter({ hasText: "Abay Manufacturing PLC" });
  await expect(abay).toContainText("Submitted");
  await expect(abay).toContainText("Manufacturing · 240 employees · Addis Ababa");
  await expect(abay).toContainText("Submitted: 20 Oct 2026");
  // Amendment 1: a TIN seen elsewhere, an email nobody verified.
  await expect(abay.getByTestId("flag-duplicate-tin")).toHaveText("Same TIN as another application/company");
  await expect(abay.getByTestId("flag-email-unverified")).toHaveText("Email not verified: confirm it on the call");
  const habesha = cards.filter({ hasText: "Habesha Logistics Share Company" });
  await expect(habesha.getByTestId("flag-duplicate-tin")).toHaveCount(0);
  await expect(habesha.getByTestId("flag-email-unverified")).toHaveCount(0);

  await page.getByRole("button", { name: /^All/ }).click();
  await expect(cards).toHaveCount(6);
  await page.getByRole("button", { name: /^Sent back/ }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Sent Back Services PLC");
  await page.getByRole("button", { name: /^Closed/ }).click();
  await expect(cards).toHaveCount(0);
  await page.getByRole("button", { name: /^All/ }).click();
  await page.getByLabel("Search company applications").fill("hawassa");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Draft Trading PLC");

  // And back to hospitals.
  await page.getByTestId("kind-switch").getByRole("link", { name: "Hospitals" }).click();
  await expect(page.getByTestId("application-card")).toHaveCount(3);
});

test("approve a company, with a fresh code, only as it was seen; a changed one is reloaded first", async ({ page, request }) => {
  const { auth } = await signedInAdmin(page, "co-approve");
  await page.goto("/super-admin/verifications?type=companies");
  await page.getByTestId("company-application-card").filter({ hasText: "Abay Manufacturing PLC" }).click();
  await expect(page).toHaveURL(new RegExp(`/super-admin/verifications/companies/${ORG.ABAY}$`));
  await expect(page.getByTestId("business-license")).toHaveText("BL/ABAY/2026");
  await expect(page.getByTestId("employee-count")).toHaveText("240");
  await expect(page.getByText("hr@abay.example")).toBeVisible();
  await expect(page.getByTestId("flag-duplicate-tin")).toBeVisible();
  await expect(page.getByTestId("flag-email-unverified")).toBeVisible();

  // The applicant edits the application while it is open here.
  expect((await request.post(`${ORG_STUB_URL}/__touch/${ORG.ABAY}`)).ok()).toBe(true);
  await page.getByRole("button", { name: "Approve" }).click();
  const dialog = page.getByTestId("approve-dialog");
  await expect(dialog).toContainText("Approve Abay Manufacturing PLC?");
  await dialog.getByRole("button", { name: "Approve" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("action-error")).toHaveText("The application changed since you opened it. Reload it.");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Submitted");
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByTestId("action-error")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reload" })).toHaveCount(0);

  // Within 10 minutes no new code is asked for.
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByTestId("approve-dialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByTestId("success-banner")).toHaveText("Abay Manufacturing PLC is approved.");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Approved");
  await expect(page.getByTestId("reauth-dialog")).toBeHidden();

  await page.goto("/super-admin/audit-logs");
  await page.getByLabel("Action").selectOption("company_approve");
  const events = page.getByTestId("audit-event").filter({ hasText: "Abay Manufacturing PLC" }).filter({ hasText: "co-approve-" });
  await expect(events).toHaveCount(2);
  await page.getByLabel("Result").selectOption("failure");
  await expect(events).toHaveCount(1);
  await expect(events.first()).toContainText("Company approved");

  // The approved company is now in the Companies directory.
  await page.goto("/super-admin/organisations?type=companies");
  await expect(page.getByTestId("company-row").filter({ hasText: "Abay Manufacturing PLC" })).toHaveCount(1);
});

test("reject a company with a reason, which the company then sees", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "co-reject");
  await page.goto(`/super-admin/verifications/companies/${ORG.HABESHA}`);
  await page.getByRole("button", { name: "Reject (they can fix and resubmit)" }).click();
  const dialog = page.getByTestId("reject-dialog");
  await expect(dialog.getByRole("button", { name: "Reject", exact: true })).toBeDisabled();
  await dialog.getByLabel("Reason (required)").fill("ab");
  await expect(dialog.getByRole("button", { name: "Reject", exact: true })).toBeDisabled();
  await dialog.getByLabel("Reason (required)").fill("The trade license has expired; upload the renewed one.");
  await dialog.getByRole("button", { name: "Reject", exact: true }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toContainText("sent back to Habesha Logistics Share Company");
  await expect(page.getByTestId("rejection-reason")).toHaveText("The trade license has expired; upload the renewed one.");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Sent back");

  await page.goto("/super-admin/audit-logs");
  await page.getByLabel("Action").selectOption("company_reject");
  await expect(page.getByTestId("audit-event").filter({ hasText: "co-reject-" })).toHaveCount(1);
});

test("reject and close a fake application: an extra confirmation, then it is closed for good", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "co-close");
  await page.goto(`/super-admin/verifications/companies/${ORG.EVILCO}`);
  await page.getByRole("button", { name: "Reject and close (fake or abusive; cannot resubmit)" }).click();
  const dialog = page.getByTestId("close-dialog");
  await expect(dialog).toContainText("can never resubmit");
  await dialog.getByLabel("Reason (required)").fill("The documents are forged.");
  // Not without the extra confirmation.
  await expect(dialog.getByRole("button", { name: "Reject and close" })).toBeDisabled();
  await dialog.getByLabel(/I am sure/).check();
  await dialog.getByRole("button", { name: "Reject and close" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toHaveText(
    "The application of Evil Docs PLC is closed; it cannot be resubmitted."
  );
  await expect(page.getByTestId("status-badge").first()).toHaveText("Closed");
  await expect(page.getByTestId("rejection-reason")).toHaveText("The documents are forged.");

  await page.goto("/super-admin/verifications?type=companies");
  await page.getByRole("button", { name: /^Closed/ }).click();
  await expect(page.getByTestId("company-application-card")).toHaveCount(1);
  await expect(page.getByTestId("company-application-card")).toContainText("Evil Docs PLC");

  await page.goto("/super-admin/audit-logs");
  await page.getByLabel("Action").selectOption("company_reject");
  await expect(page.getByTestId("audit-event").filter({ hasText: "co-close-" })).toHaveCount(1);
});

test("company documents open as PDF or image with safe headers, and every view is audited", async ({ page }) => {
  await signedInAdmin(page, "co-docs");
  await page.goto(`/super-admin/verifications/companies/${ORG.ABAY}`);
  const row = page.getByTestId("document-trade_license");
  await expect(row).toContainText("Trade license");
  await expect(page.getByTestId("document-authorization_letter")).toContainText("Authorization letter");
  const href = await row.getByRole("link", { name: "View" }).getAttribute("href");
  expect(href).toBe(`/api/company-documents/${ORG.ABAY}/trade_license`);

  const view = await page.request.get(href!);
  expect(view.status()).toBe(200);
  expect(view.headers()["content-type"]).toBe("application/pdf");
  expect(view.headers()["content-disposition"]).toMatch(/^inline; filename="trade_license\.pdf"/);
  expect(view.headers()["x-content-type-options"]).toBe("nosniff");
  expect(view.headers()["cache-control"]).toContain("no-store");
  expect(view.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect((await view.body()).subarray(0, 4).toString()).toBe("%PDF");

  const downloading = page.waitForEvent("download");
  await row.getByRole("link", { name: "Download" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("trade_license.pdf");

  const image = await page.request.get(`/api/company-documents/${ORG.HABESHA}/tin_certificate`);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect(image.headers()["content-security-policy"]).toContain("default-src 'none'");

  // An HTML file is never passed on; hospital kinds are not company kinds.
  const html = await page.request.get(`/api/company-documents/${ORG.EVILCO}/trade_license`);
  expect(html.status()).toBe(502);
  expect(await html.text()).not.toContain("<script>");
  expect((await page.request.get(`/api/company-documents/${ORG.ABAY}/moh_license`)).status()).toBe(404);

  await page.goto("/super-admin/audit-logs");
  await page.getByLabel("Action").selectOption("company_document_view");
  const viewed = page.getByTestId("audit-event").filter({ hasText: "co-docs-" });
  await expect(viewed).toHaveCount(4);
  await page.getByLabel("Result").selectOption("failure");
  await expect(viewed).toHaveCount(1);
});

test("the Companies directory: status, employees, admins, suspend and reactivate", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "co-dir");
  await page.getByRole("link", { name: "Organisations" }).click();
  await expect(page.getByTestId("organisation-card")).toHaveCount(6);
  await page.getByTestId("kind-switch").getByRole("link", { name: "Companies" }).click();
  const rows = page.getByTestId("company-row");
  await expect(rows).toHaveCount(2);
  const ethio = rows.filter({ hasText: "Ethio Finance SC" });
  await expect(ethio.getByTestId("company-employees")).toHaveText("312");
  await expect(ethio.getByTestId("company-admins")).toHaveText("2");
  await expect(ethio.getByTestId("status-badge")).toHaveText("Active");
  await page.getByRole("tab", { name: "Suspended" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Dormant Textiles PLC");
  await page.getByRole("tab", { name: "All" }).click();

  await ethio.getByRole("button", { name: "Suspend" }).click();
  await expect(page.getByTestId("suspend-dialog")).toContainText("Suspend Ethio Finance SC?");
  await page.getByTestId("suspend-dialog").getByRole("button", { name: "Suspend" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toHaveText("Ethio Finance SC is suspended.");
  await expect(ethio.getByTestId("status-badge")).toHaveText("Suspended");

  await ethio.getByRole("button", { name: "Reactivate" }).click();
  await page.getByTestId("reactivate-dialog").getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByTestId("success-banner")).toHaveText("Ethio Finance SC is active again.");
  await expect(ethio.getByTestId("status-badge")).toHaveText("Active");

  await page.goto("/super-admin/audit-logs");
  await expect(page.getByTestId("audit-event").filter({ hasText: "Company suspended" }).filter({ hasText: "co-dir-" })).toHaveCount(1);
  await expect(page.getByTestId("audit-event").filter({ hasText: "Company reactivated" }).filter({ hasText: "co-dir-" })).toHaveCount(1);
});

/**
 * The browser's calls for company data go to a second admin API on the same
 * database that has no ORGANISATION_PLATFORM_KEY (as the BFF would send them:
 * the shared secret and the session), so the page shows the real 503.
 */
async function throughUnconnectedApi(page: Page, paths: RegExp) {
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name.endsWith("endod_admin"));
  expect(session).toBeTruthy();
  await page.route(paths, async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({
      url: `${UNCONNECTED_API_URL}${url.pathname.replace(/^\/api/, "")}${url.search}`,
      headers: {
        Accept: "application/json",
        "X-BFF-Secret": BFF_SECRET,
        "X-Endod-Client-IP": "127.0.0.1",
        Authorization: `Bearer ${session!.value}`,
      },
    });
    await route.fulfill({ response });
  });
}

test("without TenaCare's key: companies say they are not connected yet, hospitals keep working", async ({ page }) => {
  await signedInAdmin(page, "co-503");
  // The API itself answers 503 with a clear message.
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name.endsWith("endod_admin"))!;
  const direct = await page.request.get(`${UNCONNECTED_API_URL}/company-applications`, {
    headers: { "X-BFF-Secret": BFF_SECRET, "X-Endod-Client-IP": "127.0.0.1", Authorization: `Bearer ${session.value}` },
  });
  expect(direct.status()).toBe(503);
  expect(await direct.json()).toMatchObject({ error_code: "COMPANIES_NOT_CONNECTED" });

  await throughUnconnectedApi(page, /\/api\/(company-applications|companies|dashboard)(\/|\?|$)/);
  await page.goto("/super-admin");
  await expect(page.getByTestId("kpi-pending-companies")).toHaveText("—");
  await expect(page.getByTestId("kpi-pending-companies-note")).toHaveText("Companies are not connected yet");
  await expect(page.getByTestId("kpi-pending")).toHaveText("3");
  await expect(page.getByTestId("error-banner")).toHaveCount(0);

  await page.goto("/super-admin/verifications?type=companies");
  await expect(page.getByTestId("companies-not-connected")).toContainText("Companies are not connected yet");
  await expect(page.getByTestId("companies-not-connected")).toContainText("ORGANISATION_PLATFORM_KEY");
  await page.goto(`/super-admin/verifications/companies/${ORG.ABAY}`);
  await expect(page.getByTestId("companies-not-connected")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await page.goto("/super-admin/organisations?type=companies");
  await expect(page.getByTestId("companies-not-connected")).toBeVisible();

  // Hospitals are untouched.
  await page.getByTestId("kind-switch").getByRole("link", { name: "Hospitals" }).click();
  await expect(page.getByTestId("organisation-card")).toHaveCount(6);
  await page.goto("/super-admin/verifications");
  await expect(page.getByTestId("application-card")).toHaveCount(3);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});
