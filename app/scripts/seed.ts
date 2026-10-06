// Seed de devnet para el protocolo Cuotas (Fase A3 del handoff).
// Arma las transacciones de inicialización y fondeo y muestra la propuesta
// EXACTA de cada una antes de enviar nada.
//
// Por defecto es dry-run: imprime las propuestas (JSON revisable) y sale sin
// enviar ni pedir firmas. Solo envía con `--send` + confirmación explícita.
//
// Las keypairs viven FUERA del repo (directorio 0700 del operador). Este
// script rechaza rutas dentro del repo y nunca imprime bytes de claves.
//
// Uso:
//   npm run seed -- [--rpc-url URL] [--keypair PATH | --fee-payer ADDR]
//     [--keeper ADDR] [--treasury ADDR] [--seconds-per-day N] [--interval-days N]
//     [--merchant ADDR]... [--mint-to ADDR:USDC]... [--lp junior:USDC]...
//     [--tx-version 0|1] [--send]
//
// `--send` pide SEND global y después YES por cada propuesta, mostrando el
// JSON exacto (con huellas inmutables) antes de cada envío. No hay modo no
// interactivo ni bypass: cada envío lo aprueba el operador viendo la
// propuesta exacta.
//
// Ejemplos:
//   npm run seed -- --fee-payer BY6Z...Mehf --merchant ABC...123
//   npm run seed -- --keypair $CUOTAS_KEYS/deployer.json --lp junior:5000 --send
import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {
  address,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  getAddressDecoder,
  getBase64Encoder,
  type Address,
  type Instruction,
  type KeyPairSigner,
  type TransactionSigner,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getMintToInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  fetchMaybeMerchant,
  fetchMaybePool,
  fetchMaybeProtocolConfig,
  findConfigPda,
  findLpJuniorMintPda,
  findLpSeniorMintPda,
  findMerchantPda,
  findPoolPda,
  findVaultPda,
  getAdminInitConfigInstruction,
  getLpDepositInstruction,
  getMerchantRegisterInstruction,
  getPoolInitInstruction,
  Tranche,
  type ConfigParamsArgs,
} from "../src/generated";
import {
  assertDevnetRpc,
  explorerAddressUrl,
  explorerTxUrl,
  loadRealEnv,
  proposeAndSend,
  proposeTransaction,
  proposalToJson,
  type RealRpc,
} from "../src/lib/cuotas/real";
import { CuotasError } from "../src/lib/cuotas/types";

const USDC = 1_000_000;

// Valores iniciales de `admin_init_config`: tabla de la ronda 4 + Q15-Q16 de
// `proyecto/02-validacion.md` (interés 0%, comercio paga 7% sobre lo financiado).
export function defaultConfigParams(
  keeper: Address,
  treasury: Address,
  secondsPerDay: number,
  intervalDays: number,
): ConfigParamsArgs {
  const t = (downPaymentBps: number, maxUsdc: number, coverage: number, interestBps = 0) => ({
    downPaymentBps,
    maxPurchase: maxUsdc * USDC,
    interestBps,
    guarantorCoverageBps: coverage,
  });
  return {
    keeper,
    treasury,
    feeBps: 700,
    penaltyBps: 500,
    graceDays: 5,
    guarantorChargeDay: 15,
    // Día 3: aviso al fiador (02-validacion.md, ronda 2 Q2).
    guarantorNoticeDay: 3,
    secondsPerDay,
    installmentIntervalDays: intervalDays,
    minFinancedToCount: 100 * USDC,
    guaranteedTiers: [t(3000, 1000, 10_000), t(2000, 1000, 9000), t(1000, 1250, 8000), t(0, 1500, 7000)],
    unguaranteedTiers: [t(5000, 150, 0), t(3000, 300, 0)],
  };
}

