import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const) {
  test(`rapid slider updates one exact visible amount (${locale})`, async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate((value) => localStorage.setItem("lazo.locale", value), locale);
    await page.reload();
    const slider = page.locator("#lazo-price");
    const output = page.locator("output[for='lazo-price'] span");
    await expect(slider).toBeVisible();
    for (const value of [120, 290, 1380, 570]) {
      await slider.focus();
      await slider.press("Home");
      const steps = (value - 120) / 10;
      for (let i = 0; i < steps; i += 1) await slider.press("ArrowRight");
      await expect(slider).toHaveValue(String(value));
      await expect(output).toHaveCount(1);
      await expect(output).toHaveText(new Intl.NumberFormat(locale === "en" ? "en-US" : "es-AR", { maximumFractionDigits: 0 }).format(value));
    }
  });
}

test("guarantor timeline markers are keyboard buttons with selected state", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const markers = page.locator("section[aria-labelledby='guarantor-title'] .rulerTrack button.mark");
  await expect(markers).toHaveCount(4);
  await expect(markers.nth(0)).toHaveAttribute("aria-pressed", "true");
  await markers.nth(1).focus();
  await expect(markers.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-slot='motion-highlight']")).toHaveCount(1);
});
