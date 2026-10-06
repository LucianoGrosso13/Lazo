// Evidencia ticket 03: margen visible en /tienda + card de bloqueo con
// medidor en /checkout. Corre contra el dev server en :3103 (modo mock).
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../app/package.json"),
);
const { chromium } = require("@playwright/test");

const OUT = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3103";
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

async function openNotebookPlan(page) {
  await page.goto(`${BASE}/checkout/notebook?demo=${TIER3}`);
  await page.getByRole("button", { name: /Abrir plan|Pagar anticipo/ }).click();
  await page.getByRole("button", { name: "Firmar y abrir plan" }).click();
  await page.getByText("Listo, plan abierto").waitFor();
  return page.evaluate(() => window.localStorage.getItem("lazo.mock.v2"));
}

const browser = await chromium.launch();

// --- Desktop 1440: recorrido real (abre un plan y luego queda sin margen) ---
const ctx = await browser.newContext({ locale: "es-AR", viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(seedDemo);
const page = await ctx.newPage();

await page.goto(`${BASE}/tienda`);
await page.getByText(/Margen:/).waitFor();
await page.screenshot({ path: path.join(OUT, "03-tienda-margen-lleno-1440.png"), fullPage: true });
console.log("tienda llena:", await noOverflow(page));

const mockState = await openNotebookPlan(page);

await page.goto(`${BASE}/tienda`);
await page.getByText(/Margen: US\$ 850/).first().waitFor();
await page.screenshot({ path: path.join(OUT, "03-tienda-margen-850-1440.png"), fullPage: true });
console.log("tienda 850:", await noOverflow(page));

await page.goto(`${BASE}/checkout/pc?demo=${TIER3}`);
await page.getByText("Todavía no podés comprar esto").first().waitFor();
await page.getByText("Margen en uso").waitFor();
await page.waitForTimeout(900); // que termine la animación del medidor
await page.screenshot({ path: path.join(OUT, "03-checkout-bloqueado-1440.png"), fullPage: true });
console.log("checkout bloqueado:", await noOverflow(page));
console.log(
  "meter aria:",
  await page.locator("[role=meter]").getAttribute("aria-valuetext"),
);
await ctx.close();

// --- Mobile 390: mismo estado sembrado (misma demo, determinista) ---
const mctx = await browser.newContext({ locale: "es-AR", viewport: { width: 390, height: 844 } });
await mctx.addInitScript(seedDemo);
await mctx.addInitScript(
  `window.localStorage.setItem("lazo.mock.v2", ${JSON.stringify(mockState)});`,
);
const mpage = await mctx.newPage();

await mpage.goto(`${BASE}/tienda`);
await mpage.getByText(/Margen:/).waitFor();
await mpage.screenshot({ path: path.join(OUT, "03-tienda-margen-390.png"), fullPage: true });
console.log("tienda mobile:", await noOverflow(mpage));

await mpage.goto(`${BASE}/checkout/pc?demo=${TIER3}`);
await mpage.getByText("Todavía no podés comprar esto").first().waitFor();
await mpage.waitForTimeout(900);
await mpage.screenshot({ path: path.join(OUT, "03-checkout-bloqueado-390.png"), fullPage: true });
console.log("checkout mobile:", await noOverflow(mpage));
await mctx.close();

// --- Reduced motion: el medidor queda estático ---
const rctx = await browser.newContext({
  locale: "es-AR",
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
await rctx.addInitScript(seedDemo);
await rctx.addInitScript(
  `window.localStorage.setItem("lazo.mock.v2", ${JSON.stringify(mockState)});`,
);
const rpage = await rctx.newPage();
await rpage.goto(`${BASE}/checkout/pc?demo=${TIER3}`);
await rpage.getByText("Todavía no podés comprar esto").first().waitFor();
const anim = await rpage.evaluate(() => {
  const el = document.querySelector("[role=meter] span");
  return el ? getComputedStyle(el).animationName : "sin medidor";
});
console.log("reduced-motion animation-name:", anim);
await rpage.screenshot({ path: path.join(OUT, "03-checkout-bloqueado-rm-1440.png"), fullPage: true });
await rctx.close();

await browser.close();
console.log("listo");
