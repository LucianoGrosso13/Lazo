// Capturas del ticket 09: /para-estudiantes a 390 y 1440, ES y EN.
// Uso: node .scratch/web-completa/capture-09.mjs  (con el dev server en :3109)
import { chromium } from "../../app/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3109";
import { fileURLToPath } from "node:url";
const OUT = fileURLToPath(new URL("./evidence/", import.meta.url));

const shots = [
  { locale: "es", width: 390, height: 844, name: "09-para-estudiantes-390" },
  { locale: "es", width: 1440, height: 900, name: "09-para-estudiantes-1440" },
  { locale: "en", width: 390, height: 844, name: "09-para-estudiantes-en-390" },
  { locale: "en", width: 1440, height: 900, name: "09-para-estudiantes-en-1440" },
];

const browser = await chromium.launch();
for (const { locale, width, height, name } of shots) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: width < 500,
  });
  const page = await ctx.newPage();
  await page.addInitScript((l) => window.localStorage.setItem("lazo.locale", l), locale);
  await page.goto(`${BASE}/para-estudiantes`, { waitUntil: "networkidle" });
  const scrollOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  console.log(`${name}: overflow=${scrollOverflow}px`);
  await ctx.close();
}
await browser.close();