export interface Args {
  keypair?: string;
  feePayer?: string;
  keeper?: string;
  treasury?: string;
  secondsPerDay: number;
  intervalDays: number;
  merchants: string[];
  mintTo: { owner: string; amount: number }[];
  lp: { tranche: "junior" | "senior"; amount: number }[];
  txVersion: 0 | 1;
  send: boolean;
  rpcUrl?: string;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    secondsPerDay: 86_400,
    intervalDays: 30,
    merchants: [],
    mintTo: [],
    lp: [],
    // v0: v1 no ejecuta en devnet hoy (ver resolveTxVersion en real.ts).
    txVersion: 0,
    send: false,
  };
  const take = (flag: string): string => {
    const i = argv.indexOf(flag);
    if (i < 0 || i + 1 >= argv.length) throw new Error(`Falta valor para ${flag}`);
    return argv[i + 1];
  };
  const takeAll = (flag: string): string[] => {
    const out: string[] = [];
    argv.forEach((a, i) => {
      if (a === flag && i + 1 < argv.length) out.push(argv[i + 1]);
    });
    return out;
  };
  if (argv.includes("--keypair")) args.keypair = take("--keypair");
  if (argv.includes("--fee-payer")) args.feePayer = take("--fee-payer");
  if (argv.includes("--keeper")) args.keeper = take("--keeper");
  if (argv.includes("--treasury")) args.treasury = take("--treasury");
  if (argv.includes("--rpc-url")) args.rpcUrl = take("--rpc-url");
  if (argv.includes("--seconds-per-day")) {
    args.secondsPerDay = Number(take("--seconds-per-day"));
    if (!Number.isInteger(args.secondsPerDay) || args.secondsPerDay <= 0) {
      throw new Error("--seconds-per-day debe ser un entero positivo");
    }
  }
  if (argv.includes("--interval-days")) {
    args.intervalDays = Number(take("--interval-days"));
    if (!Number.isInteger(args.intervalDays) || args.intervalDays <= 0) {
      throw new Error("--interval-days debe ser un entero positivo");
    }
  }
  args.merchants = takeAll("--merchant");
  for (const spec of takeAll("--mint-to")) {
    const [owner, amount] = spec.split(":");
    if (!owner || !amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error(`--mint-to inválido (formato ADDR:USDC): ${spec}`);
    }
    args.mintTo.push({ owner, amount: Number(amount) });
  }
  for (const spec of takeAll("--lp")) {
    const [tranche, amount] = spec.split(":");
    if ((tranche !== "junior" && tranche !== "senior") || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error(`--lp inválido (formato junior|senior:USDC): ${spec}`);
    }
    args.lp.push({ tranche, amount: Number(amount) });
  }
  if (argv.includes("--tx-version")) {
    const v = take("--tx-version");
    if (v !== "0" && v !== "1") throw new Error("--tx-version debe ser 0 o 1");
    args.txVersion = v === "1" ? 1 : 0;
  }
  args.send = argv.includes("--send");
  return args;
}

const repoRoot = path.resolve(__dirname, "..", "..");

/** Carga una keypair estilo Solana CLI. Rechaza rutas dentro del repo. */
export async function loadKeypair(p: string): Promise<KeyPairSigner> {
  // realpath: un symlink fuera→dentro del repo también se rechaza.
  const resolved = await fs.realpath(path.resolve(p)).catch(() => {
    throw new Error(`Keypair no encontrada: ${p}`);
  });
  if (resolved === repoRoot || resolved.startsWith(repoRoot + path.sep)) {
    throw new Error(`Keypair dentro del repo rechazada: ${p}. Usá un directorio fuera del repo.`);
  }
  const stat = await fs.stat(resolved).catch(() => {
    throw new Error(`Keypair no encontrada: ${p}`);
  });
  if (stat.mode & 0o077) {
    console.warn(`Aviso: ${p} es legible por grupo/otros (modo ${stat.mode.toString(8).slice(-3)}).`);
  }
  const raw: unknown = JSON.parse(await fs.readFile(resolved, "utf8"));
  if (!Array.isArray(raw) || raw.some((n) => typeof n !== "number")) {
    throw new Error(`Formato de keypair inválido (se espera JSON estilo Solana CLI): ${p}`);
  }
  try {
    return await createKeyPairSignerFromBytes(new Uint8Array(raw));
  } catch {
    throw new Error(`Bytes de keypair inválidos: ${p}`);
  }
}

/** Dirección ProgramData del programa (bytes 4..36 de la cuenta Program). */
async function findProgramData(rpc: RealRpc, programId: Address): Promise<Address> {
  const info = await rpc.getAccountInfo(programId, { encoding: "base64" }).send();
  const data = info.value?.data;
  if (!info.value || typeof data === "string" || !Array.isArray(data)) {
    throw new Error("Cuenta del programa ilegible");
  }
  const bytes = getBase64Encoder().encode(data[0]);
  if (bytes.length < 36 || bytes[0] !== 2) throw new Error("Cuenta del programa inesperada");
  return getAddressDecoder().decode(bytes.slice(4, 36));
}

