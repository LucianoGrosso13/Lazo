import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KeeperConfigError, loadKeeperEnv, requireMobbexCreds } from "./config.ts";

const withEnv = (vars: Record<string, string | undefined>, fn: () => void): void => {
  const saved = { ...process.env };
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    process.env = saved;
  }
};

describe("keeper config", () => {
  it("defaults to devnet and refuses mainnet", () => {
    withEnv({ KEEPER_RPC_URL: undefined }, () => {
      assert.equal(loadKeeperEnv().rpcUrl, "https://api.devnet.solana.com");
    });
    withEnv({ KEEPER_RPC_URL: "http://localhost:8899" }, () => {
      assert.equal(loadKeeperEnv().rpcUrl, "http://localhost:8899");
    });
    withEnv({ KEEPER_RPC_URL: "https://api.mainnet-beta.solana.com" }, () => {
      assert.throws(() => loadKeeperEnv(), (e: unknown) => e instanceof KeeperConfigError && e.envName === "KEEPER_RPC_URL");
    });
    withEnv({ KEEPER_RPC_URL: "not-a-url" }, () => {
      assert.throws(() => loadKeeperEnv(), (e: unknown) => e instanceof KeeperConfigError);
    });
  });

  it("reads the ARS rate without a default", () => {
    withEnv({ MOBBEX_ARS_PER_USDC: undefined }, () => {
      assert.equal(loadKeeperEnv().mobbexArsPerUsdc, null);
    });
    withEnv({ MOBBEX_ARS_PER_USDC: "1000" }, () => {
      assert.equal(loadKeeperEnv().mobbexArsPerUsdc, 1000);
    });
    withEnv({ MOBBEX_ARS_PER_USDC: "nope" }, () => {
      assert.throws(() => loadKeeperEnv(), (e: unknown) => e instanceof KeeperConfigError);
    });
  });

  it("requires sandbox credentials and refuses live mode", () => {
    withEnv({ MOBBEX_API_KEY: "k", MOBBEX_ACCESS_TOKEN: "t", MOBBEX_SUBSCRIPTION_ID: "s", MOBBEX_TEST_MODE: "true" }, () => {
      assert.deepEqual(requireMobbexCreds(loadKeeperEnv()), { apiKey: "k", accessToken: "t", subscriptionId: "s" });
    });
    withEnv({ MOBBEX_API_KEY: undefined, MOBBEX_ACCESS_TOKEN: "t", MOBBEX_SUBSCRIPTION_ID: "s" }, () => {
      assert.throws(() => requireMobbexCreds(loadKeeperEnv()), (e: unknown) => e instanceof KeeperConfigError);
    });
    withEnv({ MOBBEX_API_KEY: "k", MOBBEX_ACCESS_TOKEN: "t", MOBBEX_SUBSCRIPTION_ID: "s", MOBBEX_TEST_MODE: "false" }, () => {
      assert.throws(
        () => requireMobbexCreds(loadKeeperEnv()),
        (e: unknown) => e instanceof KeeperConfigError && e.envName === "MOBBEX_TEST_MODE",
      );
    });
  });
});
