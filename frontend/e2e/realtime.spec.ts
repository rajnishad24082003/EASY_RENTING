import { type Browser, type Page, expect, test } from "@playwright/test";

const PASSWORD = "Password@123";
const OWNER_EMAIL = "owner@easyrenting.in";

async function loginPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  return page;
}

function tomorrowIso(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

// Cross-role flow against a running stack seeded with the demo profile:
// chat messages and visit updates must reach the other party live, without a reload.
test.describe("real-time tenant ↔ owner flow", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop only");

  test("tenant chats and books a visit; owner replies and confirms live", async ({ browser, request }) => {
    const stamp = Date.now();
    const tenantEmail = `e2e.tenant.${stamp}@example.com`;
    const tenantName = `E2E Tenant ${stamp % 100000}`;
    const register = await request.post("/api/v1/auth/register", {
      data: { name: tenantName, email: tenantEmail, phone: "9876543210", password: PASSWORD, role: "TENANT" },
    });
    expect(register.status()).toBe(201);

    const ownerLogin = await request.post("/api/v1/auth/login", {
      data: { email: OWNER_EMAIL, password: PASSWORD },
    });
    const { accessToken } = (await ownerLogin.json()) as { accessToken: string };
    const mine = await request.get("/api/v1/properties/mine?size=50", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listings = (await mine.json()) as { content: { id: string; status: string }[] };
    const propertyId = listings.content.find((p) => p.status === "ACTIVE")!.id;

    const tenant = await loginPage(browser, tenantEmail);
    const owner = await loginPage(browser, OWNER_EMAIL);

    // Tenant opens a conversation from the listing page.
    await tenant.goto(`/properties/${propertyId}`);
    await tenant.getByRole("button", { name: "Chat with owner" }).click();
    await tenant.getByLabel("Your message").fill("Hi! Is this flat still available?");
    await tenant.getByRole("button", { name: "Send message" }).click();
    await tenant.waitForURL(/\/messages\/[0-9a-f-]{36}$/);
    const conversationPath = new URL(tenant.url()).pathname;

    // Owner sees the message, then the tenant's follow-up arrives over WebSocket.
    await owner.goto(conversationPath);
    await expect(owner.getByText("Hi! Is this flat still available?")).toBeVisible();
    const followUp = `Is parking included? (${stamp})`;
    await tenant.getByPlaceholder("Type a message…").fill(followUp);
    await tenant.getByRole("button", { name: "Send message" }).click();
    await expect(owner.getByText(followUp)).toBeVisible({ timeout: 10_000 });

    const reply = `Yes, one covered slot. (${stamp})`;
    await owner.getByPlaceholder("Type a message…").fill(reply);
    await owner.getByRole("button", { name: "Send message" }).click();
    await expect(tenant.getByText(reply)).toBeVisible({ timeout: 10_000 });

    // Tenant requests a visit for tomorrow.
    await tenant.goto(`/properties/${propertyId}`);
    await tenant.getByLabel("Date").fill(tomorrowIso());
    await tenant.getByRole("radiogroup", { name: "Time slot" }).getByRole("radio").nth(6).click();
    await tenant.getByRole("button", { name: "Request visit" }).click();
    await expect(tenant.getByText(/visit requested/i).first()).toBeVisible();

    // Tenant waits on their visits page; owner confirms from theirs.
    await tenant.goto("/dashboard/visits?tab=pending");
    await expect(tenant.getByText(/requested/i).first()).toBeVisible();

    await owner.goto("/dashboard/visits");
    const card = owner.locator("article, li, div").filter({ hasText: tenantName }).filter({
      has: owner.getByRole("button", { name: "Confirm" }),
    });
    await card.last().getByRole("button", { name: "Confirm" }).click();
    await expect(owner.getByText(/confirmed/i).first()).toBeVisible();

    // The confirmation reaches the tenant as a live notification.
    await expect(tenant.getByText(/visit confirmed/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
