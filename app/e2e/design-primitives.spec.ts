import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test.describe(`shared primitives ${width}`, () => {
    test.use({ viewport: { width, height: 844 }, reducedMotion: "reduce", hasTouch: width === 390 });
    test("each accent exposes readable data and keyboard/touch controls", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/design");
      for (const name of ["Comprador", "Comercio", "Pool e inversores"]) {
        const section = page.getByRole("region", { name, exact: true });
        await expect(section.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
        const history = section.getByRole("list", { name: "Historial plegable · reglas por Tier" });
        await expect(history.locator("li:visible")).toHaveCount(3);
        const more = section.getByRole("button", { name: "Ver todas (4)" });
        await more.focus();
        await page.keyboard.press("Enter");
        await expect(history.locator("li:visible")).toHaveCount(4);
        await expect(section.getByRole("button", { name: "Ver menos" })).toHaveAttribute("aria-expanded", "true");
        await section.getByRole("button", { name: "Ver menos" }).click();
        await expect(history.locator("li:visible")).toHaveCount(3);
        const question = section.getByRole("button", { name: "¿Cómo se aplica el color?" });
        await question.focus();
        await page.keyboard.press("Space");
        await expect(question).toHaveAttribute("aria-expanded", "true");
        await expect(section.getByText("Cada página o sección elige su rol; todas las piezas heredan el mismo acento.")).toBeVisible();
        await question.click();
        const step = section.getByRole("button", { name: /Elegí/ });
        if (width === 390) await step.tap();
        else await step.click();
        await expect(step).toHaveAttribute("aria-pressed", "true");
        await expect(section.getByText("Compará las opciones y revisá las condiciones.")).toBeVisible();
        if (width === 390) await step.tap();
        else await step.click();
        await expect(step).toHaveAttribute("aria-pressed", "false");
        await expect(section.getByLabel("US$ 1.000,00", { exact: true })).toBeVisible();
        // Even when scrolled into view reduced motion keeps the final number still.
        await page.waitForTimeout(1000);
        await expect(section.getByLabel("US$ 1.000,00", { exact: true })).toHaveText(/1\.000,00/);
        const dimensions = await section.locator("button").evaluateAll(buttons => buttons.map(button => {
          const { width, height } = button.getBoundingClientRect();
          return { width, height };
        }));
        for (const dimensionsOfButton of dimensions) {
          expect(dimensionsOfButton.width).toBeGreaterThanOrEqual(40);
          expect(dimensionsOfButton.height).toBeGreaterThanOrEqual(40);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}

test("English copy is supplied by the consumer", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lazo.locale", "en"));
  await page.goto("/design");
  await expect(page.getByRole("heading", { name: "An accent for each role" })).toBeVisible();
  const buyer = page.getByRole("region", { name: "Buyer", exact: true });
  await buyer.getByRole("button", { name: "View all (4)" }).click();
  await expect(buyer.getByRole("button", { name: "View less" })).toHaveAttribute("aria-expanded", "true");
  await buyer.getByRole("button", { name: "How is the color applied?" }).click();
  await expect(buyer.getByText("Each page or section selects its role; every component inherits the same accent.")).toBeVisible();
});


test("count-up settles exactly while its accessible value stays stable", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-09T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-09T00:00:00Z"));
  await page.goto("/design");
  const number = page.getByRole("region", { name: "Comprador", exact: true }).getByLabel("US$ 1.000,00", { exact: true });
  await expect(number).toBeVisible();
  await page.clock.runFor(100);
  const intermediate = await number.innerText();
  await expect(number).toHaveAttribute("aria-label", "US$ 1.000,00");
  await page.clock.runFor(1200);
  await expect(number).toHaveText(/1\.000,00/);
  expect(intermediate).not.toEqual(await number.innerText());
});
