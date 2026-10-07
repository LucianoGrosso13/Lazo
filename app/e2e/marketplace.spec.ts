// Ticket 15 · marketplace: buscar, filtrar por categoría, abrir el perfil,
// comprar un producto de OTRO comercio en el mock y ver la venta registrada
// en la cuenta del comercio dueño. La wallet la simula el query param
// `?demo=` del checkout (mock solamente); nada se firma de verdad.
import { expect, test } from "@playwright/test";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";

const TECLA_CLICK = "2dgH9sW7mCLwHK2N5WiGbMHQZm25c9Vc9RpTsaAAhcvA";

const EXPLORER_LINKS =
  'a[href*="explorer.solana.com"], a[href*="solana.fm"], a[href*="solscan.io"], a[href*="solanafm"]';

test("marketplace: buscar, filtrar, perfil, checkout de otro comercio y venta en su cuenta", async ({
  page,
}) => {
  await page.goto("/comercio");
  await expect(page.getByTestId("marketplace")).toBeVisible();

  // Buscar por nombre de producto: solo queda el comercio que lo vende.
  await page.getByTestId("marketplace-q").fill("teclado");
  await expect(
    page.getByRole("link", { name: /Tecla & Click/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Voltia/ })).toHaveCount(0);

  // Filtrar por categoría con la búsqueda limpia: solo periféricos.
  await page.getByTestId("marketplace-q").fill("");
  await page
    .getByRole("button", { name: /periféricos y accesorios|peripherals/i })
    .click();
  // La categoría también se espeja en la URL con debounce: esperar a que
  // quede escrita antes de navegar.
  await expect(page).toHaveURL(/cat=peripherals/);
  await expect(
    page.getByRole("link", { name: /Tecla & Click/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Audio Sur/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Voltia/ })).toHaveCount(0);

  // El perfil declara demo, planes aceptados y productos con CTA al checkout.
  await page.getByRole("link", { name: /Tecla & Click/ }).click();
  await expect(page).toHaveURL(`/comercio/${TECLA_CLICK}`);
  await expect(page.getByTestId("merchant-profile")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tecla & Click" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Teclado mecánico|Mechanical keyboard/ }),
  ).toHaveAttribute("href", "/checkout/teclado-mecanico");

  // Checkout de un producto de OTRO comercio (Voltia, dueña de la tienda
  // demo): `?demo=` actúa como la wallet conectada, solo en mock.
  await page.goto(`/checkout/notebook?demo=${DEMO_STUDENT_NEW}`);
  await page
    .getByRole("button", {
      name: /pagar anticipo y abrir plan|pay down payment/i,
    })
    .click();
  await page
    .getByRole("button", { name: /firmar y abrir plan|sign & open plan/i })
    .click();
  await expect(
    page.getByRole("heading", {
      name: /listo, plan abierto|done, plan opened/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/comprobante simulado|simulated receipt/i),
  ).toBeVisible();
  await expect(page.locator(`main ${EXPLORER_LINKS}`)).toHaveCount(0);

  // La venta queda registrada en la cuenta del comercio dueño (Voltia):
  // con su plazo "hoy" ya figura cobrada, con el precio del producto.
  await page.evaluate(() =>
    window.localStorage.setItem("lazo.cuenta.demo.v1", "merchant"),
  );
  await page.goto("/app/comercio");
  const datos = page.getByTestId("comercio-datos");
  await expect(datos).toBeVisible();
  await expect(datos).toContainText("650,00");
  await expect(
    datos.getByText(/cobrada|collected/i).first(),
  ).toBeVisible();
});
