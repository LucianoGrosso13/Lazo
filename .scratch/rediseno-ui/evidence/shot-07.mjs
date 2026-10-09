// Capturas del ticket 07: cuenta del comprador en 390 y 1440 para las dos
// personas demo, más el plan con anillo tras pagar la cuota 1.
// Se corre con el dev server en :3207. En es-AR para revisar el copy.
import { createRequire } from "node:module";
// playwright vive en app/node_modules; resolvemos desde ahí aunque el
// script viva en .scratch (evidencia, no código del app).
const require = createRequire(
  "/Users/lucianogrosso/orca/workspaces/Hackaton Solana/rui-07/app/package.json",
);
const { chromium } = require("playwright");

const BASE = "http://localhost:3207";
const OUT = "/Users/lucianogrosso/orca/workspaces/Hackaton Solana/rui-07/.scratch/rediseno-ui/evidence";
const DEMO_KEY = "lazo.cuenta.demo.v1";

async function nuevaPagina(persona, width) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width, height: 844 },
    deviceScaleFactor: 1,
    locale: "es-AR",
  });
  await ctx.addInitScript(
    ([k, v]) => {
      window.localStorage.setItem(k, v);
      window.localStorage.setItem("lazo.locale", "es");
    },
    [DEMO_KEY, persona],
  );
  const page = await ctx.newPage();
  // El indicador de devtools de Next no es parte del producto.
  await page.addInitScript(() => {
    const css = document.createElement("style");
    css.textContent =
      "nextjs-portal, #__nextjs, [data-nextjs-dev-tools], .nextjs-toast { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () =>
      document.head.append(css),
    );
  });
  return { browser, page };
}

async function preparada(page) {
  await page.getByTestId("tier-card").waitFor({ timeout: 30_000 });
  // Dejar que terminen las animaciones de entrada (sheen, barras, anillo).
  await page.waitForTimeout(1600);
  // Volver arriba: si no, el header sticky queda duplicado en el fullPage.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

async function shot(persona, width, name) {
  const { browser, page } = await nuevaPagina(persona, width);
  await page.goto(`${BASE}/app/estudiante`, { waitUntil: "networkidle" });
  await preparada(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  // Detalle de la credencial sola, para revisión fina.
  await page
    .getByTestId("tier-card")
    .screenshot({ path: `${OUT}/${name}-credencial.png` });
  await browser.close();
  console.log("ok", name);
}

// Plan con anillo: student-new compra y paga la cuota 1 → anillo 1/3.
async function ringShot(width, name) {
  const { browser, page } = await nuevaPagina("student-new", width);
  // Compra del caso base: /checkout/pc abre el plan con anticipo. El demo
  // va por query con la dirección del estudiante (como en el spec e2e).
  await page.goto(
    `${BASE}/checkout/pc?demo=LazoEstudianteNuevo1111111111111111111111`,
    { waitUntil: "networkidle" },
  );
  await page.getByText(/tu saldo devusdc|your devusdc balance/i).waitFor();
  await page.getByRole("button", { name: /pagar anticipo y abrir plan|pay down/i }).click();
  await page.getByRole("button", { name: /firmar y abrir plan|sign & open/i }).click();
  await page.getByRole("heading", { name: /listo, plan abierto|done/i }).waitFor({ timeout: 30_000 });

  // Ir a la cuenta y pagar la cuota 1 para ver el anillo a 1/3.
  await page.goto(`${BASE}/app/estudiante`, { waitUntil: "networkidle" });
  await page.getByTestId("account-plan").waitFor({ timeout: 30_000 });
  await page.getByTestId("pay-installment-cta").click();
  await page.getByRole("button", { name: /aprobar y pagar|approve & pay/i }).click();
  await page
    .getByRole("heading", { name: /cuota 1 pagada|installment 1 paid/i })
    .waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /^listo$|^done$/i }).click();
  await preparada(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  // El header sticky tapa el tope de la tarjeta en la captura de elemento.
  await page.addStyleTag({
    content: "header.sticky { position: static !important; }",
  });
  await page
    .getByTestId("account-plan")
    .screenshot({ path: `${OUT}/${name}-plan.png` });
  await browser.close();
  console.log("ok", name);
}

const mode = process.argv[2] ?? "all";
if (mode === "personas" || mode === "all") {
  await shot("student-new", 390, "07-comprador-nuevo-390");
  await shot("student-new", 1440, "07-comprador-nuevo-1440");
  await shot("student-tier3", 390, "07-comprador-tier4-390");
  await shot("student-tier3", 1440, "07-comprador-tier4-1440");
}
if (mode === "ring" || mode === "all") {
  await ringShot(390, "07-plan-anillo-390");
  await ringShot(1440, "07-plan-anillo-1440");
}
