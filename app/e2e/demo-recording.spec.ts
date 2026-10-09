// Controlled mock rehearsal, never evidence of Phantom or devnet transfers.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { DEMO_STUDENT_NEW } from "../src/lib/cuotas/accounts-types";

async function keyboardActivate(page: Page, target: Locator) {
  for (let i = 0; i < 80; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) {
      await page.keyboard.press("Enter");
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("CTA could not be reached with the keyboard");
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test.describe(`EN recording rehearsal ${viewport.width}px`, () => {
    test.use({ viewport, reducedMotion: "reduce" });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("lazo.locale", "en"));
    });

    test("keyboard purchase and early payment preserve amounts and dates after reload", async ({ page }, info) => {
      test.setTimeout(120_000);
      await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
      await expect(page.getByText(/your devUSDC balance/i)).toBeVisible();
      await keyboardActivate(page, page.getByRole("button", { name: /pay down payment/i }));
      await expect(page.getByRole("heading", { name: "Check what you're signing" })).toBeFocused();
      await page.screenshot({ path: info.outputPath("purchase-review.png"), fullPage: true });
      await keyboardActivate(page, page.getByRole("button", { name: "Sign & open plan" }));
      await expect(page.getByTestId("tx-progress").getByRole("status")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Done, plan opened" })).toBeFocused();
      await expect(page.getByTestId("pending-fact")).toContainText("700.00");
      const readPlan = () => page.evaluate((student) => {
        const state = JSON.parse(localStorage.getItem("lazo.mock.v3")!);
        return state.plans.find((p: { student: string; status: string }) => p.student === student && p.status === "Active");
      }, DEMO_STUDENT_NEW);
      const before = await readPlan();
      expect(before.installments.map((i: { amount: number }) => i.amount)).toEqual([233_333_333, 233_333_333, 233_333_334]);
      expect(before.installments.map((i: { dueAt: number }) => i.dueAt - before.openedAt)).toEqual([30, 60, 90].map((d) => d * 86400));
      await keyboardActivate(page, page.getByTestId("exact-amounts").locator("summary"));
      await expect(page.getByTestId("exact-amounts")).toContainText("233.333334");
      await page.screenshot({ path: info.outputPath("purchase-success.png"), fullPage: true });
      await keyboardActivate(page, page.getByTestId("pay-installment-cta"));
      const panel = page.getByTestId("pay-panel");
      await expect(panel.getByRole("heading", { name: "Review your payment" })).toBeFocused();
      await expect(page.getByTestId("pay-exact-amount")).toContainText("233.333333");
      await expect(panel).toContainText("Solana devnet");
      await page.screenshot({ path: info.outputPath("installment-review.png"), fullPage: true });
      await keyboardActivate(page, panel.getByRole("button", { name: "Approve & pay" }));
      await expect(page.getByTestId("tx-progress").getByRole("status")).toBeVisible();
      await expect(panel.getByRole("heading", { name: "Installment 1 paid" })).toBeFocused();
      await expect(panel).toContainText("2 installments left");
      await expect(page.getByTestId("pay-new-balance")).toContainText("1,466.67");
      await expect(page.getByTestId("pending-fact")).toContainText("466.67");
      const after = await readPlan();
      expect(after.installments.map((i: { dueAt: number }) => i.dueAt)).toEqual(before.installments.map((i: { dueAt: number }) => i.dueAt));
      expect(after.installments.slice(1).reduce((n: number, i: { amount: number }) => n + i.amount, 0)).toBe(466_666_667);
      await page.screenshot({ path: info.outputPath("installment-success.png"), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await keyboardActivate(page, panel.getByRole("button", { name: "Done", exact: true }));
      await page.evaluate(() => localStorage.setItem("lazo.cuenta.demo.v1", "student-new"));
      await page.goto("/app/estudiante");
      await page.reload();
      await expect(page.getByTestId("account-plan")).toBeVisible();
      await expect(page.getByTestId("pay-installment-cta")).toContainText("installment 2");
      expect((await readPlan()).installments[0].status).toBe("Paid");
    });
  });
}

test("restored uncertain payment opens its original review and never resends", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`/checkout/pc?demo=${DEMO_STUDENT_NEW}`);
  await page.getByRole("button", { name: /pagar anticipo|pay down/i }).click();
  await page.getByRole("button", { name: /firmar y abrir|sign & open/i }).click();
  await expect(page.getByTestId("plan-calendar")).toBeVisible();
  // Install the controlled observation before the next document loads:
  // the previous page's live mock store must not overwrite the fixture.
  await page.addInitScript((student) => {
    const state = JSON.parse(localStorage.getItem("lazo.mock.v3")!);
    const plan = state.plans.find((p: { student: string }) => p.student === student);
    // Controlled late observation: installment 2 looks paid, but an
    // unrelated/unknown signature is not proof of this payment.
    plan.installments[0].status = "Paid";
    plan.installments[1].status = "Paid";
    plan.installments[0].paidAt = plan.openedAt + 1;
    plan.installments[1].paidAt = plan.openedAt + 2;
    localStorage.setItem("lazo.mock.v3", JSON.stringify(state));
    sessionStorage.setItem(`lazo.pay.pending.${student}.${plan.id}`, JSON.stringify({
      operation: "pay_installment", student, planId: plan.id,
      signature: "4".repeat(88), expectedInstallmentIndex: 1,
      expectedOpenedAt: plan.openedAt,
    }));
    localStorage.setItem("lazo.cuenta.demo.v1", "student-new");
  }, DEMO_STUDENT_NEW);
  await page.goto("/app/estudiante");
  const panel = page.getByTestId("pay-panel");
  await expect(panel.getByTestId("tx-uncertain")).toBeVisible();
  await expect(panel.getByTestId("pay-exact-amount")).toContainText(/233[,.]333333/);
  await expect(panel).toContainText(/cuota 2|installment 2/i);
  await expect(panel.getByRole("button", { name: /aprobar y pagar|approve & pay/i })).toHaveCount(0);
  await panel.getByRole("button", { name: /verificar en la cadena|verify on chain/i }).click();
  await expect(panel).toContainText(/todavía no la vemos confirmada|not confirmed/i, { timeout: 20_000 });
  await expect(panel.getByRole("button", { name: /aprobar y pagar|approve & pay/i })).toHaveCount(0);
  const status = await page.evaluate((student) => {
    const state = JSON.parse(localStorage.getItem("lazo.mock.v3")!);
    return state.plans.find((p: { student: string }) => p.student === student).installments.map((i: { status: string }) => i.status);
  }, DEMO_STUDENT_NEW);
  expect(status).toEqual(["Paid", "Paid", "Upcoming"]);
});
