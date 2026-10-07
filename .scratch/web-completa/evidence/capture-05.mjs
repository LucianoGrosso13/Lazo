// Capturas del ticket 05: checkout 3/6 cuotas a 390px y 1440px.
// Corre con el dev server en :3105 (modo mock).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const BASE = "http://localhost:3105";
const OUT = fileURLToPath(new URL("./web-completa/evidence/", import.meta.url));
const STUDENT = "LazoEstudianteEscalon3111111111111111111111";
const VOLTIA = "GQ6U8joxnXmYhbYhdDTpy8QtxAHxQ8kV5MCKBjYzF7CD";

const check = async (page, label) => {
  const r = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  console.log(`${label}: scrollWidth=${r.sw} clientWidth=${r.cw} ${r.sw <= r.cw ? "OK" : "HORIZONTAL-SCROLL"}`);
};

const browser = await chromium.launch();
for (const vp of [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(`${BASE}/checkout/pc?demo=${STUDENT}`, { waitUntil: "networkidle" });
  // Esperar el desglose con la cotización resuelta + la animación del prisma.
  await page.getByRole("radio", { name: /3 cuotas|3 installments/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}05-checkout-${vp.name}-3cuotas.png`, fullPage: true });
  await check(page, `${vp.name}/3cuotas`);

  // Elegir 6 cuotas y esperar el recalculo (el interés aparece en el desglose).
  await page.getByRole("radio", { name: /6 cuotas|6 installments/ }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}05-checkout-${vp.name}-6cuotas.png`, fullPage: true });
  await check(page, `${vp.name}/6cuotas`);

  await page.close();

  // Hero intacto (referencia visual).
  const h = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await h.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await h.waitForTimeout(1600);
  await h.screenshot({ path: `${OUT}05-hero-${vp.name}.png` });
  await check(h, `hero-${vp.name}`);
  await h.close();
}

// Otro producto del directorio (otro comercio) para probar generalidad.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(`${BASE}/checkout/mochila-universitaria?demo=${STUDENT}`, { waitUntil: "networkidle" });
  await p.getByRole("radio", { name: /6 cuotas|6 installments/ }).waitFor({ timeout: 15000 });
  await p.getByRole("radio", { name: /6 cuotas|6 installments/ }).click();
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}05-checkout-390-otro-producto.png`, fullPage: true });
  await check(p, "390/otro-producto");
  await p.close();
}

// Cobro diferido del comercio: Voltia pasa a deferred_30 en su cuenta (se
// persiste en el estado del mock) y el checkout lo usa sin elegir nada.
// El seed solo se persiste tras una mutación: se adelanta 1 día del reloj
// de demo para que `lazo.mock.v3` exista en localStorage.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(`${BASE}/checkout/pc?demo=${STUDENT}`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /open the demo clock|abrir el reloj/i }).click();
  await p.getByRole("button", { name: /^\+1 (day|día)$/ }).click();
  await p.waitForTimeout(600);
  await p.evaluate((voltia) => {
    const raw = window.localStorage.getItem("lazo.mock.v3");
    if (!raw) throw new Error("sin estado mock");
    const s = JSON.parse(raw);
    s.merchants[voltia].settlementId = "deferred_30";
    window.localStorage.setItem("lazo.mock.v3", JSON.stringify(s));
  }, VOLTIA);
  await p.goto(`${BASE}/checkout/pc?demo=${STUDENT}`, { waitUntil: "networkidle" });
  await p.getByRole("radio", { name: /3 cuotas|3 installments/ }).waitFor({ timeout: 15000 });
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}05-checkout-390-diferido-30.png`, fullPage: true });
  await check(p, "390/diferido-30");
  await p.close();
}

await browser.close();
console.log("listo");
