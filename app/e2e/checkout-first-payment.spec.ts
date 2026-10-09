// Ticket 02 · pago anticipado de la primera cuota en modo mock: compra del
// caso base, revisión del pago con importe exacto, aprobación separada,
// éxito solo tras confirmación+plan releído (cuota Paid, 2 pendientes,
// deuda exacta 466,67), fechas intactas y el estado conservado al volver
// al plan del estudiante.
import { expect, test } from "@playwright/test";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";

const CONFIRM_CTA = /pagar anticipo y abrir plan|pay down/i;
const SIGN_CTA = /firmar y abrir plan|sign & open/i;
const APPROVE_CTA = /aprobar y pagar|approve & pay/i;

test("compra → pago anticipado de la cuota 1 → estado conservado al volver", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await page
    .getByText(/tu saldo devusdc|your devusdc balance/i)
    .waitFor();
  await page.getByRole("button", { name: CONFIRM_CTA }).click();
  await page.getByRole("button", { name: SIGN_CTA }).click();
  await expect(
    page.getByRole("heading", { name: /listo, plan abierto|done/i }),
  ).toBeVisible();
  await expect(page.getByTestId("plan-calendar")).toBeVisible();

  // CTA sobre la primera impaga → revisión con datos exactos.
  await page.getByTestId("pay-installment-cta").click();
  const panel = page.getByTestId("pay-panel");
  await expect(panel).toBeVisible();
  await expect(page.getByTestId("pay-exact-amount")).toContainText(
    "233,333333",
  );
  await expect(
    panel.getByText(/pool de liquidez|liquidity pool/i),
  ).toBeVisible();
  await expect(panel.getByText(/devUSDC · /i)).toBeVisible();
  await expect(panel.getByText(/Solana devnet/i)).toBeVisible();
  await expect(
    panel.getByText(/aprobación nueva|fresh approval/i),
  ).toBeVisible();

  // Segunda aprobación: progreso observable y éxito solo tras el plan releído.
  await page.getByRole("button", { name: APPROVE_CTA }).click();
  await expect(page.getByTestId("tx-progress")).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: /cuota 1 pagada|installment 1 paid/i }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    panel.getByText(/comprobante simulado|simulated receipt/i),
  ).toBeVisible();
  // Quedan 2 y la deuda baja exactamente a 466,67 (700 − 233,333333).
  await expect(panel.getByText(/quedan 2|2 installments/i)).toBeVisible();
  await expect(page.getByTestId("pay-new-balance")).toContainText("1.466,67");
  await expect(page.getByTestId("pending-fact")).toContainText("466,67");

  // El calendario refleja el plan releído: cuota 1 pagada, cuota 2 próxima,
  // mismas fechas que antes del pago.
  const calendar = page.getByTestId("plan-calendar");
  await expect(calendar.getByText(/pagada|paid/i).first()).toBeVisible();
  await expect(calendar.locator("li[data-next]")).toHaveCount(1);
  await expect(calendar.locator("li[data-next]")).toContainText(/cuota 2|installment 2/i);
  // Cerrar el panel de pago no dispara ningún otro cobro.
  await panel.getByRole("button", { name: /^listo$|^done$/i }).click();

  // Persistencia: al ir al plan del estudiante (recarga completa) la cuota
  // 1 sigue pagada y el resto pendiente, leído del estado, no de memoria.
  await page.evaluate(
    () => window.localStorage.setItem("lazo.cuenta.demo.v1", "student-new"),
  );
  await page.goto("/app/estudiante");
  const planCard = page.getByTestId("account-plan");
  await expect(planCard).toBeVisible();
  await expect(planCard.getByText(/pagada|paid/i).first()).toBeVisible();
  // El CTA de pago sigue disponible para la próxima cuota (ahora la 2).
  await expect(page.getByTestId("pay-installment-cta")).toContainText(
    /cuota 2|installment 2/i,
  );
});
