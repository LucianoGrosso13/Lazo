import { expect, test, type Page } from "@playwright/test";
import { DEMO_MERCHANT } from "../src/lib/cuotas/format";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";

// Ticket 05 (rediseño UI) · panel del comercio: Cobrado + Garantizado por
// cobrar arriba, venta en mostrador debajo y ventas en cuotas plegables.
// Corre en modo mock; el reloj demo libera los tramos en su fecha.

const comoDemo = (page: Page, id: string) =>
  page.evaluate((v) => window.localStorage.setItem("lazo.cuenta.demo.v1", v), id);

const entrarComoComercio = async (page: Page) => {
  await page.goto("/app/comercio");
  await page.getByTestId("demo-option-merchant").click();
  await expect(page.getByTestId("comercio-datos")).toBeVisible();
};

test("orden del panel: cobrado y garantizado arriba, mostrador, ventas; acento merchant", async ({
  page,
}) => {
  await entrarComoComercio(page);
  await expect(page.locator('[data-testid="comercio-panel"][data-role="merchant"]')).toBeVisible();
  // Sin ventas aún: el bloque garantizado declara el estado vacío amable.
  const garantizado = page.getByTestId("comercio-garantizado");
  await expect(garantizado).toBeVisible();
  await expect(
    garantizado.getByText(/sin cobros diferidos pendientes|no deferred payouts pending/i),
  ).toBeVisible();

  const orden = [garantizado, page.getByTestId("comercio-mostrador-card"), page.getByTestId("comercio-ventas")];
  const [g, m, v] = await Promise.all(orden.map((l) => l.boundingBox()));
  expect(g!.y).toBeLessThan(m!.y);
  expect(m!.y).toBeLessThan(v!.y);
});

test("una venta a 90 días llena la línea de tiempo y el reloj la libera tramo a tramo", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await entrarComoComercio(page);
  await page.getByRole("radio", { name: /90 d[ií]as|90 days/ }).click();

  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await page.getByRole("radio", { name: /6 cuotas|6 installments/ }).click();
  await page.getByRole("button", { name: /pagar anticipo y abrir plan|pay down/i }).click();
  await page.getByRole("button", { name: /firmar y abrir plan|sign & open/i }).click();
  await expect(page.getByRole("heading", { name: /listo, plan abierto|done/i })).toBeVisible();

  await page.goto("/app/comercio");
  const garantizado = page.getByTestId("comercio-garantizado");
  await expect(garantizado).toBeVisible();
  // Los 3 tramos del calendario de la venta, con fecha y monto.
  await expect(garantizado.getByTestId("comercio-tramo")).toHaveCount(3);
  await expect(garantizado).toContainText(/tramo 1 de 3|tranche 1 of 3/i);
  await expect(garantizado).toContainText("663,25");

  // Día 30: el primer tramo pasa a cobrado y sale del pendiente garantizado.
  await comoDemo(page, "admin");
  await page.goto("/app/admin");
  for (const day of [15, 15]) {
    await page.getByTestId(`admin-reloj-avanzar-${day}`).click();
    await page.getByTestId("admin-confirmar").click();
  }
  await expect(page.getByTestId("admin-reloj-dia")).toContainText(/d[ií]a 30\b/i);

  await comoDemo(page, "merchant");
  await page.goto("/app/comercio");
  await expect(garantizado).toBeVisible();
  await expect(garantizado.getByTestId("comercio-tramo")).toHaveCount(2);
  await expect(garantizado).toContainText("442,17");
  // El tramo liberado figura cobrado dentro de la venta.
  await expect(page.getByTestId("comercio-datos")).toContainText(/liberado|released/i);
});

test("el historial de ventas muestra las últimas 3 y se expande con el botón", async ({
  page,
}) => {
  // La visita al checkout siembra y persiste el estado del mock
  // (ensureStudent + commit); recién ahí se le inyectan ventas.
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await page.waitForFunction(() => window.localStorage.getItem("lazo.mock.v3") !== null);
  // Cuatro ventas inmediatas ya cobradas, sembradas en el estado del mock.
  await page.evaluate((merchant) => {
    const raw = window.localStorage.getItem("lazo.mock.v3");
    if (!raw) throw new Error("el mock todavía no sembró su estado");
    const state = JSON.parse(raw);
    const m = state.merchants[merchant];
    if (!m) throw new Error("comercio demo no encontrado");
    const base = 1_700_000_000;
    for (let i = 0; i < 4; i++) {
      m.sales.push({
        planId: `plan-e2e-${i}`,
        price: 1_000_000_000,
        downPayment: 300_000_000,
        financed: 700_000_000,
        fee: 49_000_000,
        received: 951_000_000,
        at: base + i * 86_400,
        signature: `sig-e2e-${i}`,
        settlementId: "immediate",
        settlementDays: 0,
        settlementAt: base + i * 86_400,
        pendingSettlement: 0,
        settled: true,
        payoutTranches: [],
      });
    }
    m.pendingSettlement = 0;
    window.localStorage.setItem("lazo.mock.v3", JSON.stringify(state));
  }, DEMO_MERCHANT);

  await page.goto("/app/comercio");
  await page.getByTestId("demo-option-merchant").click();
  await expect(page.getByTestId("comercio-ventas")).toBeVisible();
  const historial = page.getByRole("list", { name: /ventas en cuotas|installment sales/i });
  await expect(historial.locator("> li:visible")).toHaveCount(3);

  await page.getByRole("button", { name: /ver todas \(4\)|view all \(4\)/i }).click();
  // Al expandir el botón cambia su rótulo a "Ver menos".
  const menos = page.getByRole("button", { name: /ver menos|show less/i });
  await expect(menos).toHaveAttribute("aria-expanded", "true");
  await expect(historial.locator("> li:visible")).toHaveCount(4);

  await menos.click();
  await expect(historial.locator("> li:visible")).toHaveCount(3);
});
