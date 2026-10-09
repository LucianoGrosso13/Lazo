import { expect, test } from "@playwright/test";
import { seedState, STORAGE_KEY } from "../src/lib/cuotas/mock/state";
import { DEMO_CONFIG } from "../src/lib/cuotas/demo-config";

test("pool: WebGL en desktop, pausa fuera de pantalla y conserva todos los datos", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/pool");
  const orb = page.getByTestId("pool-orb");
  await expect(orb).toHaveAttribute("data-renderer", "webgl");
  await expect(orb).toHaveAttribute("data-running", "true");
  await expect(page.getByRole("meter", { name: "Utilización" })).toBeAttached();
  await expect(page.getByRole("list", { name: "Rendimiento — referencias" })).toBeAttached();
  await expect(page.getByRole("img", { name: /Tramo junior.*Tramo senior/ })).toBeAttached();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(orb).toHaveAttribute("data-running", "false");
  await orb.scrollIntoViewIfNeeded();
  await expect(orb).toHaveAttribute("data-running", "true");
  expect(errors).toEqual([]);
});

test("pool: 3 movimientos visibles, expandir con teclado y volver a plegar", async ({ page }) => {
  // Extend existing deposits in browser-local test storage, without signing or
  // contacting any network. Production seed and business configuration stay intact.
  const state = seedState(DEMO_CONFIG);
  const event = state.pool.events[0];
  for (let i = 0; i < 3; i++) state.pool.events.push({ ...event, at: event.at + i + 1, signature: `test-deposit-${i}` });
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: STORAGE_KEY, state });
  await page.goto("/pool");
  const history = page.getByTestId("pool-history");
  await expect(history.locator('[data-testid="pool-event"]:visible')).toHaveCount(3);
  const expand = history.getByRole("button", { name: "Ver todos (5)" });
  await expand.focus();
  await page.keyboard.press("Enter");
  await expect(history.locator('[data-testid="pool-event"]:visible')).toHaveCount(5);
  await expect(history.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  await history.getByRole("button", { name: "Ver menos" }).click();
  await expect(history.locator('[data-testid="pool-event"]:visible')).toHaveCount(3);
});

test("pool: sin WebGL, respaldo CSS animado y sin desborde a 390 px", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pool");
  await expect(page.getByTestId("pool-orb")).toHaveAttribute("data-renderer", "css");
  await expect(page.getByTestId("pool-orb")).toHaveAttribute("data-running", "true");
  await expect(page.getByTestId("pool-orb-fallback")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("pool: orbe estático y valor final de rendimiento, también en inglés", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("lazo.locale", "en"));
    await page.goto("/pool");
    const orb = page.getByTestId("pool-orb");
    await expect(orb).toHaveAttribute("data-motion", "static");
    await expect(orb).toHaveAttribute("data-running", "false");
    await expect(page.getByTestId("pool-orb-fallback")).toBeVisible();
    expect(await orb.locator('div').evaluateAll(elements => elements.every(element => getComputedStyle(element).animationName === "none"))).toBe(true);
    await expect(page.getByRole("group", { name: "8 %", exact: true })).toBeVisible();
    await expect(page.getByText("Available", { exact: true })).toBeVisible();
    await expect(page.getByText("Lent out", { exact: true })).toBeVisible();
  });
});
