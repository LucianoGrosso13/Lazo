// Evidencia ticket 08 (cierre): recorrido completo de la demo pulida a
// 1440 y 390 px contra el dev server en :3108 (NEXT_PUBLIC_CUOTAS_MODE=mock).
//
// Cubre: landing (hero con prisma 3D, comparación siempre abierta, escalera,
// números), /tienda (fotos reales, chip de margen, badge), /checkout/pc
// (desglose → éxito), card de bloqueo por margen (PC comprada → notebook no
// entra en el margen restante) y header con la marca 3D.
//
// Uso: node .scratch/demo-polish/evidence/capture-ticket-08.mjs
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../app/package.json"),
);
const { chromium } = require("@playwright/test");

const OUT = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3108";
const TIER3 = "LazoEstudianteEscalon3111111111111111111111";

const seedDemo = `
  window.localStorage.setItem("lazo.cuenta.demo.v1", "student-tier3");
  window.localStorage.setItem("lazo.locale", "es");
`;

const noOverflow = async (page) =>
  page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    ok: document.documentElement.scrollWidth <= window.innerWidth,
  }));

// Espera al canvas 3D si WebGL2 está disponible; si no, el fallback SVG queda.
async function waitStage(page, ms = 2500) {
  try {
    await page.locator("canvas[data-ready]").first().waitFor({ timeout: 4000 });
  } catch {
    /* sin WebGL: queda el fallback estático, igual es evidencia válida */
  }
  await page.waitForTimeout(ms);
}

async function openPlan(page, producto) {
  await page.goto(`${BASE}/checkout/${producto}?demo=${TIER3}`);
  await page.getByRole("button", { name: /Abrir plan|Pagar anticipo/ }).click();
  await page.getByRole("button", { name: "Firmar y abrir plan" }).click();
  await page.getByText("Listo, plan abierto").waitFor();
}

const browser = await chromium.launch();

// ---------- Desktop 1440 ----------
const ctx = await browser.newContext({ locale: "es-AR", viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(seedDemo);
const page = await ctx.newPage();

// Landing: hero con prisma 3D + página completa (comparación abierta, escalera, números, marca 3D).
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await waitStage(page);
await page.screenshot({ path: path.join(OUT, "08-landing-hero-1440.png") });
await page.screenshot({ path: path.join(OUT, "08-landing-full-1440.png"), fullPage: true });
console.log("landing 1440:", await noOverflow(page));

// Tienda con identidad demo: chip de margen lleno, fotos, badge.
await page.goto(`${BASE}/tienda`);
await page.getByText(/Margen:/).waitFor();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(OUT, "08-tienda-1440.png"), fullPage: true });
console.log("tienda 1440:", await noOverflow(page));

// Checkout PC: desglose → confirmación → éxito.
await page.goto(`${BASE}/checkout/pc?demo=${TIER3}`);
await waitStage(page, 1200);
await page.screenshot({ path: path.join(OUT, "08-checkout-desglose-1440.png"), fullPage: true });
console.log("checkout desglose 1440:", await noOverflow(page));

await openPlan(page, "pc");
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(OUT, "08-checkout-exito-1440.png"), fullPage: true });
console.log("checkout éxito 1440:", await noOverflow(page));

const mockState = await page.evaluate(() => window.localStorage.getItem("lazo.mock.v2"));
console.log("mock state bytes:", mockState?.length ?? 0);

// Card de bloqueo: con la PC abierta quedan US$500 de margen; la notebook (650) no entra.
await page.goto(`${BASE}/checkout/notebook?demo=${TIER3}`);
await page.getByText("Todavía no podés comprar esto").first().waitFor();
await page.getByText("Margen en uso").waitFor();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, "08-checkout-bloqueado-1440.png"), fullPage: true });
console.log("checkout bloqueado 1440:", await noOverflow(page));
console.log("meter aria:", await page.locator("[role=meter]").getAttribute("aria-valuetext"));

// Header con la marca 3D (clip del encabezado).
await page.goto(`${BASE}/tienda`);
await page.getByText(/Margen:/).waitFor();
const header = page.locator("header").first();
await header.screenshot({ path: path.join(OUT, "08-header-logo-1440.png") });
await ctx.close();

// ---------- Mobile 390 (mismo estado sembrado: PC ya comprada) ----------
const mctx = await browser.newContext({ locale: "es-AR", viewport: { width: 390, height: 844 } });
await mctx.addInitScript(seedDemo);
await mctx.addInitScript(`window.localStorage.setItem("lazo.mock.v2", ${JSON.stringify(mockState)});`);
const mpage = await mctx.newPage();

await mpage.goto(`${BASE}/`, { waitUntil: "networkidle" });
await waitStage(mpage);
await mpage.screenshot({ path: path.join(OUT, "08-landing-hero-390.png") });
await mpage.screenshot({ path: path.join(OUT, "08-landing-full-390.png"), fullPage: true });
console.log("landing 390:", await noOverflow(mpage));

await mpage.goto(`${BASE}/tienda`);
await mpage.getByText(/Margen:/).waitFor();
await mpage.waitForTimeout(600);
await mpage.screenshot({ path: path.join(OUT, "08-tienda-390.png"), fullPage: true });
console.log("tienda 390:", await noOverflow(mpage));

// Bloqueo por margen en mobile también.
await mpage.goto(`${BASE}/checkout/notebook?demo=${TIER3}`);
await mpage.getByText("Todavía no podés comprar esto").first().waitFor();
await mpage.waitForTimeout(900);
await mpage.screenshot({ path: path.join(OUT, "08-checkout-bloqueado-390.png"), fullPage: true });
console.log("checkout bloqueado 390:", await noOverflow(mpage));

// Éxito en mobile: el curso (US$120) entra en el margen restante (US$500).
await mpage.goto(`${BASE}/checkout/curso?demo=${TIER3}`);
await mpage.getByRole("button", { name: /Abrir plan|Pagar anticipo/ }).click();
await mpage.getByRole("button", { name: "Firmar y abrir plan" }).click();
await mpage.getByText("Listo, plan abierto").waitFor();
await mpage.waitForTimeout(600);
await mpage.screenshot({ path: path.join(OUT, "08-checkout-exito-390.png"), fullPage: true });
console.log("checkout éxito 390:", await noOverflow(mpage));
await mctx.close();

await browser.close();
console.log("listo 08");
