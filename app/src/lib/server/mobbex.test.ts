import { describe, expect, it } from "vitest";
import {
  createMobbexSubscriber,
  executeMobbexCharge,
  extractSavedCard,
  getMobbexOperation,
  getMobbexSubscriber,
  microUsdcToArs,
} from "./mobbex";

const withMobbexEnv = (fn: () => void | Promise<void>) => async () => {
  const saved = { ...process.env };
  process.env.MOBBEX_API_KEY = "test-key";
  process.env.MOBBEX_ACCESS_TOKEN = "test-token";
  process.env.MOBBEX_SUBSCRIPTION_ID = "sub-test";
  process.env.MOBBEX_TEST_MODE = "true";
  try {
    await fn();
  } finally {
    process.env = saved;
  }
};

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("mobbex subscribers and charges", () => {
  it(
    "creates a subscriber and returns the hosted card URL",
    withMobbexEnv(async () => {
      const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
        expect(String(url)).toBe("https://api.mobbex.com/p/subscriptions/sub-test/subscriber");
        expect((init?.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
        expect((init?.headers as Record<string, string>)["x-access-token"]).toBe("test-token");
        return jsonRes(200, {
          result: true,
          data: { uid: "sid-1", sourceUrl: "https://mobbex.com/p/subscribe/x", subscriberUrl: "https://mobbex.com/p/sub/y" },
        });
      }) as typeof fetch;
      const s = await createMobbexSubscriber({ name: "Garante", reference: "ref-1" }, { fetchFn });
      expect(s).toEqual({
        subscriberId: "sid-1",
        sourceUrl: "https://mobbex.com/p/subscribe/x",
        subscriberUrl: "https://mobbex.com/p/sub/y",
      });
    }),
  );

  it(
    "executes a variable charge and verifies it via operations",
    withMobbexEnv(async () => {
      const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
        const u = String(url);
        if (u.includes("/execution")) {
          const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
          expect(body).toEqual({ total: 150.5, reference: "lazo-plan-1", description: "Cuota 2 + punitorio" });
          return jsonRes(200, { result: true, data: { execution: { uid: "exe-1" }, payment: { id: "pay-1" }, total: 150.5 } });
        }
        return jsonRes(200, {
          result: true,
          data: { transaction: { payment: { id: "pay-1", status: { code: "200" }, total: 150.5, reference: "lazo-plan-1" } } },
        });
      }) as typeof fetch;
      const c = await executeMobbexCharge(
        { subscriberId: "sid-1", totalArs: 150.5, reference: "lazo-plan-1", description: "Cuota 2 + punitorio" },
        { fetchFn },
      );
      expect(c.executionUid).toBe("exe-1");
      const op = await getMobbexOperation("pay-1", { fetchFn });
      expect(op).toEqual({ approved: true, statusCode: "200", total: 150.5, reference: "lazo-plan-1", paymentId: "pay-1" });
    }),
  );

  it(
    "reports declined operations instead of approving them",
    withMobbexEnv(async () => {
      const fetchFn = (async () =>
        jsonRes(200, { result: true, data: { transaction: { payment: { id: "p", status: { code: "410" }, total: 10, reference: "r" } } } })) as typeof fetch;
      const op = await getMobbexOperation("p", { fetchFn });
      expect(op.approved).toBe(false);
      expect(op.statusCode).toBe("410");
    }),
  );

  it(
    "maps gateway failures explicitly; never a fake success",
    withMobbexEnv(async () => {
      const failing = (async () => jsonRes(500, { result: false, error: "sandbox down" })) as typeof fetch;
      await expect(
        executeMobbexCharge({ subscriberId: "s", totalArs: 10, reference: "r", description: "d" }, { fetchFn: failing }),
      ).rejects.toThrowError(expect.objectContaining({ code: "mobbex_request_failed", status: 500 }));
      const down = (async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch;
      await expect(
        executeMobbexCharge({ subscriberId: "s", totalArs: 10, reference: "r", description: "d" }, { fetchFn: down }),
      ).rejects.toThrowError(expect.objectContaining({ code: "mobbex_unreachable" }));
      const badShape = (async () => jsonRes(200, { result: true, data: {} })) as typeof fetch;
      await expect(createMobbexSubscriber({ name: "G", reference: "r" }, { fetchFn: badShape })).rejects.toThrowError(
        expect.objectContaining({ code: "mobbex_bad_response" }),
      );
    }),
  );

  it("fails closed without credentials", async () => {
    const saved = { ...process.env };
    delete process.env.MOBBEX_API_KEY;
    try {
      const fetchFn = (async () => jsonRes(200, { result: true, data: {} })) as typeof fetch;
      await expect(
        executeMobbexCharge({ subscriberId: "s", totalArs: 10, reference: "r", description: "d" }, { fetchFn }),
      ).rejects.toThrowError(expect.objectContaining({ code: "mobbex_not_configured" }));
    } finally {
      process.env = saved;
    }
  });

  it("defaults to sandbox test mode when the switch is absent", async () => {
    const saved = { ...process.env };
    process.env.MOBBEX_API_KEY = "k";
    process.env.MOBBEX_ACCESS_TOKEN = "t";
    process.env.MOBBEX_SUBSCRIPTION_ID = "s";
    delete process.env.MOBBEX_TEST_MODE;
    try {
      const fetchFn = (async () => jsonRes(200, { result: true, data: { uid: "sid", sourceUrl: "u" } })) as typeof fetch;
      const s = await createMobbexSubscriber({ name: "G", reference: "r" }, { fetchFn });
      expect(s.subscriberId).toBe("sid");
    } finally {
      process.env = saved;
    }
  });

  it("refuses to run outside sandbox test mode", async () => {
    const saved = { ...process.env };
    process.env.MOBBEX_API_KEY = "k";
    process.env.MOBBEX_ACCESS_TOKEN = "t";
    process.env.MOBBEX_SUBSCRIPTION_ID = "s";
    process.env.MOBBEX_TEST_MODE = "false";
    try {
      const fetchFn = (async () => jsonRes(200, { result: true, data: {} })) as typeof fetch;
      await expect(
        executeMobbexCharge({ subscriberId: "s", totalArs: 10, reference: "r", description: "d" }, { fetchFn }),
      ).rejects.toThrowError(expect.objectContaining({ code: "mobbex_live_refused" }));
    } finally {
      process.env = saved;
    }
  });
});

