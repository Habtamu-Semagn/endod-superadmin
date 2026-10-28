import { expect, test } from "@playwright/test";
import { STUB, reauthenticate, resetStub, signedInAdmin } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("organisations: list, detail, suspend and re-approve", async ({ page }) => {
  const { auth } = await signedInAdmin(page, "orgs");
  await page.getByRole("link", { name: "Organisations" }).click();
  await expect(page.getByTestId("organisation-card")).toHaveCount(6);
  await page.getByRole("tab", { name: "Suspended" }).click();
  await expect(page.getByTestId("organisation-card")).toHaveCount(1);
  await expect(page.getByTestId("organisation-card")).toContainText("Selam Clinic");

  await page.goto(`/super-admin/organisations/${STUB.YEKATIT}`);
  await expect(page.getByTestId("organisation-status")).toHaveText("Approved");
  await page.getByRole("button", { name: "Suspend" }).click();
  await page.getByTestId("suspend-dialog").getByRole("button", { name: "Suspend" }).click();
  await reauthenticate(page, auth);
  await expect(page.getByTestId("success-banner")).toHaveText("Yekatit Hospital is suspended.");
  await expect(page.getByTestId("organisation-status")).toHaveText("Suspended");

  await page.getByRole("button", { name: "Re-approve" }).click();
  await page.getByTestId("approve-dialog").getByRole("button", { name: "Re-approve" }).click();
  await expect(page.getByTestId("organisation-status")).toHaveText("Approved");

  await page.goto("/super-admin/settings");
  await expect(page.getByTestId("admin-row").filter({ hasText: "orgs-" })).toContainText("2FA on");
});

test("the header search finds an organisation", async ({ page }) => {
  await signedInAdmin(page, "search");
  await page.getByPlaceholder("Search organisations by name, code or city...").fill("bahir");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/super-admin\/organisations\?q=bahir$/);
  await expect(page.getByTestId("organisation-card")).toHaveCount(1);
  await expect(page.getByTestId("organisation-card")).toContainText("Selam Clinic");
});
