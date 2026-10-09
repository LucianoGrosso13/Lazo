// Ticket 01 · checkout happy path en modo mock: revisión de lo firmado,
// progreso observable, éxito tras confirmación+plan, calendario exacto con
// la primera impaga destacada, bloqueo por saldo insuficiente y una
// operación `uncertain` restaurada que nunca habilita un reenvío a ciegas.
import { expect, test } from "@playwright/test";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";

const CONFIRM_CTA = /pagar anticipo y abrir plan|pay down/i;
const SIGN_CTA = /firmar y abrir plan|sign & open/i;

test("compra feliz: revisión → progreso → éxito con calendario y comprobante simulado", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);

  // Desglose con datos vivos: saldo devUSDC de la cuenta demo.
  await expect(
    page.getByText(/tu saldo devusdc|your devusdc balance/i),
  ).toBeVisible();
  await page.getByRole("button", { name: CONFIRM_CTA }).click();

  // Revisión de lo que se firma: destino, anticipo, token, red y fiador.
  await expect(
    page.getByText(/devUSDC · USDC de prueba|devUSDC · test USDC/i),
  ).toBeVisible();
  await expect(page.getByText(/Solana devnet/i).first()).toBeVisible();
  await expect(
    page.getByText(/fiador|guarantor/i).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: SIGN_CTA }).click();

  // Progreso observable: el mínimo post-envío deja la fase "syncing"
  // visible aunque el mock resuelva al instante.
  await expect(page.getByTestId("tx-progress")).toBeVisible();

  // Éxito tras confirmación + plan leído: hechos, calendario y comprobante
  // etiquetado como simulado (modo mock nunca inventa un link real).
  await expect(
    page.getByRole("heading", { name: /listo, plan abierto|done/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/comprobante simulado|simulated receipt/i),
  ).toBeVisible();
  await expect(page.getByText(/pagaste el anticipo|you paid/i)).toBeVisible();
  await expect(
    page.getByText(/te quedan por pagar|left to pay/i),
  ).toBeVisible();

  const calendar = page.getByTestId("plan-calendar");
  await expect(calendar).toBeVisible();
  // 3 cuotas reales del plan; la primera impaga queda marcada (data-next).
  await expect(calendar.getByText(/cuota 1|installment 1/i).first()).toBeVisible();
  await expect(calendar.getByText(/cuota 3|installment 3/i).first()).toBeVisible();
  await expect(calendar.locator("li[data-next]")).toHaveCount(1);
  const next = page.getByTestId("next-installment");
  await expect(next).toBeVisible();
  await expect(next).toContainText(/30/i);
  // Desplegable de atraso alimentado por la config vigente.
  const late = page.getByTestId("late-details");
  await expect(late).toBeVisible();
  await late.locator("summary").click();
  await expect(late).toContainText(/días de gracia|grace days/i);
  await expect(late).toContainText(/5%/);
  // Ticket 02: solo la próxima cuota ofrece su revisión de pago.
  await expect(
    calendar.getByRole("button", { name: /pagar|pay/i }),
  ).toHaveCount(1);
  await expect(calendar.getByTestId("pay-installment-cta")).toBeEnabled();
});

test("saldo insuficiente bloquea la compra y muestra el faltante", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  // Esperar la primera cotización: `ensureStudent` persiste el estado mock.
  await expect(
    page.getByText(/tu saldo devusdc|your devusdc balance/i),
  ).toBeVisible();
  // Drena los fondos simulados con un plan ya saldado (no toca el margen
  // ni dispara has_active_plan: solo quema el saldo derivado del mock).
  await page.evaluate((student) => {
    const raw = window.localStorage.getItem("lazo.mock.v3");
    if (!raw) throw new Error("mock state was not initialized");
    const state = JSON.parse(raw);
    state.plans.push({
      id: "e2e-drained",
      student,
      merchant: Object.keys(state.merchants)[0],
      price: 0,
      downPayment: 1_900_000_000,
      financed: 0,
      merchantFee: 0,
      installments: [],
      openedAt: Math.floor(Date.now() / 1000),
      status: "Settled",
      counts: false,
      signature: "e2edrained",
    });
    window.localStorage.setItem("lazo.mock.v3", JSON.stringify(state));
  }, DEMO_STUDENT_NEW);
  await page.reload();

  await expect(
    page.getByText(/no te alcanza el saldo devusdc|not enough devusdc/i),
  ).toBeVisible();
  await expect(page.getByText(/te faltan US\$|missing US\$/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: CONFIRM_CTA }),
  ).toBeDisabled();
});

test("una operación pendiente se restaura tras reload y no habilita reintento", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  // Simula un `uncertain` persistido (firma original + snapshot) y recarga:
  // la pantalla recupera la operación en duda, no una compra nueva.
  const signature = "4".repeat(88);
  await page.evaluate(
    ([student, sig]) => {
      window.sessionStorage.setItem(
        `lazo.openplan.pending.${student}`,
        JSON.stringify({ operation: "open_plan", student, signature: sig }),
      );
    },
    [DEMO_STUDENT_NEW, signature],
  );
  await page.reload();

  await page.getByRole("button", { name: CONFIRM_CTA }).click();
  await expect(page.getByTestId("tx-uncertain")).toBeVisible();
  // Jamás un CTA de firma mientras la operación original está en duda.
  await expect(page.getByRole("button", { name: SIGN_CTA })).toHaveCount(0);

  // Volver al desglose NO abandona la operación: reingresar muestra el
  // mismo estado pendiente.
  await page
    .getByRole("button", { name: /volver a la compra|back to the purchase/i })
    .click();
  await page.getByRole("button", { name: CONFIRM_CTA }).click();
  await expect(page.getByTestId("tx-uncertain")).toBeVisible();

  // Verificar sondea la firma original; en el mock una firma desconocida
  // queda `pending`: sigue bloqueada, sin sugerir una compra nueva.
  await page
    .getByRole("button", { name: /verificar en la cadena|verify on chain/i })
    .click();
  await expect(
    page.getByText(/todavía no la vemos confirmada|not confirmed/i),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("tx-uncertain")).toBeVisible();
  await expect(page.getByRole("button", { name: SIGN_CTA })).toHaveCount(0);
});
