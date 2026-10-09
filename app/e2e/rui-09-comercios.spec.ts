// Ticket 09 · /para-comercios: acento de rol merchant, figura de cobros en
// el hero, count-up con valor accesible y FAQ en acordeón (aria-expanded,
// panel oculto fuera del árbol cuando está cerrado). Corre a 390 y 1440.
import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test.describe(`para-comercios ${width}`, () => {
    test.use({ viewport: { width, height: 844 }, reducedMotion: "reduce", hasTouch: width === 390 });
    test("acento merchant, bloques visuales y acordeón accesible", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/para-comercios");
      await expect(page.locator("[data-role='merchant']")).toBeVisible();

      // Figura del hero: un carril por plazo de cobro habilitado.
      const figure = page.locator("figure");
      await expect(figure.getByText("Una venta de US$ 1.000", { exact: false })).toBeVisible();
      await expect(figure.locator("ul li")).toHaveCount(4);

      // Número grande con count-up: el aria-label queda estable en el neto real.
      await expect(page.getByLabel("US$ 951,00", { exact: true })).toBeVisible();

      // FAQ: cerrado el panel está `hidden` (fuera del árbol accesible).
      const question = page.getByRole("button", { name: "¿Cuándo cobro una venta?" });
      await expect(question).toHaveAttribute("aria-expanded", "false");
      const answer = page.getByText("El anticipo entra al instante al confirmar la venta");
      await expect(answer).toBeHidden();
      await question.focus();
      await page.keyboard.press("Enter");
      await expect(question).toHaveAttribute("aria-expanded", "true");
      await expect(answer).toBeVisible();
      if (width === 390) await question.tap();
      else await question.click();
      await expect(question).toHaveAttribute("aria-expanded", "false");
      await expect(answer).toBeHidden();

      // Objetivos táctiles: todo botón de la página alcanza 40×40.
      const dimensions = await page.locator("[data-role='merchant'] button").evaluateAll(buttons =>
        buttons.map(button => {
          const rect = button.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
      for (const size of dimensions) {
        expect(size.width).toBeGreaterThanOrEqual(40);
        expect(size.height).toBeGreaterThanOrEqual(40);
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}

test("para-comercios rinde en inglés con el acordeón accesible", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lazo.locale", "en"));
  await page.goto("/para-comercios");
  await expect(page.locator("[data-role='merchant']")).toBeVisible();
  const question = page.getByRole("button", { name: "When do I get paid for a sale?" });
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("The down payment lands instantly at checkout")).toBeVisible();
});
