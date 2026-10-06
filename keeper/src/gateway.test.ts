import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { KeeperEnv } from "./config.ts";
import { GatewayError, MobbexGateway, chargeReference, microUsdcToArs, receiptHashFor } from "./gateway.ts";

const env = (over: Partial<KeeperEnv> = {}): KeeperEnv => ({
  rpcUrl: "https://api.devnet.solana.com",
  dataDir: "/tmp/lazo-gateway-test",
  pollSeconds: 15,
  fiadorDataDir: null,
  mobbexApiKey: "k",
  mobbexAccessToken: "t",
  mobbexSubscriptionId: "sub",
  mobbexArsPerUsdc: 1000,
  allowSimulatedRecovery: false,
  keeperKeypairPath: null,
  ...over,
});

const jsonRes = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("gateway helpers", () => {
  it("builds unique references and deterministic receipt hashes", () => {
    assert.equal(chargeReference("p1", 1_799_000_000, 0), "lazo-p1-1799000000-i0-a1");
    assert.equal(chargeReference("p1", 1_799_000_000, 2, 3), "lazo-p1-1799000000-i2-a3");
    const h = receiptHashFor({ paymentId: "p", total: 10.5, reference: "r", statusCode: "200" });
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(h, receiptHashFor({ paymentId: "p", total: 10.5, reference: "r", statusCode: "200" }));
    assert.notEqual(h, receiptHashFor({ paymentId: "p", total: 10.51, reference: "r", statusCode: "200" }));
  });

  it("converts micro-USDC to ARS with 2-decimal precision", () => {
    assert.equal(microUsdcToArs(244_996_500, 1000), 244996.5);
    assert.throws(() => microUsdcToArs(0, 1000), (e: unknown) => e instanceof GatewayError);
  });
});

describe("MobbexGateway", () => {
  it("executes and verifies the charge via the operations API", async () => {
    const seen: string[] = [];
    const fetchFn = (async (url: string | URL | Request) => {
      const u = String(url);
      seen.push(u);
      if (u.includes("/execution")) {
        return jsonRes(200, { result: true, data: { execution: { uid: "exe-1" }, payment: { id: "pay-1" } } });
      }
      return jsonRes(200, {
        result: true,
        data: { transaction: { payment: { id: "pay-1", status: { code: "200" }, total: 100, reference: "ref-1" } } },
      });
    }) as typeof fetch;
    const gw = new MobbexGateway(env(), fetchFn);
    const r = await gw.charge({ subscriberId: "sid", totalArs: 100, reference: "ref-1", description: "d" });
    assert.equal(r.simulated, false);
    if (r.simulated) throw new Error("unreachable");
    assert.equal(r.approved, true);
    assert.equal(r.executionUid, "exe-1");
    assert.ok(r.receiptHash);
    assert.ok(seen.some((u) => u.includes("/p/operations/pay-1")));
  });

  it("reports declines without a receipt hash", async () => {
    const fetchFn = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/execution")) return jsonRes(200, { result: true, data: { execution: { uid: "e" } } });
      return jsonRes(200, {
        result: true,
        data: { transaction: { payment: { id: "p", status: { code: "410" }, total: 5, reference: "r" } } },
      });
    }) as typeof fetch;
    const r = await new MobbexGateway(env(), fetchFn).charge({ subscriberId: "s", totalArs: 5, reference: "r", description: "d" });
    assert.equal(r.simulated, false);
    if (r.simulated) throw new Error("unreachable");
    assert.equal(r.approved, false);
    assert.equal(r.receiptHash, null);
  });

  it("maps gateway failures explicitly", async () => {
    const failing = (async () => jsonRes(500, { result: false })) as typeof fetch;
    await assert.rejects(
      new MobbexGateway(env(), failing).charge({ subscriberId: "s", totalArs: 5, reference: "r", description: "d" }),
      (e: unknown) => e instanceof GatewayError && e.code === "gateway_request_failed",
    );
    const down = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    await assert.rejects(
      new MobbexGateway(env(), down).charge({ subscriberId: "s", totalArs: 5, reference: "r", description: "d" }),
      (e: unknown) => e instanceof GatewayError && e.code === "gateway_unreachable",
    );
  });

  it("fails closed without credentials, or declares plan C when enabled", async () => {
    const noCreds = env({ mobbexApiKey: null });
    const fetchFn = (async () => jsonRes(200, { result: true, data: {} })) as typeof fetch;
    await assert.rejects(
      new MobbexGateway(noCreds, fetchFn).charge({ subscriberId: "s", totalArs: 5, reference: "r", description: "d" }),
      (e: unknown) => e instanceof GatewayError && e.code === "gateway_not_configured",
    );
    const planC = await new MobbexGateway(env({ mobbexApiKey: null, allowSimulatedRecovery: true }), fetchFn).charge({
      subscriberId: "s",
      totalArs: 5,
      reference: "r",
      description: "d",
    });
    assert.equal(planC.simulated, true);
  });
});
