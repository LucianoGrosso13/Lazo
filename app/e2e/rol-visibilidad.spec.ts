// Ticket 02 (rediseño UI) · cada rol ve lo suyo: el comprador no ve montos
// ni plazos de cobro del comercio en el desglose, la confirmación ni el
// éxito — en 3 y en 6 cuotas, con cobro inmediato y diferido. El comercio
// sí los ve en su panel.
import { expect, test, type Page } from "@playwright/test";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";
import { DEMO_MERCHANT } from "../src/lib/cuotas/format";

const CONFIRM_CTA = /pagar anticipo y abrir plan|pay down/i;
const SIGN_CTA = /firmar y abrir plan|sign & open/i;
const SUCCESS_HEADING = /listo, plan abierto|done, plan opened/i;
// Frases de cobro del comercio que jamás aparecen frente al comprador.
// Ojo: "cobro" a secas sí es texto legítimo (el desplegable de mora dice
// "se solicita el cobro a tu fiador"); se apunta a las frases exactas.
const MERCHANT_LINES =
  /\bcobra\b|cobró|gets\b|got\b|merchant receives|comercio recibe|el resto \(us\$/i;

const fmtEs = (micro: number) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(micro / 1e6);

const readState = (page: Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem("lazo.mock.v3");
    if (!raw) throw new Error("mock state was not initialized");
    return JSON.parse(raw);
  });

const lastSale = async (page: Page) => {
  const state = await readState(page);
  const sales = state.merchants[DEMO_MERCHANT]?.sales ?? [];
  return sales[sales.length - 1] ?? null;
};

/** La vista del comprador no contiene frases de cobro ni montos del comercio. */
async function expectNoMerchantData(page: Page) {
  await expect(page.getByText(MERCHANT_LINES)).toHaveCount(0);
}

test("cobro inmediato · 3 cuotas: desglose, confirmación y éxito sin datos del comercio", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await expect(
    page.getByText(/tu saldo devusdc|your devusdc balance/i),
  ).toBeVisible();
  await expectNoMerchantData(page);

  await page.getByRole("button", { name: CONFIRM_CTA }).click();
  await expect(
    page.getByRole("heading", { name: /revisá lo que firmás|check what you're signing/i }),
  ).toBeVisible();
  await expectNoMerchantData(page);

  await page.getByRole("button", { name: SIGN_CTA }).click();
  await expect(
    page.getByRole("heading", { name: SUCCESS_HEADING }),
  ).toBeVisible();
  await expectNoMerchantData(page);

  // La venta quedó registrada con su neto: ningún monto del comercio se ve.
  const sale = await lastSale(page);
  expect(sale).not.toBeNull();
  expect(sale.received).toBeGreaterThan(0);
  await expect(page.getByText(fmtEs(sale.received))).toHaveCount(0);
});

test("cobro diferido a 90 días · 6 cuotas: el comprador no ve plazo ni tramos del comercio", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await expect(
    page.getByText(/tu saldo devusdc|your devusdc balance/i),
  ).toBeVisible();
  // El comercio eligió cobrar a 90 días; el comprador no se entera.
  await page.evaluate((merchant) => {
    const state = JSON.parse(window.localStorage.getItem("lazo.mock.v3")!);
    state.merchants[merchant].settlementId = "deferred_90";
    window.localStorage.setItem("lazo.mock.v3", JSON.stringify(state));
  }, DEMO_MERCHANT);
  await page.reload();
  await expect(
    page.getByText(/tu saldo devusdc|your devusdc balance/i),
  ).toBeVisible();
  await page.getByRole("radio", { name: /6 cuotas|6 installments/ }).click();
  await expect(page.getByText(/\+3%( de interés en total| total interest)?/i).first()).toBeVisible();
  await expectNoMerchantData(page);
  await expect(page.getByText(/a 90 d[ií]as|in 90 days/i)).toHaveCount(0);

  await page.getByRole("button", { name: CONFIRM_CTA }).click();
  await expect(
    page.getByRole("heading", { name: /revisá lo que firmás|check what you're signing/i }),
  ).toBeVisible();
  await expectNoMerchantData(page);
  await expect(page.getByText(/a 90 d[ií]as|in 90 days/i)).toHaveCount(0);

  await page.getByRole("button", { name: SIGN_CTA }).click();
  await expect(
    page.getByRole("heading", { name: SUCCESS_HEADING }),
  ).toBeVisible();
  await expectNoMerchantData(page);
  await expect(page.getByText(/a 90 d[ií]as|in 90 days/i)).toHaveCount(0);

  // La venta tiene anticipo + tramos pendientes del comercio: no aparecen.
  const sale = await lastSale(page);
  expect(sale).not.toBeNull();
  expect(sale.settlementDays).toBe(90);
  expect(sale.pendingSettlement).toBeGreaterThan(0);
  await expect(page.getByText(fmtEs(sale.received))).toHaveCount(0);
  await expect(page.getByText(fmtEs(sale.pendingSettlement))).toHaveCount(0);
  await expect(page.getByText(fmtEs(sale.fee))).toHaveCount(0);
});

test("el panel del comercio sí muestra sus montos, plazo y tramos", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // Venta diferida a 90 días para que el panel muestre tramos pendientes.
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await expect(
    page.getByText(/tu saldo devusdc|your devusdc balance/i),
  ).toBeVisible();
  await page.evaluate((merchant) => {
    const state = JSON.parse(window.localStorage.getItem("lazo.mock.v3")!);
    state.merchants[merchant].settlementId = "deferred_90";
    window.localStorage.setItem("lazo.mock.v3", JSON.stringify(state));
  }, DEMO_MERCHANT);
  await page.reload();
  await expect(
    page.getByText(/tu saldo devusdc|your devusdc balance/i),
  ).toBeVisible();
  await page.getByRole("button", { name: CONFIRM_CTA }).click();
  await page.getByRole("button", { name: SIGN_CTA }).click();
  await expect(
    page.getByRole("heading", { name: SUCCESS_HEADING }),
  ).toBeVisible();
  const sale = await lastSale(page);
  expect(sale?.pendingSettlement).toBeGreaterThan(0);

  await page.goto("/app/comercio");
  await page.getByTestId("demo-option-merchant").click();
  const datos = page.getByTestId("comercio-datos");
  await expect(datos).toBeVisible();
  // Cobrado + pendiente + plazo de la venta, con sus montos.
  await expect(datos.getByText(/cobrado|collected/i).first()).toBeVisible();
  await expect(
    datos.getByText(/pendiente de cobro|pending payout/i).first(),
  ).toBeVisible();
  await expect(datos.getByText(/a 90 d[ií]as|in 90 days/i).first()).toBeVisible();
  await expect(datos.getByText(new RegExp(fmtEs(sale.pendingSettlement).replace(/[.,]/g, "\\$&"))).first()).toBeVisible();
  await expect(datos.getByText(/comisión|fee/i).first()).toBeVisible();
  await expect(datos.getByText(/tramo \d+ de \d+|tranche \d+ of \d+/i).first()).toBeVisible();
});
