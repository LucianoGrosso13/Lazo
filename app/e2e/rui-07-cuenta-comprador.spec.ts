// Ticket 07 — cuenta del comprador: credencial de Tier con beneficios de la
// config, progreso honesto al próximo escalón, "Tier máximo" en el tope y
// accesos visuales (no botones apagados). Corre en mock contra el dev server
// del worker (PW_BASE_URL) — nunca el harness del coordinador.
import { expect, test } from "@playwright/test";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";

const DEMO_KEY = "lazo.cuenta.demo.v1";
const TIER3 = "LazoEstudianteEscalon3111111111111111111111";

async function comoPersona(page: import("@playwright/test").Page, id: string) {
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k, v),
    [DEMO_KEY, id],
  );
}

test("comprador nuevo: credencial Tier 1 con beneficios y progreso vacío", async ({
  page,
}) => {
  await comoPersona(page, "student-new");
  await page.goto("/app/estudiante");

  const card = page.getByTestId("tier-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(/tier 1 · starter/i);
  // Beneficios del escalón 1 de la config: 30% de anticipo, US$1.000 de tope.
  await expect(card).toContainText("30%");
  await expect(card).toContainText(/1\.000|1,000/);
  // Progreso honesto: falta 1 plan saldado ≥ el mínimo de la config.
  await expect(card).toContainText(/al próximo tier|toward the next tier/i);
  await expect(card).toContainText(/falta 1 plan|need 1 plan/i);
  await expect(card.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );

  // Accesos como tarjetas con destino claro (no botones apagados).
  const accesos = page.getByRole("navigation", {
    name: /accesos|quick links/i,
  });
  await expect(
    accesos.getByRole("link", { name: /ver comercios|browse merchants/i }),
  ).toHaveAttribute("href", "/comercio");
  await expect(
    accesos.getByRole("link", { name: /ver planes|see my plans/i }),
  ).toHaveAttribute("href", "#planes");
});

test("comprador Tier 4: credencial llena, tier máximo, sin escalera", async ({
  page,
}) => {
  await comoPersona(page, "student-tier3");
  await page.goto("/app/estudiante");

  const card = page.getByTestId("tier-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(/tier 4 · full/i);
  await expect(card).toContainText(/tier máximo|max tier/i);
  await expect(card.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  // Beneficios del escalón máximo: 0% anticipo, US$1.500 de tope.
  await expect(card).toContainText("0%");
  await expect(card).toContainText(/1\.500|1,500/);
  // Nada de "Tier 5": el modelo tiene cuatro escalones.
  await expect(card).not.toContainText(/tier 5/i);
});

test("plan con cuota paga: anillo 1/3 y progreso de Tier en marcha", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await comoPersona(page, "student-new");
  // Compra del caso base y pago de la primera cuota (flujo del ticket 02).
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await page.getByText(/tu saldo devusdc|your devusdc balance/i).waitFor();
  await page
    .getByRole("button", { name: /pagar anticipo y abrir plan|pay down/i })
    .click();
  await page
    .getByRole("button", { name: /firmar y abrir plan|sign & open/i })
    .click();
  await page
    .getByRole("heading", { name: /listo, plan abierto|done/i })
    .waitFor();

  await page.goto("/app/estudiante");
  const planCard = page.getByTestId("account-plan");
  await expect(planCard).toBeVisible();
  await page.getByTestId("pay-installment-cta").click();
  await page
    .getByRole("button", { name: /aprobar y pagar|approve & pay/i })
    .click();
  await expect(
    page.getByRole("heading", { name: /cuota 1 pagada|installment 1 paid/i }),
  ).toBeVisible({ timeout: 30_000 });
  await page
    .getByRole("button", { name: /^listo$|^done$/i })
    .click();

  // El anillo marca 1 de 3 y la credencial cuenta el plan en curso.
  await expect(
    planCard.getByRole("img", {
      name: /1 de 3 cuotas|1 of 3 installments/i,
    }),
  ).toBeVisible();
  const card = page.getByTestId("tier-card");
  await expect(card).toContainText(/llevás 1 de 3|1 of 3 installments/i);
});
