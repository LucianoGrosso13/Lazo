import { expect, test } from "@playwright/test";

test("home copy is current in Spanish and English", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Quiénes somos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Probalo en 2 minutos" })).toBeVisible();
  await expect(page.getByText(/provisional|escalón/i)).toHaveCount(0);

  await page.evaluate(() => window.localStorage.setItem("lazo.locale", "en"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "About us" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Try it in 2 minutes" })).toBeVisible();
  await expect(page.getByText(/provisional|escalón|step ladder/i)).toHaveCount(0);
});