async function accountExists(rpc: RealRpc, addr: Address): Promise<boolean> {
  const info = await rpc.getAccountInfo(addr, { encoding: "base64" }).send();
  return info.value !== null;
}

async function ataOf(owner: Address, mint: Address): Promise<Address> {
  return (await findAssociatedTokenPda({ mint, owner, tokenProgram: TOKEN_PROGRAM_ADDRESS }))[0];
}

interface Step {
  label: string;
  summary: string[];
  build: () => Promise<{ instructions: { ix: Instruction; name: string; summary: string }[] } | null>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = loadRealEnv({ ...process.env, ...(args.rpcUrl ? { NEXT_PUBLIC_SOLANA_RPC_URL: args.rpcUrl } : {}) });
  const rpc = createSolanaRpc(env.rpcUrl);
  await assertDevnetRpc(rpc, env.rpcUrl);
  console.log(`RPC devnet verificado: ${env.rpcUrl}`);
  console.log(`Programa: ${explorerAddressUrl(String(env.programId))}`);
  console.log(`Mint devUSDC: ${explorerAddressUrl(String(env.usdcMint))}`);

  let signer: KeyPairSigner | null = null;
  if (args.keypair) signer = await loadKeypair(args.keypair);
  const feePayer: Address = signer ? signer.address : address(args.feePayer ?? "");
  if (!args.keypair && !args.feePayer) {
    throw new Error("Pasá --keypair PATH (fuera del repo) o --fee-payer ADDR para el dry-run.");
  }
  if (args.send && !signer) throw new Error("--send requiere --keypair (la firma la aprueba el operador).");
  const keeper = address(args.keeper ?? String(feePayer));
  const treasury = address(args.treasury ?? String(feePayer));
  console.log(`Fee payer: ${feePayer}${signer ? "" : " (dry-run sin firma)"}`);
  if (!args.keeper) console.log(`Keeper = fee payer (pasá --keeper para otro).`);
  if (!args.treasury) console.log(`Treasury = fee payer (pasá --treasury para otro).`);

  const [configPda] = await findConfigPda({ programAddress: env.programId });
  const [poolPda] = await findPoolPda({ usdcMint: env.usdcMint }, { programAddress: env.programId });
  const [vault] = await findVaultPda({ pool: poolPda }, { programAddress: env.programId });
  // En dry-run no hay firma: un firmante que falla cerrado si alguien lo usa.
  // `proposeTransaction` lo reemplaza por dummies antes de simular.
  const dryRunSigner: TransactionSigner = {
    address: feePayer,
    signTransactions: async () => {
      throw new Error("dry-run sin firma: esto no debería pasar");
    },
  };
  const forPropose: TransactionSigner = signer ?? dryRunSigner;

  const steps: Step[] = [
    {
      label: "admin_init_config",
      summary: [
        `Config en ${configPda}`,
        `keeper=${keeper} treasury=${treasury}`,
        `seconds_per_day=${args.secondsPerDay} installment_interval_days=${args.intervalDays}`,
      ],
      build: async () => {
        if ((await fetchMaybeProtocolConfig(rpc, configPda)).exists) return null;
        const programData = await findProgramData(rpc, env.programId);
        const ix = getAdminInitConfigInstruction({
          admin: forPropose,
          program: env.programId,
          programData,
          config: configPda,
          usdcMint: env.usdcMint,
          params: defaultConfigParams(keeper, treasury, args.secondsPerDay, args.intervalDays),
        });
        return { instructions: [{ ix, name: "AdminInitConfig", summary: "Inicializar ProtocolConfig" }] };
      },
    },
    {
      label: "pool_init",
      summary: [`Pool en ${poolPda}`, `vault en ${vault}`],
      build: async () => {
        if ((await fetchMaybePool(rpc, poolPda)).exists) return null;
        const [lpJunior] = await findLpJuniorMintPda({ pool: poolPda }, { programAddress: env.programId });
        const [lpSenior] = await findLpSeniorMintPda({ pool: poolPda }, { programAddress: env.programId });
        const ix = getPoolInitInstruction({
          admin: forPropose,
          config: configPda,
          usdcMint: env.usdcMint,
          pool: poolPda,
          vault,
          lpJuniorMint: lpJunior,
          lpSeniorMint: lpSenior,
        });
        return { instructions: [{ ix, name: "PoolInit", summary: "Inicializar pool, vault y mints LP" }] };
      },
    },
  ];

