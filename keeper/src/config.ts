// Keeper configuration from the environment. Names only in errors; values
// are never logged. Devnet-only: any RPC URL that is not devnet/localhost
// is refused, since mainnet and real money are forbidden in the hackathon.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export class KeeperConfigError extends Error {
  readonly code: "missing_env" | "invalid_env";
  readonly envName: string;
  constructor(code: "missing_env" | "invalid_env", envName: string, message?: string) {
    super(message ?? `${code}: ${envName}`);
    this.name = "KeeperConfigError";
    this.code = code;
    this.envName = envName;
  }
}

const raw = (name: string): string | null => {
  const v = process.env[name];
  return v == null || v === "" ? null : v;
};

const required = (name: string): string => {
  const v = raw(name);
  if (!v) throw new KeeperConfigError("missing_env", name);
  return v;
};

const positiveInt = (name: string, fallback: number): number => {
  const v = raw(name);
  if (v == null) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new KeeperConfigError("invalid_env", name, `invalid_env: ${name} must be a positive integer`);
  }
  return n;
};

const HERE = dirname(fileURLToPath(import.meta.url));

export interface KeeperEnv {
  rpcUrl: string;
  dataDir: string;
  pollSeconds: number;
  fiadorDataDir: string | null;
  mobbexApiKey: string | null;
  mobbexAccessToken: string | null;
  mobbexSubscriptionId: string | null;
  mobbexArsPerUsdc: number | null;
  allowSimulatedRecovery: boolean;
  keeperKeypairPath: string | null;
}

function rpcUrl(): string {
  const url = raw("KEEPER_RPC_URL") ?? "https://api.devnet.solana.com";
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const ok =
      host.includes("devnet") || host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
    if (!ok) {
      throw new KeeperConfigError("invalid_env", "KEEPER_RPC_URL", "invalid_env: KEEPER_RPC_URL must be devnet or localhost (mainnet refused)");
    }
    return url;
  } catch (e) {
    if (e instanceof KeeperConfigError) throw e;
    throw new KeeperConfigError("invalid_env", "KEEPER_RPC_URL", "invalid_env: KEEPER_RPC_URL is not a URL");
  }
}

function arsRate(): number | null {
  const v = raw("MOBBEX_ARS_PER_USDC");
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new KeeperConfigError("invalid_env", "MOBBEX_ARS_PER_USDC", "invalid_env: MOBBEX_ARS_PER_USDC must be positive");
  }
  return n;
}

export function loadKeeperEnv(): KeeperEnv {
  return {
    rpcUrl: rpcUrl(),
    dataDir: raw("KEEPER_DATA_DIR") ?? join(HERE, "..", "data"),
    pollSeconds: positiveInt("KEEPER_POLL_SECONDS", 15),
    fiadorDataDir: raw("FIADOR_DATA_DIR"),
    mobbexApiKey: raw("MOBBEX_API_KEY"),
    mobbexAccessToken: raw("MOBBEX_ACCESS_TOKEN"),
    mobbexSubscriptionId: raw("MOBBEX_SUBSCRIPTION_ID"),
    mobbexArsPerUsdc: arsRate(),
    allowSimulatedRecovery: (raw("FIADOR_ALLOW_SIMULATED_RECOVERY") ?? "false") === "true",
    keeperKeypairPath: raw("KEEPER_KEYPAIR_PATH"),
  };
}

/** Throws unless the Mobbex sandbox credentials are all present. */
export function requireMobbexCreds(env: KeeperEnv): { apiKey: string; accessToken: string; subscriptionId: string } {
  if (!env.mobbexApiKey) throw new KeeperConfigError("missing_env", "MOBBEX_API_KEY");
  if (!env.mobbexAccessToken) throw new KeeperConfigError("missing_env", "MOBBEX_ACCESS_TOKEN");
  if (!env.mobbexSubscriptionId) throw new KeeperConfigError("missing_env", "MOBBEX_SUBSCRIPTION_ID");
  if ((raw("MOBBEX_TEST_MODE") ?? "true") !== "true") {
    throw new KeeperConfigError("invalid_env", "MOBBEX_TEST_MODE", "mobbex_live_refused: only sandbox test mode is allowed");
  }
  return { apiKey: env.mobbexApiKey, accessToken: env.mobbexAccessToken, subscriptionId: env.mobbexSubscriptionId };
}

export { required as requireKeeperEnv };