describe("saved card extraction", () => {
  it("accepts masked numbers and builds a display label", () => {
    expect(extractSavedCard({ result: true, data: { source: { name: "Visa", number: "450799******0010" } } })).toEqual({
      linked: true,
      cardLabel: "Visa •••• 0010",
      reason: null,
    });
  });

  it("refuses anything shaped like a full PAN", () => {
    expect(extractSavedCard({ data: { source: { name: "Visa", number: "4507990000000010" } } })).toEqual({
      linked: false,
      cardLabel: null,
      reason: "card_data_refused",
    });
  });

  it("fails closed on unknown shapes", () => {
    expect(extractSavedCard({ result: true, data: {} })).toEqual({ linked: false, cardLabel: null, reason: "no_card_source" });
    expect(extractSavedCard(null)).toEqual({ linked: false, cardLabel: null, reason: "no_card_source" });
  });
});

describe("getMobbexSubscriber", () => {
  it(
    "returns card state from the API payload",
    withMobbexEnv(async () => {
      const fetchFn = (async () =>
        jsonRes(200, { result: true, data: { source: { name: "Mastercard", number: "532362******1008" } } })) as typeof fetch;
      const s = await getMobbexSubscriber("sid-1", { fetchFn });
      expect(s.linked).toBe(true);
      expect(s.cardLabel).toBe("Mastercard •••• 1008");
    }),
  );
});

describe("microUsdcToArs", () => {
  it("converts with 2-decimal precision", () => {
    // 233.33 USDC at 1000 ARS/USDC -> 233330.00 ARS.
    expect(microUsdcToArs(233_330_000, 1000)).toBe(233330);
    // Rounding half up at the cent boundary.
    expect(microUsdcToArs(1_005, 1000)).toBe(1.01);
    expect(microUsdcToArs(1_004, 1000)).toBe(1);
  });

  it("rejects invalid inputs", () => {
    expect(() => microUsdcToArs(0, 1000)).toThrowError(expect.objectContaining({ code: "mobbex_bad_response" }));
    expect(() => microUsdcToArs(100, 0)).toThrowError(expect.objectContaining({ code: "mobbex_bad_response" }));
  });
});
