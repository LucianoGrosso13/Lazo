import { expect, test } from "@playwright/test";

test.describe("reduced motion hydration", () => {
  test.use({ reducedMotion: "reduce" });
  test("landing hydrates without page errors and shows the static brand", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("#lazo-price")).toBeVisible();
    await expect(page.locator("footer img[src*='logo-prisma']").first()).toBeVisible();
    await expect(page.locator("footer video")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

for (const locale of ["en", "es"] as const) {
  test(`rapid slider updates one exact visible amount (${locale})`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("lazo.locale", value), locale);
    await page.goto("/", { waitUntil: "networkidle" });
    const slider = page.locator("#lazo-price");
    await page.getByRole("button", { name: /PC\s+1,000|PC\s+1\.000/i }).click();
    await expect(slider).toHaveValue("1000");
    await expect(slider).toBeVisible();
    const values = Array.from({ length: 40 }, (_, i) => 120 + ((i * 17) % 139) * 10);
    for (const value of values) {
      const { text, visibleSpans, totalSpans } = await page.evaluate(async (next) => {
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
        return {
          text: spans.map((span) => span.innerText).join(""),
          visibleSpans: spans.length,
          totalSpans: output.querySelectorAll("span").length,
        };
      }, value);
      expect(visibleSpans).toBe(1);
      expect(totalSpans).toBe(1);
      expect(Number(text.replace(/[^0-9]/g, ""))).toBe(value);
      expect(text).toBe(new Intl.NumberFormat(locale === "en" ? "en-US" : "es-AR", { maximumFractionDigits: 0 }).format(value));
    }
  });
}

const timeline = "section[aria-labelledby='guarantor-title']";

test("guarantor timeline markers are keyboard buttons with selected state", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const markers = page.locator(`${timeline} button[data-kind]`);
  await expect(markers).toHaveCount(6);
  await markers.nth(2).focus();
  await page.keyboard.press("Enter");
  await expect(markers.nth(2)).toHaveAttribute("aria-pressed", "true");
  // Un solo hito activo a la vez, declarado con data-active.
  await expect(markers.nth(2)).toHaveAttribute("data-active", "true");
  await expect(page.locator(`${timeline} button[data-active='true']`)).toHaveCount(1);
});

test("the late-payment timeline advances on its own and stops when a milestone is tapped", async ({ page }) => {
  // fastForward salta el reloj sin dibujar cada frame del prisma 3D.
  test.setTimeout(90_000);
  await page.clock.install();
  await page.goto("/", { waitUntil: "networkidle" });
  const markers = page.locator(`${timeline} button[data-kind]`);
  // scrollIntoView directo: el reloj falso congela la espera de estabilidad.
  await markers.nth(0).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.mouse.move(0, 0);
  await expect(markers.nth(0)).toHaveAttribute("aria-pressed", "true");
  await page.clock.fastForward(2600);
  await expect(markers.nth(1)).toHaveAttribute("aria-pressed", "true");
  await page.clock.fastForward(2600);
  await expect(markers.nth(2)).toHaveAttribute("aria-pressed", "true");
  // Tocar un hito lo selecciona y detiene la línea.
  await markers.nth(4).click({ force: true });
  await page.mouse.move(0, 0);
  await page.clock.fastForward(2600);
  await page.clock.fastForward(2600);
  await page.clock.fastForward(2600);
  await expect(markers.nth(4)).toHaveAttribute("aria-pressed", "true");
  // Reproducir la retoma.
  await page.getByRole("button", { name: /reproducir la línea|play the late-payment/i }).click({ force: true });
  await page.mouse.move(0, 0);
  await page.clock.fastForward(2600);
  await expect(markers.nth(5)).toHaveAttribute("aria-pressed", "true");
});

test.describe("late-payment timeline with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("stays still with every milestone visible", async ({ page }) => {
    await page.clock.install();
    await page.goto("/", { waitUntil: "networkidle" });
    const markers = page.locator(`${timeline} button[data-kind]`);
    await markers.nth(0).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(markers.nth(0)).toHaveAttribute("aria-pressed", "true");
    await page.clock.fastForward(2600);
    await page.clock.fastForward(2600);
    await page.clock.fastForward(2600);
    await expect(markers.nth(0)).toHaveAttribute("aria-pressed", "true");
    for (let i = 0; i < 6; i++) await expect(markers.nth(i)).toBeVisible();
  });
});

test("cost comparison shows big rates and total-cost bars with the reference label", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lazo.locale", "es"));
  await page.goto("/", { waitUntil: "networkidle" });
  const section = page.locator("section[aria-labelledby='comparison-title']");
  const bars = section.getByRole("list", { name: "Costo total en US$ de la compra de referencia" });
  await bars.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(bars.getByRole("listitem")).toHaveCount(4);
  await expect(bars).toContainText("US$ 1.000");
  await expect(bars).toContainText(/CFTEA 76%/);
  await expect(section.getByText("referencia").first()).toBeVisible();
  await expect(section.getByText(/Fuente:/)).toBeVisible();
});

test("Lazo numbers compare merchant fees and pool yield in bars", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lazo.locale", "es"));
  await page.goto("/", { waitUntil: "networkidle" });
  const section = page.locator("section[aria-labelledby='benefits-title']");
  const fees = section.getByRole("list", { name: "Comisión del comercio sobre lo financiado" });
  await fees.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(fees.getByRole("listitem")).toHaveCount(6);
  await expect(fees).toContainText("Billeteras");
  const pool = section.getByRole("list", { name: /Rendimiento anual del pool/ });
  await expect(pool).toContainText("Kamino");
  await expect(pool).toContainText("Jupiter");
});
