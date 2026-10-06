import { expect, test } from "@playwright/test";

// Requires the full stack (frontend + backend with the `demo` profile seed data).

test.describe("landing → search", () => {
  test("AI search applies parsed filters and shows results", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("without the broker");

    await page.getByRole("searchbox").fill("2 BHK furnished near Koramangala under 35k for family");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page).toHaveURL(/\/search\?.*ai=/);
    await expect(page.getByRole("list", { name: "Active filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Remove filter 2 BHK/ })).toBeVisible();
    await expect(page.getByText(/homes? found/)).toBeVisible();
  });

  test("city quick link filters by city and filters survive reload", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Bengaluru/ })
      .first()
      .click();
    await expect(page).toHaveURL(/city=Bengaluru/);

    await page.goto("/search?city=Bengaluru&bhk=2&sort=RENT_ASC");
    await expect(page.getByRole("button", { name: "Remove filter 2 BHK" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Sort")).toHaveValue("RENT_ASC");

    const firstListing = page.getByRole("article").first();
    await expect(firstListing).toBeVisible();
    await firstListing.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/properties\//);
    await expect(page.getByRole("heading", { name: "Key facts" })).toBeVisible();
  });
});
