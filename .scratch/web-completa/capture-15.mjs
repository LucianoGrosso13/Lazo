// Capturas del ticket 15: todas las rutas públicas a 390×844 y 1440×900,
// en español. Las cuentas usan la identidad demo correspondiente
// (`lazo.cuenta.demo.v1` en localStorage) para mostrar estado real.
// JPEG a 1x para no inflar el repo. ONLY=nombre,nombre captura solo esas rutas.
// Uso: node .scratch/web-completa/capture-15.mjs  (con el dev server en :3115)
import { chromium } from "../../app/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3115";
import { fileURLToPath } from "node:url";
const OUT = fileURLToPath(new URL("./evidence/", import.meta.url));

// Perfil público de un comercio del directorio (Voltia).
const VOLTIA = "GQ6U8joxnXmYhbYhdDTpy8QtxAHxQ8kV5MCKBjYzF7CD";

const routes = [
  { path: "/", name: "home" },
  { path: "/tienda", name: "tienda" },
  { path: "/checkout/pc", name: "checkout-pc" },
  { path: "/comercio", name: "comercio" },
  { path: `/comercio/${VOLTIA}`, name: "comercio-perfil" },
  { path: "/para-estudiantes", name: "para-estudiantes" },
  { path: "/para-comercios", name: "para-comercios" },
  { path: "/para-inversores", name: "para-inversores" },
  { path: "/pool", name: "pool" },
  { path: "/app", name: "app" },
  { path: "/app/estudiante", name: "app-estudiante", demo: "student-tier3" },
  { path: "/app/comercio", name: "app-comercio", demo: "merchant" },
  { path: "/app/admin", name: "app-admin", demo: "admin" },
  { path: "/account", name: "account", demo: "student-tier3" },
  { path: "/design", name: "design" },
];

const viewports = [
  { width: 390, height: 844, suffix: "390" },
  { width: 1440, height: 900, suffix: "1440" },
];

const only = process.env.ONLY?.split(",");
const browser = await chromium.launch();
for (const { path, name, demo } of routes) {
  if (only && !only.includes(name)) continue;
  for (const { width, height, suffix } of viewports) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: width < 500,
      hasTouch: width < 500,
    });
    const page = await ctx.newPage();
    await page.addInitScript(
      (sel) => {
        window.localStorage.setItem("lazo.locale", "es");
        if (sel) window.localStorage.setItem("lazo.cuenta.demo.v1", sel);
      },
      demo ?? null,
    );
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    const shot = `15-${name}-${suffix}.jpg`;
    await page.screenshot({ path: `${OUT}${shot}`, fullPage: true, type: "jpeg", quality: 80 });
    console.log(`${shot}  overflow-x=${overflow}px`);
    await ctx.close();
  }
}
await browser.close();
