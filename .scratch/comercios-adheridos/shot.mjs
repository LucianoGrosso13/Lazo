import { chromium } from "playwright";

const OUT = new URL(".", import.meta.url).pathname;
const base = "http://localhost:3000";

const shots = [
  { name: "tienda-desktop-es", locale: "es", width: 1440, height: 900 },
  { name: "tienda-desktop-en", locale: "en", width: 1440, height: 900 },
  { name: "tienda-mobile-es", locale: "es", width: 390, height: 844 },
  { name: "tienda-mobile-en", locale: "en", width: 390, height: 844 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
    locale: s.locale === "es" ? "es-AR" : "en-US",
  });
  await ctx.addInitScript((loc) => {
    window.localStorage.setItem("lazo.locale", loc);
  }, s.locale);
  const page = await ctx.newPage();
  await page.goto(`${base}/tienda`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  // Directorio completo a la vista
  const dir = page.locator("section[aria-labelledby='dir-title'], .glass:has(#dir-title)").first();
  await page.screenshot({ path: `${OUT}${s.name}-full.png`, fullPage: true });
  if (await dir.count()) {
    await dir.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await dir.screenshot({ path: `${OUT}${s.name}-dir.png` });
  }
  await ctx.close();
  console.log("ok", s.name);
}
await browser.close();