  for (const m of args.merchants) {
    const owner = address(m);
    const [merchantPda] = await findMerchantPda({ merchantWallet: owner }, { programAddress: env.programId });
    const ata = await ataOf(owner, env.usdcMint);
    steps.push({
      label: `merchant_register ${m}`,
      summary: [`Merchant en ${merchantPda}`, `settlement ATA ${ata}`],
      build: async () => {
        if (await accountExists(rpc, merchantPda)) return null;
        const ixs: { ix: Instruction; name: string; summary: string }[] = [];
        // El registro exige que el settlement ATA exista: se crea en la
        // misma transacción (idempotente) cuando falta.
        if (!(await accountExists(rpc, ata))) {
          ixs.push({
            ix: getCreateAssociatedTokenIdempotentInstruction({
              payer: forPropose,
              ata,
              owner,
              mint: env.usdcMint,
            }),
            name: "CreateAssociatedTokenIdempotent",
            summary: `Crear settlement ATA de ${m}`,
          });
        }
        ixs.push({
          ix: getMerchantRegisterInstruction({
            admin: forPropose,
            config: configPda,
            merchantWallet: owner,
            usdcMint: env.usdcMint,
            settlementAta: ata,
            merchant: merchantPda,
          }),
          name: "MerchantRegister",
          summary: `Registrar comercio ${m}`,
        });
        return { instructions: ixs };
      },
    });
  }

  for (const f of args.mintTo) {
    const owner = address(f.owner);
    const ata = await ataOf(owner, env.usdcMint);
    const amount = Math.round(f.amount * USDC);
    steps.push({
      label: `mint_to ${f.owner} ${f.amount} devUSDC`,
      summary: [`Destino ${ata}`, `monto ${amount} base units`],
      build: async () => {
        const ixs: { ix: Instruction; name: string; summary: string }[] = [];
        if (!(await accountExists(rpc, ata))) {
          ixs.push({
            ix: getCreateAssociatedTokenIdempotentInstruction({
              payer: forPropose,
              ata,
              owner,
              mint: env.usdcMint,
            }),
            name: "CreateAssociatedTokenIdempotent",
            summary: `Crear ATA de ${f.owner}`,
          });
        }
        ixs.push({
          ix: getMintToInstruction({ mint: env.usdcMint, token: ata, mintAuthority: forPropose, amount }),
          name: "MintTo",
          summary: `Emitir ${f.amount} devUSDC a ${f.owner}`,
        });
        return { instructions: ixs };
      },
    });
  }

  for (const d of args.lp) {
    const amount = Math.round(d.amount * USDC);
    steps.push({
      label: `lp_deposit ${d.tranche} ${d.amount} devUSDC`,
      summary: [`Depositor ${feePayer}`, `monto ${amount} base units`],
      build: async () => {
        const [lpMint] =
          d.tranche === "junior"
            ? await findLpJuniorMintPda({ pool: poolPda }, { programAddress: env.programId })
            : await findLpSeniorMintPda({ pool: poolPda }, { programAddress: env.programId });
        const usdcAta = await ataOf(feePayer, env.usdcMint);
        const lpAta = await ataOf(feePayer, lpMint);
        const ixs: { ix: Instruction; name: string; summary: string }[] = [];
        if (!(await accountExists(rpc, usdcAta))) {
          throw new Error(`Sin ATA devUSDC fondeada para ${feePayer}: usá --mint-to primero.`);
        }
        if (!(await accountExists(rpc, lpAta))) {
          ixs.push({
            ix: getCreateAssociatedTokenIdempotentInstruction({
              payer: forPropose,
              ata: lpAta,
              owner: feePayer,
              mint: lpMint,
            }),
            name: "CreateAssociatedTokenIdempotent",
            summary: `Crear ATA de LP ${d.tranche}`,
          });
        }
        ixs.push({
          ix: getLpDepositInstruction({
            depositor: forPropose,
            config: configPda,
            pool: poolPda,
            usdcMint: env.usdcMint,
            vault,
            lpMint,
            depositorUsdcAta: usdcAta,
            depositorLpAta: lpAta,
            tranche: d.tranche === "junior" ? Tranche.Junior : Tranche.Senior,
            amount,
          }),
          name: "LpDeposit",
          summary: `Depositar ${d.amount} devUSDC en tramo ${d.tranche}`,
        });
        return { instructions: ixs };
      },
    });
  }

