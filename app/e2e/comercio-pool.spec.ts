import { expect, test } from "@playwright/test";
import { DEMO_MERCHANT } from "../src/lib/cuotas/format";

// Ticket 04 · comercio y pool públicos.
// Corre con NEXT_PUBLIC_CUOTAS_MODE=mock (ver playwright.config.ts): la UI debe
// declarar lo simulado y nunca fabricar enlaces a exploradores de la cadena.
// Actualizado al marketplace del ticket de /comercio: el listado es el
// directorio demo; la vista pública por dirección sigue atendiendo
// direcciones fuera del directorio.

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

test("/comercio es el marketplace público: buscador, categorías y comercios demo", async ({
  page,
}) => {
  await page.goto("/comercio");
  await expect(page.getByTestId("marketplace")).toBeVisible();
  await expect(page.getByTestId("marketplace-q")).toBeVisible();
  await expect(
    page.getByRole("group", { name: /categoría|category/i }),
  ).toBeVisible();
  // El comercio sembrado se llama "Kroma" y declara datos de prueba.
  await expect(page.getByRole("link", { name: /Kroma/ })).toBeVisible();
  await expect(page.getByText(/comercios de ejemplo|example merchants/i)).toBeVisible();

  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});

test("/comercio: una dirección base58 en el buscador ofrece abrir la vista pública", async ({
  page,
}) => {
  await page.goto("/comercio");
  await page.getByTestId("marketplace-q").fill(DEMO_MERCHANT);
  // El buscador sincroniza ?q= a la URL con un debounce: esperamos a que
  // quede escrito para que el clic en el enlace no compita con ese cambio.
  await expect(page).toHaveURL(/\?q=/);
  await page
    .getByRole("link", { name: /ver por dirección|view by address/i })
    .click();
  await expect(page).toHaveURL(`/comercio/${DEMO_MERCHANT}`);
  await expect(page.getByTestId("merchant-profile")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /kroma/i }),
  ).toBeVisible();
});

test("/comercio/[direccion] de un comercio del directorio muestra su tienda con productos", async ({
  page,
}) => {
  await page.goto(`/comercio/${DEMO_MERCHANT}`);
  await expect(page.getByTestId("merchant-profile")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /kroma/i }),
  ).toBeVisible();
  // Los productos llevan al checkout; el comercio se declara demo.
  await expect(
    page.getByRole("link", { name: /pc de escritorio|desktop pc/i }),
  ).toHaveAttribute("href", "/checkout/pc");
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});

test("clic en Comercios abre el directorio y elegir un comercio muestra solo sus productos en el layout de tienda", async ({
  page,
}) => {
  await page.goto("/");
  // El header no tiene Tienda como sección primaria; tiene Comercios
  await expect(page.locator("header").getByRole("link", { name: /tienda|store/i })).toHaveCount(0);
  await page.locator("header").getByRole("link", { name: /comercios|merchants/i }).first().click();
  await expect(page).toHaveURL("/comercio");
  await expect(page.getByTestId("marketplace")).toBeVisible();

  // Elegir un comercio distinto a Kroma (Lumina Display)
  await page.getByRole("link", { name: /lumina display/i }).click();
  await expect(page).toHaveURL(/\/comercio\/AxPBA787ZnU8XVzySDAZPRd5uxRqnTrMHFodM1eGWpRv/);
  await expect(page.getByTestId("merchant-profile")).toBeVisible();
  await expect(page.getByRole("heading", { name: /lumina display/i })).toBeVisible();

  // Muestra solo sus productos (monitor, tablet) y NO los de Kroma (pc)
  await expect(page.getByRole("link", { name: /monitor/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /tablet/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /pc de escritorio|desktop pc/i })).toHaveCount(0);

  // El back link lleva de vuelta al directorio
  await page.getByRole("link", { name: /todos los comercios|all merchants/i }).first().click();
  await expect(page).toHaveURL("/comercio");
  await expect(page.getByTestId("marketplace")).toBeVisible();
});

test("/tienda redirige a la tienda del comercio demo (/comercio/[DEMO_MERCHANT])", async ({
  page,
}) => {
  await page.goto("/tienda");
  await expect(page).toHaveURL(`/comercio/${DEMO_MERCHANT}`);
  await expect(page.getByTestId("merchant-profile")).toBeVisible();
  await expect(page.getByRole("heading", { name: /kroma/i })).toBeVisible();
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

test("/app/comercio → clic en vista pública llega al perfil del directorio", async ({ page }) => {
  await page.goto("/app/comercio");
  await page.getByTestId("demo-option-merchant").click();
  await expect(page.getByTestId("comercio-datos")).toBeVisible();
  // El enlace "Vista pública de este comercio" apunta a /comercio/{fixture}: el
  // perfil del marketplace (la dirección está en el directorio demo).
  await page
    .getByRole("link", { name: /vista pública de este comercio|public view of this merchant/i })
    .click();
  await expect(page).toHaveURL(`/comercio/${DEMO_MERCHANT}`);
  await expect(page.getByTestId("merchant-profile")).toBeVisible();
  await expect(page.getByRole("heading", { name: /kroma/i })).toBeVisible();
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
});
