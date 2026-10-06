import { expect, test } from "@playwright/test";

const PASSWORD = "Password@123";

test.describe("authentication", () => {
  test("tenant logs in and is redirected to the requested page", async ({ page }) => {
    await page.goto("/dashboard/shortlist");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fshortlist/);

    await page.getByLabel("Email").fill("tenant@easyrenting.in");
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/dashboard\/shortlist$/);
    await expect(page.getByRole("heading", { name: "Shortlist" })).toBeVisible();

    // Session survives a reload via the httpOnly refresh cookie.
    await page.reload();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  });

  test("shows an error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("tenant@easyrenting.in");
    await page.getByLabel("Password").fill("wrong-password1");
    await page.getByRole("button", { name: "Log in" }).click();
    // Next.js renders its own empty route-announcer alert, so filter by text.
    await expect(
      page.getByRole("alert").filter({ hasText: /incorrect email or password/i }),
    ).toBeVisible();
  });

  test("validates the registration form client-side", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Mobile number").fill("12345");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/valid 10-digit Indian mobile number/)).toBeVisible();
  });
});
