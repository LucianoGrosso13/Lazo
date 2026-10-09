import { expect, test } from "@playwright/test";
import path from "node:path";

import fs from "node:fs";

const EVIDENCE_DIR = path.resolve(process.cwd(), "../.scratch/rediseno-ui/evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

for (const width of [390, 1440]) {
  test.describe(`para-estudiantes ${width}px`, () => {
    test.use({
      viewport: { width, height: width === 390 ? 844 : 900 },
      hasTouch: width === 390,
    });

    test("renders buyer accent, visual primitives, and interactive elements", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      await page.goto("/para-estudiantes");

      // Verify buyer data-role
      const buyerRoot = page.locator('[data-role="buyer"]').first();
      await expect(buyerRoot).toBeVisible();

      // Verify Hero graphic
      await expect(page.getByText("Así se ve tu plan")).toBeVisible();
      await expect(page.getByText("Tu garante respalda")).toBeVisible();
      await expect(page.getByRole("img", { name: "Calendario de pagos de la compra de ejemplo" })).toBeVisible();

      // Verify coverage BigNumber (from config) and late-payment timeline
      await expect(page.getByText("Lo que cubre tu garante")).toBeVisible();
      await expect(page.getByText("Cobro al garante y baja de Tier")).toBeVisible();

      // Verify AnimatedSteps
      const stepButton = page.getByRole("button", { name: /Elegí el comercio y el producto/ });
      await expect(stepButton).toBeVisible();
      if (width === 390) {
        await stepButton.tap();
      } else {
        await stepButton.click();
      }
      await expect(stepButton).toHaveAttribute("aria-pressed", "true");

      // Verify BigNumber
      await expect(page.getByText("Compra de ejemplo", { exact: true })).toBeVisible();
      await expect(page.getByLabel("US$ 1.000,00", { exact: true })).toBeVisible();

      // Verify ComparisonBars
      const comparison = page.getByRole("list", { name: "Anticipo requerido por Tier" });
      await expect(comparison).toBeVisible();

      // Verify Accordion
      const faqQuestion = page.getByRole("button", { name: "¿Necesito tarjeta de crédito?" });
      await expect(faqQuestion).toBeVisible();
      await expect(faqQuestion).toHaveAttribute("aria-expanded", "false");
      if (width === 390) {
        await faqQuestion.tap();
      } else {
        await faqQuestion.click();
      }
      await expect(faqQuestion).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.getByText("La tarjeta la registra tu garante obligatorio"),
      ).toBeVisible();

      // Verify no horizontal overflow
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      expect(errors).toEqual([]);

      // Save screenshot evidence once every entrance (count-up included) settled
      const height = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < height; y += 600) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(150);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `08-para-estudiantes-${width}.png`),
        fullPage: true,
      });
    });
  });
}

test("renders English copy correctly", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lazo.locale", "en"));
  await page.goto("/para-estudiantes");

  await expect(
    page.getByRole("heading", { name: "Installments for your studies, backed by your family" }),
  ).toBeVisible();
  await expect(page.getByText("What your plan looks like")).toBeVisible();
  await expect(page.getByRole("button", { name: /Pick the merchant and the product/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Do I need a credit card?" })).toBeVisible();
});
