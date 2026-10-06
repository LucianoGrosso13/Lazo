import { address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { defaultConfigParams, loadKeypair, parseArgs } from "../scripts/seed";

const ADDR = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";

describe("seed parseArgs (puro, sin red)", () => {
  it("por defecto es dry-run con v0", () => {
    const args = parseArgs(["--fee-payer", ADDR]);
    expect(args.send).toBe(false);
    expect(args.txVersion).toBe(0);
    expect(args.secondsPerDay).toBe(86_400);
    expect(args.intervalDays).toBe(30);
    expect(args.merchants).toEqual([]);
    expect(args.feePayer).toBe(ADDR);
  });

  it("parsea merchants, mint-to, lp y send", () => {
    const args = parseArgs([
      "--fee-payer",
      ADDR,
      "--merchant",
      ADDR,
      "--mint-to",
      `${ADDR}:100`,
      "--lp",
      "junior:5000",
      "--tx-version",
      "1",
      "--send",
    ]);
    expect(args.merchants).toEqual([ADDR]);
    expect(args.mintTo).toEqual([{ owner: ADDR, amount: 100 }]);
    expect(args.lp).toEqual([{ tranche: "junior", amount: 5000 }]);
    expect(args.txVersion).toBe(1);
    expect(args.send).toBe(true);
  });

  it("rechaza flags inválidos", () => {
    expect(() => parseArgs(["--fee-payer", ADDR, "--tx-version", "2"])).toThrow();
    expect(() => parseArgs(["--fee-payer", ADDR, "--mint-to", "sin-monto"])).toThrow();
    expect(() => parseArgs(["--fee-payer", ADDR, "--lp", "middle:10"])).toThrow();
    expect(() => parseArgs(["--fee-payer", ADDR, "--seconds-per-day", "0"])).toThrow();
    expect(() => parseArgs(["--fee-payer"])).toThrow(/Falta valor/);
  });
});

describe("seed defaultConfigParams (reglas de negocio)", () => {
  it("fija fee 7%, gracia 5, aviso día 3, cobro día 15 y 4+2 escalones", () => {
    const p = defaultConfigParams(address(ADDR), address(ADDR), 86_400, 30);
    expect(p.feeBps).toBe(700);
    expect(p.penaltyBps).toBe(500);
    expect(p.graceDays).toBe(5);
    expect(p.guarantorNoticeDay).toBe(3);
    expect(p.guarantorChargeDay).toBe(15);
    expect(p.guaranteedTiers).toHaveLength(4);
    expect(p.unguaranteedTiers).toHaveLength(2);
    expect(p.guaranteedTiers[0].downPaymentBps).toBe(3000);
  });
});

describe("seed loadKeypair (sin claves reales)", () => {
  it("rechaza rutas dentro del repo sin leer bytes", async () => {
    await expect(loadKeypair("package.json")).rejects.toThrow(/dentro del repo/);
  });

  it("falla cerrado con rutas inexistentes", async () => {
    await expect(loadKeypair("/definitivamente/no/existe.json")).rejects.toThrow(/no encontrada/);
  });
});
