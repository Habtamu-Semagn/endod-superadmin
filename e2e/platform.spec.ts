import { expect, test } from "@playwright/test";
import { PLATFORM_STUB_URL } from "./env";
import {
  PATIENT,
  reauthenticate,
  resetOrgStub,
  resetPlatformStub,
  resetStub,
  signedInAdmin,
} from "./helpers";

// The screens fed by the patient platform (Users, Digital cards, the
// dashboard's patient counts, System monitoring) and the Locations map.

test.beforeEach(async ({ request }) => {
  await resetStub(request);
  await resetOrgStub(request);
  await resetPlatformStub(request);
});

test("dashboard: hospitals, companies, patients, bookings and prescriptions", async ({ page }) => {
  await signedInAdmin(page, "dash2");
  await expect(page.getByTestId("kpi-pending")).toHaveText("3");
  await expect(page.getByTestId("kpi-approved")).toHaveText("1");
  await expect(page.getByTestId("kpi-pending-hospitals")).toHaveText("4");
  await expect(page.getByTestId("kpi-pending-companies")).toHaveText("3");
  await expect(page.getByTestId("kpi-approved-companies")).toHaveText("1 approved");
  await expect(page.getByTestId("kpi-patients")).toHaveText("4");
  await expect(page.getByTestId("kpi-patients-new")).toHaveText("+1 in 7 days");
  await expect(page.getByTestId("kpi-bookings-today")).toHaveText("4");
  await expect(page.getByTestId("kpi-bookings-week")).toHaveText("17 this week");
  await expect(page.getByTestId("kpi-prescriptions")).toHaveText("9");
  await expect(page.getByTestId("company-awaiting")).toHaveCount(3);
  await expect(page.getByTestId("coming-soon")).toHaveCount(0);
});

