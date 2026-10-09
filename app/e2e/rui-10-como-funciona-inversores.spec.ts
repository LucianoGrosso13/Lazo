import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

for (const width of [390, 1440]) {
  test.describe(`Cómo funciona — inversores (${width}px)`, () => {
    test.use({
      viewport: { width, height: 844 },
      reducedMotion: "reduce",
      hasTouch: width === 390,
    });

    test("muestra bloques visuales, acento investor, acordeón accesible y sin scroll horizontal", async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto("/para-inversores");

      // 1. Acento de rol aplicado (data-role="investor")
      const shell = page.locator('[data-role="investor"]').first();
      await expect(shell).toBeVisible();
      expect(await shell.evaluate(el => getComputedStyle(el).getPropertyValue("--accent").trim())).toBe("#19fb9b");

      // 2. Hero con gráfico / ilustración del ecosistema
      const heroIllustration = page.getByRole("img", {
        name: "Flujo de fondos del pool",
      });
      await expect(heroIllustration).toBeVisible();

      // 3. Pool ahora: BigNumber y Gauge de utilización
      await expect(page.getByText("NAV — valor neto del pool")).toBeVisible();
      const meter = page.getByRole("meter", { name: "Utilización" });
      await expect(meter).toBeVisible();

      // 4. Rendimiento: BigNumber con count-up y ComparisonBars
      await expect(
        page.getByRole("heading", {
          name: "Rendimiento objetivo del tramo senior",
        }),
      ).toBeVisible();
      await expect(page.getByText("Objetivo de modelo senior")).toBeVisible();
      const bars = page.getByRole("list", {
        name: "Comparativa de rendimientos en Solana",
      });
      await expect(bars).toBeVisible();
      await expect(bars.locator("li")).toHaveCount(3);

      // 5. Pasos con AnimatedSteps
      const steps = page.getByRole("list", {
        name: "Flujo de fondos de una compra paso a paso",
      });
      await expect(steps).toBeVisible();
      const stepButtons = steps.locator("button");
      await expect(stepButtons).toHaveCount(4);
      expect(await steps.locator("li").first().evaluate(el => getComputedStyle(el).animationName)).toBe("none");
      await expect(page.getByRole("group", { name: "8 % anual", exact: true })).toBeVisible();
      const evidence = path.resolve("../.scratch/rediseno-ui/evidence");
      await mkdir(evidence, { recursive: true });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(evidence, `10-inversores-${width}.png`), fullPage: true });

      // Interacción con paso: tap o click
      const firstStep = stepButtons.first();
      await expect(firstStep).toHaveAttribute("aria-pressed", "false");
      if (width === 390) {
        await firstStep.tap();
      } else {
        await firstStep.click();
      }
      await expect(firstStep).toHaveAttribute("aria-pressed", "true");

      // 6. FAQ con Accordion accesible
      await expect(
        page.getByRole("heading", { name: "Preguntas frecuentes" }),
      ).toBeVisible();
      const accordion = page.getByRole("group", {
        name: "Preguntas frecuentes",
      });
      await expect(accordion).toBeVisible();

      const firstFaqBtn = accordion.getByRole("button", {
        name: "¿De dónde sale el rendimiento del pool?",
      });
      await expect(firstFaqBtn).toBeVisible();
      await expect(firstFaqBtn).toHaveAttribute("aria-expanded", "false");

      // Abrir pregunta
      await firstFaqBtn.click();
      await expect(firstFaqBtn).toHaveAttribute("aria-expanded", "true");
      await firstFaqBtn.focus();
      await page.keyboard.press("Enter");
      await expect(firstFaqBtn).toHaveAttribute("aria-expanded", "false");
      await page.keyboard.press("Enter");
      await expect(firstFaqBtn).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.getByText(
          "De la comisión que paga el comercio sobre lo financiado y del interés de los planes con interés.",
        ),
      ).toBeVisible();

      // 7. Tap targets >= 40x40 px en elementos interactivos
      const buttons = await shell.locator("button, a").evaluateAll((elements) =>
        elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
      for (const btn of buttons) {
        if (btn.width > 0 && btn.height > 0) {
          expect(btn.width).toBeGreaterThanOrEqual(40);
          expect(btn.height).toBeGreaterThanOrEqual(40);
        }
      }

      // 8. Sin scroll horizontal
      const noOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      );
      expect(noOverflow).toBe(true);

      expect(errors).toEqual([]);
    });
  });
}

test("Inglés: carga los textos traducidos del consumidor en /para-inversores", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("lazo.locale", "en"));
  await page.goto("/para-inversores");

  await expect(
    page.getByRole("heading", {
      name: "How Lazo works for investors",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("img", { name: "Pool fund flow" }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Senior tranche target yield" }),
  ).toBeVisible();

  await expect(page.getByRole("group", { name: "8 % per year", exact: true })).toBeVisible();
  await expect(page.getByText("Priority repayment", { exact: true })).toBeVisible();
  const faqGroup = page.getByRole("group", {
    name: "Frequently asked questions",
  });
  await expect(faqGroup).toBeVisible();

  const question = faqGroup.getByRole("button", {
    name: "Where does the pool's yield come from?",
  });
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
});
