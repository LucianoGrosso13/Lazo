// Ticket 03 · fiador: invitación, alta y seguimiento por rutas públicas.
// Corre con NEXT_PUBLIC_CUOTAS_MODE=mock (ver playwright.config.ts).
import { expect, test } from "@playwright/test";

const EXPLORER_LINKS =
  'a[href*="explorer.solana.com"], a[href*="solana.fm"], a[href*="solscan.io"], a[href*="solanafm"]';

test("un token inválido muestra estado honesto sin exponer información", async ({
  page,
}) => {
  await page.goto("/fiador/token-que-no-existe-123");

  // Estado inválido declarado; el fiador no ve datos del estudiante.
  await expect(page.getByTestId("fiador-invalido")).toBeVisible();
  await expect(page.getByTestId("fiador-alta")).toHaveCount(0);
  await expect(page.getByTestId("fiador-panel")).toHaveCount(0);
  // Nada de evidencia onchain fabricada ni pedido de wallet.
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});

test("una invitación válida abre el alta sin wallet", async ({ page }) => {
  // Camino público: demo "garante" en /app genera la invitación; el enlace
  // abre el alta paso a paso sin conectar wallet.
  await page.goto("/app");
  await page.getByTestId("demo-option-guarantor").click();
  const link = page.getByTestId("guarantor-invite");
  await expect(link).toBeVisible();
  await link.click();

  await expect(page).toHaveURL(/\/fiador\/.+/);
  await expect(page.getByTestId("fiador-alta")).toBeVisible();
  await expect(page.getByTestId("fiador-invalido")).toHaveCount(0);
  await expect(page.getByTestId("fiador-panel")).toHaveCount(0);
});

test("el alta llega a confirmar y queda bloqueada sin máximo definido", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByTestId("demo-option-guarantor").click();
  const link = page.getByTestId("guarantor-invite");
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  await link.click();

  // Alta paso a paso: resumen → identidad → documento → tarjeta → confirmar.
  const continuar = page.getByRole("button", { name: "Continuar" });
  await continuar.click(); // resumen → identidad
  await page.getByLabel(/nombre/i).fill("Garante de ejemplo");
  await continuar.click(); // identidad → documento (hash sha-256 en pantalla)
  await continuar.click(); // documento → tarjeta de ejemplo
  await continuar.click(); // tarjeta → confirmar

  // Q1 pendiente: sin fórmula del máximo no se registra una fianza con
  // número inventado. El botón queda deshabilitado y el bloqueo declarado.
  await expect(page.getByTestId("fiador-q1-bloqueado")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aceptar y registrar" }),
  ).toBeDisabled();
  await expect(page.getByTestId("fiador-panel")).toHaveCount(0);

  // El mismo enlace recargado vuelve al alta (la invitación sigue activa).
  await page.goto(href!);
  await expect(page.getByTestId("fiador-alta")).toBeVisible();
  await expect(page.getByTestId("fiador-panel")).toHaveCount(0);
  await expect(page.getByTestId("fiador-invalido")).toHaveCount(0);

  // Nada de evidencia onchain fabricada.
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});
