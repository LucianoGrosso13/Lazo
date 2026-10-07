// Capturas del ticket 12: /tienda a 390 y 1440, ES y EN, invitada y con
// estudiante demo seleccionado (la selección vive en localStorage).
// Uso: node .scratch/web-completa/capture-12.mjs  (con el dev server en :3112)
import { chromium } from "../../app/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3112";
import { fileURLToPath } from "node:url";
const OUT = fileURLToPath(new URL("./evidence/", import.meta.url));

const shots = [
  { locale: "es", width: 390, height: 844, name: "12-tienda-390" },
  { locale: "es", width: 1440, height: 900, name: "12-tienda-1440" },
  { locale: "en", width: 390, height: 844, name: "12-tienda-en-390" },
  { locale: "en", width: 1440, height: 900, name: "12-tienda-en-1440" },
  {
    locale: "es",
    width: 390,
    height: 844,
    name: "12-tienda-estudiante-390",
    demoSelection: "student-tier3",
  },
];

const browser = await chromium.launch();
for (const { locale, width, height, name, demoSelection } of shots) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: width < 500,
    hasTouch: width < 500,
  });
  const page = await ctx.newPage();
  await page.addInitScript(
    ([l, sel]) => {
      window.localStorage.setItem("lazo.locale", l);
      if (sel) window.localStorage.setItem("lazo.cuenta.demo.v1", sel);
    },
    [locale, demoSelection ?? null],
  );
  await page.goto(`${BASE}/tienda`, { waitUntil: "networkidle" });
  const report = await page.evaluate(() => {
    const overflow =
      document.documentElement.scrollWidth - document.documentElement.clientWidth;
    // El link propio del ticket (no el del nav ni el del footer).
    const link = [...document.querySelectorAll("a")].find(
      (a) =>
        a.getAttribute("href") === "/comercio" &&
        /más comercios|more merchants/i.test(a.textContent ?? ""),
    );
    const altLine = /6 cuotas de US\$|6 installments of US\$/.test(
      document.body.innerText,
    );
    const r = link?.getBoundingClientRect();
    return {
      overflow,
      altLine,
      moreLink: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
    };
  });
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  console.log(`${name}: ${JSON.stringify(report)}`);
  await ctx.close();
}
await browser.close();
