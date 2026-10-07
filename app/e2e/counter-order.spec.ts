import { expect, test } from "@playwright/test";

test("counter order creates QR and link, completes checkout, and appears as a paid sale", async ({ page }) => {
  await page.goto("/app/comercio");
  await page.getByTestId("demo-option-merchant").click();
  await page.getByTestId("comercio-mostrador-link").click();
  await expect(page).toHaveURL("/app/comercio/mostrador");
  await page.getByTestId("input-orden-monto").fill("500");
  await page.getByTestId("input-orden-descripcion").fill("Monitor para estudiar");
  await page.getByTestId("btn-generar-orden").click();

  const link = page.getByTestId("orden-link-input");
  await expect(link).toBeVisible();
  await expect(page.getByRole("img", { name: /código QR para la orden/i })).toBeVisible();
  const orderUrl = await link.inputValue();
  expect(orderUrl).toMatch(/\/orden\//);

  await page.goto("/app");
  await page.getByTestId("demo-option-student-tier3").click();
  await page.goto(orderUrl);
  await expect(page.getByText("Monitor para estudiar", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /pagar anticipo y abrir plan|pay down/i }).click();
  await page.getByRole("button", { name: /firmar y abrir plan|sign & open/i }).click();
  await expect(page.getByRole("heading", { name: /esta orden ya fue pagada|order has been paid/i })).toBeVisible();

  await page.goto("/app");
  await page.getByTestId("demo-option-merchant").click();
  const datos = page.getByTestId("comercio-datos");
  await expect(datos).toContainText("500,00");
  await expect(datos.getByText(/cobrada|collected/i).first()).toBeVisible();
});