  // Fase 1: plan (siempre). En dry-run además se simula cada paso contra
  // el estado ACTUAL (los pasos tardíos pueden fallar hasta que los
  // primeros se ejecuten: es esperado, se informa, no se envía nada).
  // Con --send NO se simula por adelantado: cada paso se simula en fresco
  // justo antes de su envío, porque cada envío cambia el estado.
  console.log("\nPlan:");
  for (const step of steps) {
    console.log(`- ${step.label}`);
    for (const s of step.summary) console.log(`    ${s}`);
  }

  if (!args.send) {
    let count = 0;
    for (const step of steps) {
      const built = await step.build();
      if (!built) {
        console.log(`\n## ${step.label}: ya existe, se omite.`);
        continue;
      }
      const proposal = await proposeTransaction(
        rpc,
        env,
        {
          label: step.label,
          version: args.txVersion,
          feePayer,
          instructions: built.instructions,
        },
        { strict: false },
      );
      count++;
      console.log(`\n## ${step.label}`);
      for (const s of step.summary) console.log(`   ${s}`);
      console.log(proposalToJson(proposal));
    }
    console.log(`\nDry-run: ${count} propuesta(s) arriba. Nada se envió.`);
    console.log(
      "Cada simulación corre contra el estado actual: los pasos tardíos suelen fallar hasta que los primeros se ejecuten.",
    );
    console.log("Para ejecutar agregá --send y confirmá con SEND (cada paso se re-simula antes de enviarse).");
    return;
  }

  // Fase 2: envío solo con aprobación explícita del operador, siempre
  // interactiva (sin bypass global). Por paso: armar → simular (estricto,
  // aborta el resto si falla) → enviar exactamente lo simulado → confirmar.
  const sendSigner = signer;
  if (!sendSigner) throw new Error("--send requiere --keypair (la firma la aprueba el operador).");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise<string>((resolve) => rl.question(q, resolve));
  try {
    const answer = await ask(
      `\nEnviar ${steps.length} paso(s) a devnet, de a uno con simulación previa? Escribí SEND para confirmar: `,
    );
    if (answer.trim() !== "SEND") {
      console.log("Cancelado: no se envió nada.");
      return;
    }
    for (const step of steps) {
      const built = await step.build();
      if (!built) {
        console.log(`${step.label}: ya existe, se omite.`);
        continue;
      }
      const { signature } = await proposeAndSend(
        rpc,
        env,
        {
          label: step.label,
          version: args.txVersion,
          feePayer,
          signer: sendSigner,
          instructions: built.instructions,
        },
        {
          // Aprobación por propuesta: el operador ve el JSON exacto (con
          // huellas inmutables por instrucción) y confirma cada paso con
          // YES. El SEND global no alcanza para ningún envío.
          reviewer: async (p) => {
            console.log(`\n## ${step.label} (simulación OK, revisá antes de enviar)`);
            console.log(proposalToJson(p));
            const hashes = p.instructions.map((i) => `${i.name}:${i.fingerprint}`).join(" ");
            const ok = await ask(`Enviar ${step.label} [${hashes}]? Escribí YES: `);
            return ok.trim() === "YES";
          },
        },
      );
      console.log(`${step.label}: ${signature} ${explorerTxUrl(signature)}`);
    }
  } finally {
    rl.close();
  }
}

// Solo corre al invocar el script (`tsx scripts/seed.ts`); al importarlo
// desde un test no ejecuta nada.
if ((process.argv[1] ?? "").endsWith("seed.ts")) {
  main().catch((e: unknown) => {
    if (e instanceof CuotasError) {
      console.error(`Error [${e.code}]: ${e.message}`);
    } else {
      console.error(e instanceof Error ? e.message : e);
    }
    process.exit(1);
  });
}