test("users: search, account details, suspend and reactivate", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "users");
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect(page.getByTestId("patient-card")).toHaveCount(4);
  await page.getByLabel("Search patient accounts").fill("girma");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByTestId("patient-card")).toHaveCount(1);
  await expect(page.getByTestId("patient-card")).toContainText("Bekele Girma");
  await page.getByLabel("Search patient accounts").fill(PATIENT.ALMAZ);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByTestId("patient-card")).toHaveCount(1);
  await expect(page.getByTestId("patient-card")).toContainText("Almaz Tefera");
  await page.getByTestId("patient-card").click();

  await expect(page).toHaveURL(new RegExp(`/super-admin/users/${PATIENT.ALMAZ}$`));
  await expect(page.getByRole("heading", { name: "Almaz Tefera" })).toBeVisible();
  await expect(page.getByTestId("patient-status")).toHaveText("Active");
  await expect(page.getByTestId("linked-hospitals")).toHaveText("2");
  await expect(page.getByText("almaz@example.com", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Suspend" }).click();
  const dialog = page.getByTestId("suspend-dialog");
  await expect(dialog.getByRole("button", { name: "Suspend" })).toBeDisabled();
  await dialog.getByLabel("Reason (kept in the audit log)").fill("Fake bookings reported by two hospitals.");
  await dialog.getByRole("button", { name: "Suspend" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toHaveText("Almaz Tefera is suspended and signed out everywhere.");
  await expect(page.getByTestId("patient-status")).toHaveText("Suspended");
  await expect(page.getByTestId("suspension-reason")).toHaveText("Fake bookings reported by two hospitals.");

  await page.getByRole("button", { name: "Reactivate" }).click();
  const back = page.getByTestId("reactivate-dialog");
  await back.getByLabel("Reason (kept in the audit log)").fill("Cleared after review.");
  await back.getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByTestId("patient-status")).toHaveText("Active");

  // Both are in the audit log, with the admin and the reason.
  await page.goto("/super-admin/audit-logs");
  const actions = page.getByTestId("audit-action");
  await expect(actions.filter({ hasText: "Patient account suspended" }).first()).toBeVisible();
  await expect(actions.filter({ hasText: "Patient account reactivated" }).first()).toBeVisible();

  // A closed account offers no action.
  await page.goto(`/super-admin/users/${PATIENT.DAWIT}`);
  await expect(page.getByTestId("patient-status")).toHaveText("Closed");
  await expect(page.getByRole("button", { name: "Suspend" })).toHaveCount(0);
});

test("digital cards: by Endod ID, by QR link, forged and suspended", async ({ page }) => {
  await signedInAdmin(page, "cards");
  await page.getByRole("link", { name: "Digital Cards" }).click();
  const input = page.getByLabel("Endod ID or card link");
  const check = page.getByRole("button", { name: "Check card" });

  await input.fill("de100001");
  await check.click();
  await expect(page.getByTestId("card-verdict")).toHaveText("Valid");
  await expect(page.getByTestId("card-signature")).toHaveText("Not checked (no QR link given)");
  await expect(page.getByTestId("card-account-status")).toHaveText("Active");

  await input.fill(`https://endod-health.com/card/${PATIENT.ALMAZ}?s=sig-de100001`);
  await check.click();
  await expect(page.getByTestId("card-signature")).toHaveText("Genuine: signed by Endod");
  await expect(page.getByTestId("card-verdict")).toHaveText("Valid");

  await input.fill(`https://endod-health.com/card/${PATIENT.ALMAZ}?s=sig-de100002`);
  await check.click();
  await expect(page.getByTestId("card-verdict")).toHaveText("Not valid");
  await expect(page.getByTestId("card-signature")).toContainText("forged or altered");

  await input.fill(PATIENT.CHALTU);
  await check.click();
  await expect(page.getByTestId("card-verdict")).toHaveText("Not valid");
  await expect(page.getByTestId("card-account-status")).toHaveText("Suspended");

  await input.fill("DE999999");
  await check.click();
  await expect(page.getByTestId("error-banner")).toHaveText("No account has this Endod ID.");

  await input.fill("hello");
  await check.click();
  await expect(page.getByTestId("error-banner")).toContainText("Enter an Endod ID");
});

test("locations: hospitals and clinics on the map, by status", async ({ page }) => {
  await signedInAdmin(page, "map");
  await page.getByRole("link", { name: "Locations & Services" }).click();
  await expect(page.getByTestId("location-row")).toHaveCount(6);
  await expect(page.getByTestId("locations-map")).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(6);
  await expect(page.getByTestId("map-count")).toHaveText("6 of 6 on the map");
  await page.getByRole("tab", { name: "Suspended" }).click();
  await expect(page.getByTestId("location-row")).toHaveCount(1);
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);
  await expect(page.locator('.leaflet-marker-icon[title="Selam Clinic"]')).toBeVisible();
  await page.locator('.leaflet-marker-icon[title="Selam Clinic"]').click();
  await expect(page).toHaveURL(/\/super-admin\/organisations\/(e5){16}$/);
});

test("system monitoring: every service, the platform's report, refreshed", async ({ page, request }) => {
  await signedInAdmin(page, "monitor");
  await page.getByRole("link", { name: "System Monitoring" }).click();
  for (const id of ["platform", "hospital", "tenacare", "admin"]) {
    await expect(page.getByTestId(`service-${id}-status`)).toHaveText("Up");
  }
  await expect(page.getByTestId("last-checked")).toContainText("Last checked");
  const report = page.getByTestId("platform-report");
  await expect(report).toContainText("Database");
  await expect(report).toContainText("Dead letters");
  await expect(report).toContainText("Outbox backlog");

  expect((await request.post(`${PLATFORM_STUB_URL}/__degrade`)).ok()).toBe(true);
  await page.getByRole("button", { name: "Check now" }).click();
  await expect(page.getByTestId("service-platform-status")).toHaveText("Down");
  await expect(page.getByTestId("service-hospital-status")).toHaveText("Up");
  await expect(report).toContainText("2");
});
