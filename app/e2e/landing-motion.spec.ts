import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const) {
  test(`rapid slider updates one exact visible amount (${locale})`, async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate((value) => localStorage.setItem("lazo.locale", value), locale);
    await page.reload();
    const slider = page.locator("#lazo-price");
    await page.getByRole("button", { name: /PC\s+1,000|PC\s+1\.000/i }).click();
    await expect(slider).toHaveValue("1000");
    await expect(slider).toBeVisible();
    const values = Array.from({ length: 40 }, (_, i) => 120 + ((i * 17) % 139) * 10);
    for (const value of values) {
      const { text, visibleSpans } = await page.evaluate(async (next) => {
        const input = document.querySelector<HTMLInputElement>("#lazo-price")!;
        const output = document.querySelector<HTMLOutputElement>("output[for='lazo-price']")!;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(next));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const spans = [...output.querySelectorAll("span")].filter((span) => {
          const style = getComputedStyle(span);
          const rect = span.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.05 && rect.width > 0 && rect.height > 0;
        });
        return { text: spans.map((span) => span.innerText).join(""), visibleSpans: spans.length };
      }, value);
      expect(visibleSpans).toBe(1);
      expect(Number(text.replace(/[^0-9]/g, ""))).toBe(value);
      await expect(page.locator("output[for='lazo-price'] span")).toHaveCount(1);
      await expect(page.locator("output[for='lazo-price'] span")).toHaveText(new Intl.NumberFormat(locale === "en" ? "en-US" : "es-AR", { maximumFractionDigits: 0 }).format(value));
    }
  });
}

test("guarantor timeline markers are keyboard buttons with selected state", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const markers = page.locator("section[aria-labelledby='guarantor-title'] button[data-kind]");
  await expect(markers).toHaveCount(4);
  await expect(markers.nth(0)).toHaveAttribute("aria-pressed", "true");
  await markers.nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(markers.nth(1)).toHaveAttribute("aria-pressed", "true");
  // El estado seleccionado se declara con data-active (las primitivas
  // animate-ui/Highlight se retiraron en el checkpoint UX/UI): un solo
  // marcador queda activo a la vez.
  await expect(markers.nth(1)).toHaveAttribute("data-active", "true");
  await expect(
    page.locator(
      "section[aria-labelledby='guarantor-title'] button[data-active='true']",
    ),
  ).toHaveCount(1);
});
