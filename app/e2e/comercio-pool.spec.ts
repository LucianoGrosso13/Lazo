import { expect, test } from "@playwright/test";
import { DEMO_MERCHANT } from "../src/lib/cuotas/format";

// Ticket 04 · comercio y pool públicos.
// Corre con NEXT_PUBLIC_CUOTAS_MODE=mock (ver playwright.config.ts): la UI debe
// declarar lo simulado y nunca fabricar enlaces a exploradores de la cadena.

const EXPLORER_LINKS =
  'a[href*="explorer.solana.com"], a[href*="solana.fm"], a[href*="solscan.io"], a[href*="solanafm"]';

test("/pool es público: muestra el panel sin exigir wallet", async ({ page }) => {
  await page.goto("/pool");
  await expect(page.getByRole("heading", { name: /pool/i }).first()).toBeVisible();
  // Estructura del pool visible: tramos y movimientos (mock sembrado).
  await expect(page.getByTestId("pool-panel")).toBeVisible();
  await expect(page.getByTestId("pool-datos")).toBeVisible();
  await expect(page.getByTestId("mode-badge")).toBeVisible();
  // Nunca se pide conectar wallet para leer el pool.
  await expect(page.getByText(/conect(á|a|ar) (tu )?wallet para/i)).toHaveCount(0);
});

test("/pool en modo mock no enlaza exploradores ni firma evidencia falsa", async ({ page }) => {
  await page.goto("/pool");
  await expect(page.getByTestId("pool-panel")).toBeVisible();
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
  // Las referencias de rendimiento se rotulan como tales, sin promesa de garantía.
  await expect(page.getByText(/referencia/i).first()).toBeVisible();
});

test("/comercio es público: vista del comercio demo y buscador por dirección", async ({ page }) => {
  await page.goto("/comercio");
  await expect(page.getByTestId("comercio-panel")).toBeVisible();
  await expect(page.getByTestId("mode-badge")).toBeVisible();
  // Buscador público por dirección + enlace al checkout integrable.
  await expect(page.getByTestId("comercio-buscar-input")).toBeVisible();
  await expect(page.getByTestId("comercio-checkout-link")).toBeVisible();
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});

test("/comercio: el buscador lleva a la vista pública del comercio (fixture exacta)", async ({
  page,
}) => {
  await page.goto("/comercio");
  await page.getByTestId("comercio-buscar-input").fill(DEMO_MERCHANT);
  await page.getByRole("button", { name: /ver comercio|view merchant/i }).click();
  await expect(page).toHaveURL(`/comercio/${DEMO_MERCHANT}`);
  await expect(page.getByTestId("comercio-datos")).toBeVisible();
  await expect(page.getByText(/voltia/i).first()).toBeVisible();
});

test("/comercio/[direccion] muestra el comercio demo registrado", async ({ page }) => {
  await page.goto(`/comercio/${DEMO_MERCHANT}`);
  await expect(page.getByTestId("comercio-panel")).toBeVisible();
  await expect(page.getByTestId("comercio-datos")).toBeVisible();
  // El comercio sembrado se llama "Voltia" y declara datos de prueba.
  await expect(page.getByText(/voltia/i).first()).toBeVisible();
  // En mock las firmas se declaran simuladas: no hay links a Explorer.
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});

test("/comercio/[direccion] rechaza direcciones inválidas sin pedir wallet", async ({ page }) => {
  await page.goto("/comercio/no-es-una-direccion!!!");
  await expect(page.getByTestId("comercio-direccion-invalida")).toBeVisible();
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});

test("/comercio/[direccion] con un comercio inexistente muestra estado honesto", async ({
  page,
}) => {
  // Dirección base58 válida pero sin cuenta de comercio registrada en el mock.
  const otra = "11111111111111111111111111111111";
  await page.goto(`/comercio/${otra}`);
  await expect(page.getByTestId("comercio-panel")).toBeVisible();
  await expect(page.getByText(/no registrado|not registered|pendiente/i).first()).toBeVisible();
});

test("/app/comercio sin identidad pide entrada y no muestra datos ajenos", async ({ page }) => {
  await page.goto("/app/comercio");
  // Sin wallet ni selección demo: estado de entrada honesto, no el panel.
  await expect(page.getByTestId("comercio-entrada")).toBeVisible();
  await expect(page.getByTestId("comercio-datos")).toHaveCount(0);
});

test("/app/comercio con la selección demo merchant abre su cuenta", async ({ page }) => {
  await page.goto("/app/comercio");
  await page.getByTestId("demo-option-merchant").click();
  await expect(page.getByTestId("comercio-panel")).toBeVisible();
  await expect(page.getByTestId("comercio-datos")).toBeVisible();
  // La misma lectura declara la evidencia simulada: sin links a Explorer.
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});

test("/app/comercio → clic en vista pública llega a /comercio con la fixture", async ({ page }) => {
  await page.goto("/app/comercio");
  await page.getByTestId("demo-option-merchant").click();
  await expect(page.getByTestId("comercio-datos")).toBeVisible();
  // El enlace "Vista pública de este comercio" apunta a /comercio/{fixture exacta}.
  await page
    .getByRole("link", { name: /vista pública de este comercio|public view of this merchant/i })
    .click();
  await expect(page).toHaveURL(`/comercio/${DEMO_MERCHANT}`);
  await expect(page.getByTestId("comercio-datos")).toBeVisible();
  await expect(page.getByText(/voltia/i).first()).toBeVisible();
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});
