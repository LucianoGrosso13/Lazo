// Ticket 15 · checkout con 6 cuotas (interés, total, "provisional") y el
// cobro diferido del comercio: la venta a 30 días pasa de pendiente a
// cobrada cuando el reloj de la demo adelanta.
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";

/** Identidad demo persistida (la misma clave del selector de /app). */
const comoDemo = (page: Page, id: string) =>
  page.evaluate(
    (v) => window.localStorage.setItem("lazo.cuenta.demo.v1", v),
    id,
  );

test("checkout a 6 cuotas muestra el interés, el total y la etiqueta provisional", async ({
  page,
}) => {
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);

  // Selector de plan: la opción de 6 cuotas se declara provisional.
  await page
    .getByRole("radio", { name: /6 cuotas|6 installments/ })
    .click();

  // Desglose: fila de interés del plan, total con el +3% y "provisional".
  await expect(
    page.getByText(/interés del plan|plan interest/i),
  ).toBeVisible();
  await expect(
    page.getByText(/\+3%( de interés en total| total interest)?/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/1[.,]021/).first()).toBeVisible();
  await expect(page.getByText(/provisional/i).first()).toBeVisible();
});

test("cobro a 30 días: la venta pasa de pendiente a cobrada al adelantar el reloj", async ({
  page,
}) => {
  // El comercio elige el plazo de 30 días en su cuenta.
  await page.goto("/comercio");
  await comoDemo(page, "merchant");
  await page.goto("/app/comercio");
  await expect(page.getByTestId("comercio-plazos")).toBeVisible();
  await page.getByRole("radio", { name: /30 d[ií]as|30 days/ }).click();
  await expect(
    page.getByRole("radio", { name: /30 d[ií]as|30 days/ }),
  ).toHaveAttribute("aria-checked", "true");

  // La compra usa ese plazo: el desglose lo declara y el plan se abre.
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await expect(
    page.getByText(/a 30 d[ií]as|in 30 days/i).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /pagar anticipo y abrir plan|pay down/i })
    .click();
  await page
    .getByRole("button", { name: /firmar y abrir plan|sign & open/i })
    .click();
  await expect(
    page.getByRole("heading", { name: /listo, plan abierto|done/i }),
  ).toBeVisible();

  // En la cuenta del comercio la venta queda pendiente: solo entró el
  // anticipo (300), el resto (656,25) se acredita a los 30 días.
  await page.goto("/app/comercio");
  const datos = page.getByTestId("comercio-datos");
  await expect(datos).toBeVisible();
  await expect(datos).toContainText("656,25");
  await expect(
    datos.getByText(/pendiente/i).first(),
  ).toBeVisible();

  // El reloj de la demo adelanta 15 + 15 = 30 días por revisión admin.
  await comoDemo(page, "admin");
  await page.goto("/app/admin");
  await expect(page.getByTestId("admin-panel")).toBeVisible();
  const dia = page.getByTestId("admin-reloj-dia");
  await page.getByTestId("admin-reloj-avanzar-15").click();
  await page.getByTestId("admin-confirmar").click();
  await expect(dia).toContainText(/d[ií]a 15\b/i);
  await page.getByTestId("admin-reloj-avanzar-15").click();
  await page.getByTestId("admin-confirmar").click();
  await expect(dia).toContainText(/d[ií]a 30\b/i);

  // La misma venta aparece cobrada: pendiente 0, sin pendiente de cobro.
  await comoDemo(page, "merchant");
  await page.goto("/app/comercio");
  await expect(datos).toBeVisible();
  await expect(
    datos.getByText(/cobrada|collected/i).first(),
  ).toBeVisible();
  await expect(
    datos.getByText("Pendiente", { exact: true }),
  ).toHaveCount(0);
  await expect(datos).toContainText(
    /pendiente de cobro\s*US\$ 0,00|pending payout\s*US\$ 0\.00/i,
  );
});
