// Ticket 15 · cierre: a 390×844 ninguna ruta pública tiene scroll horizontal.
// Se afirma con `document.documentElement`: si `scrollWidth > clientWidth`
// algo desborda el viewport. `expect.poll` absorbe el ensanchado transitorio
// de la hidratación/fuentes y solo falla si el desborde persiste.
import { expect, test } from "@playwright/test";
import { DEMO_MERCHANT } from "../src/lib/cuotas/format";

const ROUTES = [
  "/",
  "/checkout/pc",
  "/comercio",
  `/comercio/${DEMO_MERCHANT}`,
  "/para-estudiantes",
  "/para-comercios",
  "/para-inversores",
  "/pool",
  "/app",
  "/app/estudiante",
  "/app/comercio",
  "/app/admin",
  "/account",
  "/design",
];

test.describe("responsive 390×844 — sin scroll horizontal", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    test(`${route} no excede el ancho del viewport`, async ({ page }) => {
      await page.goto(route);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
        )
        .toBeLessThanOrEqual(0);
    });
  }
});
