// Ticket 15 · checkout terms and merchant payout behavior in mock mode.
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";

const comoDemo = (page: Page, id: string) =>
  page.evaluate((v) => window.localStorage.setItem("lazo.cuenta.demo.v1", v), id);

test("6 installments show 3% total and US$1,021; the minimum blocks a US$340 purchase", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await page.getByRole("radio", { name: /6 cuotas|6 installments/ }).click();
  await expect(page.getByText(/\+3%( de interés en total| total interest)?/i).first()).toBeVisible();
  await expect(page.getByText(/1[.,]021/).first()).toBeVisible();
  await expect(page.getByText(/provisional/i)).toHaveCount(0);

  await page.goto(`/checkout/tablet-10?demo=${DEMO_STUDENT_NEW}`);
  const six = page.getByRole("radio", { name: /6 cuotas|6 installments/ });
  await expect(six).toBeDisabled();
  await expect(six).toContainText(/350/);
});

test("checkout requires an active guarantor and offers an invite", async ({ page }) => {
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await expect(page.getByRole("radio", { name: /3 cuotas|3 installments/ })).toBeVisible();
  // Mock fixtures seed a guarantor when an identity is first used. Keep the
  // existing fixture but revoke it, matching the protocol's inactive state.
  await page.evaluate((student) => {
    const raw = window.localStorage.getItem("lazo.mock.v3");
    if (!raw) throw new Error("mock state was not initialized");
    const state = JSON.parse(raw);
    state.guarantees[student].active = false;
    window.localStorage.setItem("lazo.mock.v3", JSON.stringify(state));
  }, DEMO_STUDENT_NEW);
  await page.reload();
  await expect(page.getByText(/necesitás un garante|need a guarantor/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /invitar a mi garante|invite my guarantor/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /pagar anticipo y abrir plan|pay down/i })).toBeDisabled();
});

test("a 90-day sale releases three guaranteed tranches while the buyer is late", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/app/comercio");
  await page.getByTestId("demo-option-merchant").click();
  await expect(page.getByTestId("comercio-plazos")).toBeVisible();
  await page.getByRole("radio", { name: /90 d[ií]as|90 days/ }).click();
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await expect(page.getByText(/a 90 d[ií]as|in 90 days/i).first()).toBeVisible();
  await page.getByRole("radio", { name: /6 cuotas|6 installments/ }).click();
  await page.getByRole("button", { name: /pagar anticipo y abrir plan|pay down/i }).click();
  await page.getByRole("button", { name: /firmar y abrir plan|sign & open/i }).click();
  await expect(page.getByRole("heading", { name: /listo, plan abierto|done/i })).toBeVisible();

  // La primera cuota vence; el día 15 se cobra al fiador y baja el Tier.
  await comoDemo(page, "admin");
  await page.goto("/app/admin");
  for (const day of [15, 15]) {
    await page.getByTestId(`admin-reloj-avanzar-${day}`).click();
    await page.getByTestId("admin-confirmar").click();
  }
  await expect(page.getByTestId("admin-reloj-dia")).toContainText(/d[ií]a 30\b/i);

  // Lazo libera el primer tramo el día 30 aunque ya haya mora del estudiante.
  await comoDemo(page, "merchant");
  await page.goto("/app/comercio");
  const datos = page.getByTestId("comercio-datos");
  await expect(datos).toBeVisible();
  await expect(datos).toContainText(/2.*3|2 de 3|2\/3/i);

  await comoDemo(page, "admin");
  await page.goto("/app/admin");
  for (const day of [15, 15, 15, 15]) {
    await page.getByTestId(`admin-reloj-avanzar-${day}`).click();
    await page.getByTestId("admin-confirmar").click();
  }
  await expect(page.getByTestId("admin-reloj-dia")).toContainText(/d[ií]a 90\b/i);
  await comoDemo(page, "merchant");
  await page.goto("/app/comercio");
  await expect(datos).toContainText(/cobrad[ao]|collected/i);
  await expect(datos).toContainText(/3.*3|3 de 3|3\/3/i);
});
