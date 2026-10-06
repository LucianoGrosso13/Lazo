import { address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { getProtocolConfigEncoder } from "@/generated/accounts/protocolConfig";
import { getReputationEncoder } from "@/generated/accounts/reputation";
import { ProtocolState } from "@/generated/types/protocolState";
import {
  mapProtocolConfig,
  readProtocolConfigWithRpc,
  readStudentTierWithRpc,
  serverQuoteForCap,
  type ServerProtocolConfig,
} from "./chain";

const PROGRAM = "E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ";
const STUDENT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";

const tier = (downPaymentBps: number, maxPurchase: number, guarantorCoverageBps: number) => ({
  downPaymentBps,
  maxPurchase,
  interestBps: 0,
  guarantorCoverageBps,
});

const addr = () => address(STUDENT);
const configFixture = () => ({
  admin: addr(),
  keeper: addr(),
  usdcMint: addr(),
  treasury: addr(),
  feeBps: 700,
  penaltyBps: 500,
  graceDays: 5,
  guarantorChargeDay: 15,
  guarantorNoticeDay: 3,
  secondsPerDay: 86_400,
  installmentIntervalDays: 30,
  minFinancedToCount: 100_000_000,
  guaranteedTiers: [
    tier(3000, 1_000_000_000, 10_000),
    tier(2000, 1_000_000_000, 9000),
    tier(1000, 1_250_000_000, 8000),
    tier(0, 1_500_000_000, 7000),
  ],
  unguaranteedTiers: [tier(5000, 150_000_000, 0), tier(3000, 300_000_000, 0)],
  state: ProtocolState.Normal,
  bump: 1,
});

describe("chain reads through generated codecs", () => {
  it("maps a codec-encoded ProtocolConfig (notice day carried by the codec)", async () => {
    const bytes = getProtocolConfigEncoder().encode(configFixture());
    const b64 = Buffer.from(new Uint8Array(bytes)).toString("base64");
    // The fake ignores the address: every lookup returns the fixture.
    const mapped = await readProtocolConfigWithRpc(
      { getAccountInfo: () => ({ send: async () => ({ context: { slot: 1 }, value: { data: [b64, "base64"], executable: false, lamports: 1, owner: PROGRAM, space: bytes.length } }) }) } as never,
      address(PROGRAM),
    );
    expect(mapped.penaltyBps).toBe(500);
    expect(mapped.guarantorChargeDay).toBe(15);
    expect(mapped.installmentIntervalDays).toBe(30);
    expect(mapped.guaranteedTiers[0]).toEqual({ downPaymentBps: 3000, guarantorCoverageBps: 10_000, maxPurchase: 1_000_000_000 });
    expect(mapped.guarantorNoticeDay).toBe(3);
    expect(mapped.state).toBe("Normal");
  });

  it("still maps an absent notice day to null (never hardcoded)", () => {
    // Defensive path: a decoded account always carries the field since the
    // regen, but map-level absence stays null instead of defaulting.
    const raw = configFixture() as Record<string, unknown>;
    delete raw.guarantorNoticeDay;
    expect(mapProtocolConfig(raw).guarantorNoticeDay).toBeNull();
  });

  it("maps the notice day when the chain carries it", () => {
    // Raw decoded shape (numeric state, bigint amounts) plus the future field.
    const raw = {
      keeper: STUDENT,
      state: 0,
      feeBps: 700,
      penaltyBps: 500,
      graceDays: 5,
      guarantorChargeDay: 15,
      guarantorNoticeDay: 3,
      secondsPerDay: 86_400,
      installmentIntervalDays: 30,
      minFinancedToCount: BigInt(100_000_000),
      guaranteedTiers: [
        { downPaymentBps: 3000, guarantorCoverageBps: 10_000, maxPurchase: BigInt(1_000_000_000) },
        { downPaymentBps: 2000, guarantorCoverageBps: 9000, maxPurchase: BigInt(1_000_000_000) },
        { downPaymentBps: 1000, guarantorCoverageBps: 8000, maxPurchase: BigInt(1_250_000_000) },
        { downPaymentBps: 0, guarantorCoverageBps: 7000, maxPurchase: BigInt(1_500_000_000) },
      ],
    };
    expect(mapProtocolConfig(raw as unknown as Record<string, unknown>).guarantorNoticeDay).toBe(3);
  });

  it("reads tiers from chain or defaults new students to tier 0", async () => {
    const repBytes = getReputationEncoder().encode({ tier: 2, plansCompleted: 2, lateCount: 0, activeExposure: 0, bump: 1 });
    const b64 = Buffer.from(new Uint8Array(repBytes)).toString("base64");
    const present = {
      getAccountInfo: () => ({
        send: async () => ({ context: { slot: 1 }, value: { data: [b64, "base64"], executable: false, lamports: 1, owner: PROGRAM, space: repBytes.length } }),
      }),
    } as never;
    const t = await readStudentTierWithRpc(present, address(PROGRAM), STUDENT);
    expect(t).toEqual({ tier: 2, source: "chain", lateCount: 0, canOpenPlan: true });

    const missing = { getAccountInfo: () => ({ send: async () => ({ context: { slot: 1 }, value: null }) }) } as never;
    const d = await readStudentTierWithRpc(missing, address(PROGRAM), STUDENT);
    expect(d).toEqual({ tier: 0, source: "default", lateCount: 0, canOpenPlan: true });
  });

  it("gates new plans on late_count > 0", async () => {
    const repBytes = getReputationEncoder().encode({ tier: 1, plansCompleted: 1, lateCount: 1, activeExposure: 0, bump: 1 });
    const b64 = Buffer.from(new Uint8Array(repBytes)).toString("base64");
    const rpc = {
      getAccountInfo: () => ({
        send: async () => ({ context: { slot: 1 }, value: { data: [b64, "base64"], executable: false, lamports: 1, owner: PROGRAM, space: repBytes.length } }),
      }),
    } as never;
    const t = await readStudentTierWithRpc(rpc, address(PROGRAM), STUDENT);
    expect(t.canOpenPlan).toBe(false);
    expect(t.lateCount).toBe(1);
  });

  it("maps RPC failures explicitly", async () => {
    const down = { getAccountInfo: () => ({ send: async () => { throw new Error("ECONNREFUSED"); } }) } as never;
    await expect(readProtocolConfigWithRpc(down, address(PROGRAM))).rejects.toThrowError(
      expect.objectContaining({ code: "chain_unreachable" }),
    );
    const missing = { getAccountInfo: () => ({ send: async () => ({ context: { slot: 1 }, value: null }) }) } as never;
    await expect(readProtocolConfigWithRpc(missing, address(PROGRAM))).rejects.toThrowError(
      expect.objectContaining({ code: "chain_bad_data" }),
    );
  });
});

const mappedConfig = (): ServerProtocolConfig => ({
  keeper: STUDENT,
  state: "Normal",
  penaltyBps: 500,
  graceDays: 5,
  guarantorChargeDay: 15,
  guarantorNoticeDay: null,
  secondsPerDay: 86_400,
  installmentIntervalDays: 30,
  minFinancedToCount: 100_000_000,
  guaranteedTiers: [
    { downPaymentBps: 3000, guarantorCoverageBps: 10_000, maxPurchase: 1_000_000_000 },
    { downPaymentBps: 2000, guarantorCoverageBps: 9000, maxPurchase: 1_000_000_000 },
    { downPaymentBps: 1000, guarantorCoverageBps: 8000, maxPurchase: 1_250_000_000 },
    { downPaymentBps: 0, guarantorCoverageBps: 7000, maxPurchase: 1_500_000_000 },
  ],
});

describe("serverQuoteForCap", () => {
  it("matches the contract grain: PC 1000 tier 0 -> down 300, financed 700", () => {
    const q = serverQuoteForCap(mappedConfig(), 0, 1_000_000_000);
    expect(q).toEqual({ tier: 0, downPayment: 300_000_000, financed: 700_000_000, requiredCoverage: 700_000_000 });
  });

  it("scales coverage with the tier (floor math)", () => {
    const q = serverQuoteForCap(mappedConfig(), 1, 1_000_000_000);
    expect(q.downPayment).toBe(200_000_000);
    expect(q.financed).toBe(800_000_000);
    expect(q.requiredCoverage).toBe(720_000_000);
  });

  it("rejects caps above the tier maximum and invalid prices", () => {
    expect(() => serverQuoteForCap(mappedConfig(), 0, 1_000_000_001)).toThrowError(
      expect.objectContaining({ code: "exceeds_tier_max" }),
    );
    expect(() => serverQuoteForCap(mappedConfig(), 0, 0)).toThrowError(
      expect.objectContaining({ code: "invalid_price" }),
    );
  });
});

describe("mapProtocolConfig", () => {
  it("rejects bad shapes and overflowing bigints", () => {
    expect(() => mapProtocolConfig({})).toThrowError(expect.objectContaining({ code: "chain_bad_data" }));
    const overflow = { ...configFixture(), minFinancedToCount: BigInt(2) ** BigInt(64) - BigInt(1) };
    expect(() => mapProtocolConfig(overflow as unknown as Record<string, unknown>)).toThrowError(
      expect.objectContaining({ code: "chain_bad_data" }),
    );
  });
});
