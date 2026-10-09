import { expect, test } from "@playwright/test";

// Ticket 05 · cuenta admin y mora con reloj demo.
// Frontera: rutas públicas en navegador contra el harness del coordinador
// (`npm run test:e2e`, puerto 3012, NEXT_PUBLIC_CUOTAS_MODE=mock). La variante
// real se habilita con PW_CUOTAS_MODE=real cuando exista un servidor real.
//
// Las identidades de ejemplo se siembran con la misma persistencia que usa el
// selector (`lazo.cuenta.demo.v1`): es el estado que deja haber elegido un rol,
// no un reemplazo de la lógica — la autorización la sigue ejerciendo
// `getAccountCuotas()` contra la autoridad configurada.

const MODE = process.env.PW_CUOTAS_MODE ?? "mock";

const EXPLORER_LINKS =
  'a[href*="explorer.solana.com"], a[href*="solana.fm"], a[href*="solscan.io"], a[href*="solanafm"]';

async function comoDemo(page: import("@playwright/test").Page, id: string) {
  await page.addInitScript((demoId) => {
    window.localStorage.setItem("lazo.cuenta.demo.v1", demoId);
  }, id);
}

test.describe("admin /app/admin — modo mock", () => {
  test.skip(MODE !== "mock", "esta describe corre con el servidor en modo mock");

  test("un estudiante en la URL admin no ve controles ni datos del panel", async ({
    page,
  }) => {
    await comoDemo(page, "student-tier3");
    await page.goto("/app/admin");

    // Se declara el acceso denegado: sin controles de mutación ni de reloj,
    // y sin revelar snapshot, bitácora ni comercios al actor sin autoridad.
    await expect(page.getByTestId("admin-denied")).toBeVisible();
    await expect(page.getByTestId("admin-panel")).toHaveCount(0);
    await expect(page.getByTestId("admin-confirmar")).toHaveCount(0);
    await expect(page.getByTestId("admin-reloj")).toHaveCount(0);
    await expect(page.getByTestId("admin-bitacora")).toHaveCount(0);
    await expect(page.getByTestId("admin-pool")).toHaveCount(0);
    await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
  });

test("la identidad admin ve el panel: estado, Tiers, pool, mora, bitácora y comercios", async ({
    page,
  }) => {
    // El selector navega a la cuenta del rol elegido.
    await page.goto("/app");
    await page.getByTestId("demo-option-admin").click();
    await expect(page).toHaveURL(/\/app\/admin/);

    await expect(page.getByTestId("admin-panel")).toBeVisible();
    // La autoridad se declara (fixture simulado mientras la config no la traiga).
    await expect(page.getByTestId("admin-autoridad")).toBeVisible();
    // Estado del protocolo con su control de cambio.
    await expect(page.getByTestId("admin-estado-actual")).toContainText(/normal/i);
    // Tiers y reglas de mora, solo lectura desde la config.
    await expect(page.getByTestId("admin-escalones")).toBeVisible();
    await expect(page.getByTestId("admin-escalones")).toContainText(/Tier 1 · Starter/i);
    // Pool: NAV, tramos, utilización y crédito.
    await expect(page.getByTestId("admin-pool")).toBeVisible();
    await expect(page.getByTestId("admin-pool-nav")).toBeVisible();
    await expect(page.getByTestId("admin-pool")).toContainText(/junior/i);
    await expect(page.getByTestId("admin-pool")).toContainText(/senior/i);
    // Mora: la línea del keeper sale de la config, no de texto fijo.
    await expect(page.getByTestId("admin-mora")).toBeVisible();
    // Bitácora del keeper y comercios.
    await expect(page.getByTestId("admin-bitacora")).toBeVisible();
    await expect(page.getByTestId("admin-comercios")).toBeVisible();
    // Sin rótulos de simulación en la cuenta; jamás un link a Explorer con firmas falsas.
    await expect(page.locator("main").getByText(/datos simulados|simulated data/i).filter({ visible: true })).toHaveCount(0);
    await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);
  });

  test("el cambio de estado pasa por revisión: cancelar no muta y confirmar sin hook declara pendiente", async ({
    page,
  }) => {
    await page.goto("/app");
    await page.getByTestId("demo-option-admin").click();
    await expect(page.getByTestId("admin-panel")).toBeVisible();
    const actual = page.getByTestId("admin-estado-actual");
    await expect(actual).toContainText(/normal/i);

    // Elegir "En pausa" abre la revisión inline con el detalle del cambio.
    await page.getByTestId("admin-estado-op-halted").click();
    await page.getByTestId("admin-estado-revisar").click();
    await expect(page.getByTestId("admin-revision")).toBeVisible();
    await expect(page.getByTestId("admin-revision")).toContainText(/pausa/i);

    // Cancelar no ejecuta nada: sin resultado, sin error, estado intacto.
    await page.getByTestId("admin-cancelar").click();
    await expect(page.getByTestId("admin-revision")).toHaveCount(0);
    await expect(page.getByTestId("admin-mutacion-error")).toHaveCount(0);
    await expect(page.getByTestId("admin-resultado")).toHaveCount(0);
    await expect(actual).toContainText(/normal/i);

    // La selección quedó en "En pausa": se puede reabrir la revisión y
    // confirmar. Sin el hook del owner A la API ejecutora rechaza con
    // not_implemented y la UI lo declara — jamás un éxito falso.
    await page.getByTestId("admin-estado-revisar").click();
    await page.getByTestId("admin-confirmar").click();
    const fallo = page.getByTestId("admin-mutacion-error");
    await expect(fallo).toBeVisible();
    await expect(fallo).toContainText(/pendiente|hook|todav/i);
    await expect(actual).toContainText(/normal/i);
  });

  test("registrar un comercio revisa owner y nombre: cancelar no muta y confirmar sin hook declara pendiente", async ({
    page,
  }) => {
    await page.goto("/app");
    await page.getByTestId("demo-option-admin").click();
    await expect(page.getByTestId("admin-panel")).toBeVisible();
    const comercios = page.getByTestId("admin-comercios");

    // Una dirección que no es base58 se frena antes de la revisión.
    await page.getByTestId("admin-comercio-owner").fill("direccion-no-valida!!");
    await page.getByTestId("admin-comercio-name").fill("Tienda Prueba");
    await page.getByTestId("admin-comercio-registrar").click();
    await expect(page.getByTestId("admin-comercio-validacion")).toBeVisible();
    await expect(page.getByTestId("admin-revision")).toHaveCount(0);

    // Con datos válidos la revisión declara owner y nombre; cancelar no muta.
    await page
      .getByTestId("admin-comercio-owner")
      .fill("LazoTiendaPrueba111111111111111111111111");
    await page.getByTestId("admin-comercio-registrar").click();
    await expect(page.getByTestId("admin-revision")).toBeVisible();
    await expect(page.getByTestId("admin-revision")).toContainText(/Tienda Prueba/);
    await page.getByTestId("admin-cancelar").click();
    await expect(page.getByTestId("admin-revision")).toHaveCount(0);
    await expect(comercios).not.toContainText("Tienda Prueba");

    // Confirmar sin el hook del owner A: la API ejecutora rechaza y se declara.
    await page.getByTestId("admin-comercio-registrar").click();
    await page.getByTestId("admin-confirmar").click();
    const fallo = page.getByTestId("admin-mutacion-error");
    await expect(fallo).toBeVisible();
    await expect(fallo).toContainText(/pendiente|hook|todav/i);
    await expect(comercios).not.toContainText("Tienda Prueba");
  });

  test("el reloj demo avanza por revisión, persiste tras recarga y el reset vuelve al día 0", async ({
    page,
  }) => {
    await page.goto("/app");
    await page.getByTestId("demo-option-admin").click();
    await expect(page.getByTestId("admin-panel")).toBeVisible();

    // Solo mock: el reloj existe y arranca en el día 0 del estado sembrado.
    const dia = page.getByTestId("admin-reloj-dia");
    await expect(page.getByTestId("admin-reloj")).toBeVisible();
    await expect(dia).toContainText(/d[ií]a 0\b/i);

    // Avanzar 7 días pasa por revisión; al confirmar, el subscribe del mismo
    // store compartido revalida el reloj y el snapshot (sin keeper paralelo).
    await page.getByTestId("admin-reloj-avanzar-7").click();
    await expect(page.getByTestId("admin-revision")).toBeVisible();
    await expect(page.getByTestId("admin-revision")).toContainText(/reloj|d[ií]a/i);
    await page.getByTestId("admin-confirmar").click();
    await expect(dia).toContainText(/d[ií]a 7\b/i);

    // El avance persiste tras recargar: es estado compartido, no de la vista.
    await page.reload();
    await expect(page.getByTestId("admin-panel")).toBeVisible();
    await expect(dia).toContainText(/d[ií]a 7\b/i);

    // El reset también pasa por revisión; al confirmar limpia el estado y la
    // selección demo (resetDemo del account client), y pide identidad de nuevo.
    await page.getByTestId("admin-reloj-reset").click();
    await expect(page.getByTestId("admin-revision")).toContainText(
      /reiniciar|reset/i,
    );
    await page.getByTestId("admin-confirmar").click();
    await expect(page.getByTestId("admin-sin-cuenta")).toBeVisible();

    // Al volver con la identidad admin, la demo quedó en el día 0 sembrado.
    await page.goto("/app");
    await page.getByTestId("demo-option-admin").click();
    await expect(page.getByTestId("admin-panel")).toBeVisible();
    await expect(dia).toContainText(/d[ií]a 0\b/i);
  });
});
