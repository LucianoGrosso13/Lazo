// Frontera de entrada /app por rutas públicas (ver `.scratch/app-cuentas/spec.md`).
// Corre contra el harness del coordinador (`npm run test:e2e`, puerto 3012, mock).
// La variante real se habilita con `PW_CUOTAS_MODE=real` cuando el webServer
// pueda levantarse con `NEXT_PUBLIC_CUOTAS_MODE=real`.
import { expect, test } from "@playwright/test";

const MODE = process.env.PW_CUOTAS_MODE ?? "mock";

test.describe("entrada /app — modo mock", () => {
  test.skip(MODE !== "mock", "esta describe corre con el servidor en modo mock");

  test("muestra entrada, devnet explicado, selector demo y enlaces públicos", async ({
    page,
  }) => {
    await page.goto("/app");

    // Devnet declarado y explicado.
    await expect(page.getByTestId("devnet-badge")).toBeVisible();
    await expect(page.getByTestId("devnet-explainer")).toContainText(/devnet/i);

    // Explicación breve de wallet para usuarias nuevas.
    await expect(page.getByTestId("wallet-explainer")).toContainText(/wallet/i);

    // Selector de cuentas demo solo en mock.
    await expect(page.getByTestId("demo-selector")).toBeVisible();

    // Enlaces públicos sin exigir wallet.
    await expect(page.getByTestId("public-pool")).toHaveAttribute("href", "/pool");
    await expect(page.getByTestId("public-comercio")).toHaveAttribute("href", "/comercio");

    // En mock no hay links a Explorer aunque haya datos.
    await expect(page.locator('a[href*="explorer.solana.com"]')).toHaveCount(0);
  });

  test("seleccionar un rol navega a su cuenta en un click y persiste", async ({ page }) => {
    await page.goto("/app");

    // Un click en el selector cambia la identidad y navega a su cuenta.
    await page.getByTestId("demo-option-merchant").click();
    await expect(page).toHaveURL(/\/app\/comercio$/);

    // Persistido: volver a la entrada redirige a la misma cuenta.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app\/comercio$/);

    // Cambiar de rol también navega directo. Se limpia la selección persistida
    // para poder entrar a /app (las rutas destino las aterrizan owners 03/04).
    const clearDemo = () =>
      page.evaluate(() => window.localStorage.removeItem("lazo.cuenta.demo.v1"));
    await clearDemo();
    await page.goto("/app");
    await expect(page.getByTestId("demo-selector")).toBeVisible();
    await page.getByTestId("demo-option-admin").click();
    await expect(page).toHaveURL(/\/app\/admin$/);

    await clearDemo();
    await page.goto("/app");
    await page.getByTestId("demo-option-student-tier3").click();
    await expect(page).toHaveURL(/\/app\/estudiante$/);
  });

  test("la opción fiador genera un enlace de invitación sin wallet", async ({ page }) => {
    await page.goto("/app");
    await page.getByTestId("demo-option-guarantor").click();
    await expect(page).toHaveURL(/\/app$/);
    const link = page.getByTestId("guarantor-invite");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/fiador\/.+/);
  });
});

test.describe("entrada /app — modo real", () => {
  test.skip(MODE !== "real", "requiere el harness con NEXT_PUBLIC_CUOTAS_MODE=real");

  test("no muestra selector demo ni datos de ejemplo", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByTestId("demo-selector")).toHaveCount(0);
    await expect(page.getByTestId("devnet-badge")).toBeVisible();
  });
});
