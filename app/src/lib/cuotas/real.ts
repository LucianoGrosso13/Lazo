// Implementación real de `CuotasClient` contra devnet (la red de prueba de
// Solana: la plata es de mentira). Lee con el cliente Codama de
// `src/generated/` y arma transacciones v0 con `@solana/kit` que firma la
// wallet del usuario (Phantom vía Wallet Standard).
//
// Reglas de este módulo:
// - Toda escritura se simula ANTES de pedir la firma. Si la simulación
//   falla, se lanza `simulation_failed` y la wallet ni se entera.
// - La firma la aprueba siempre el usuario en su wallet. Este módulo nunca
//   firma solo ni guarda claves.
// - Solo devnet: el RPC se verifica por hash de génesis en cada contexto.
//   Cualquier otra red se rechaza con `wrong_cluster`.
// - Nunca inventa datos: lo que no está onchain (nombre del comercio,
//   invitaciones, display del fiador) falla cerrado o se omite donde el tipo
//   lo permite.
// - Las reglas espejan el programa (`programa/programs/cuotas/src/`): bloqueo
//   por `late_count`, orden de pago, cierre al saldar. Si el programa cambia,
//   este módulo se actualiza; no se adivina.
import {
  address,
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createTransactionMessage,
  getBase58Decoder,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Base58EncodedBytes,
  type FixedSizeDecoder,
  type Instruction,
  type ReadonlyUint8Array,
  type Signature,
  type SignatureBytes,
  type TransactionSigner,
} from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  DEPOSITED_EVENT_DISCRIMINATOR,
  findConfigPda,
  findGuaranteePda,
  findLpJuniorMintPda,
  findLpSeniorMintPda,
  findMerchantPda,
  findPlanPda,
  findPoolPda,
  findReputationPda,
  findVaultPda,
  getAdminSetStateInstruction,
  getGuaranteeDecoder,
  getKeeperRegisterGuaranteeInstruction,
  getKeeperRevokeGuaranteeInstruction,
  getMerchantDecoder,
  getMerchantRegisterInstruction,
  getOpenPlanInstruction,
  getPayInstallmentInstruction,
  getPlanDecoder,
  getPoolDecoder,
  getProtocolConfigDecoder,
  getReputationDecoder,
  getStudentInitReputationInstruction,
  GUARANTEE_DISCRIMINATOR,
  GUARANTEE_REGISTERED_EVENT_DISCRIMINATOR,
  GUARANTEE_REVOKED_EVENT_DISCRIMINATOR,
  INSTALLMENT_MARKED_LATE_EVENT_DISCRIMINATOR,
  INSTALLMENT_PAID_EVENT_DISCRIMINATOR,
  LOSS_APPLIED_EVENT_DISCRIMINATOR,
  MERCHANT_DISCRIMINATOR,
  parseDepositedEvent,
  parseGuaranteeRegisteredEvent,
  parseGuaranteeRevokedEvent,
  parseInstallmentMarkedLateEvent,
  parseInstallmentPaidEvent,
  parseLossAppliedEvent,
  parsePlanOpenedEvent,
  parseRecoveryRegisteredEvent,
  PLAN_DISCRIMINATOR,
  PLAN_OPENED_EVENT_DISCRIMINATOR,
  POOL_DISCRIMINATOR,
  PROTOCOL_CONFIG_DISCRIMINATOR,
  ProtocolState as GeneratedProtocolState,
  RECOVERY_REGISTERED_EVENT_DISCRIMINATOR,
  REPUTATION_DISCRIMINATOR,
  Tranche as GeneratedTranche,
  type Plan as GeneratedPlan,
  type ProtocolConfig as GeneratedProtocolConfig,
} from "../../generated";
import type { AccountBaseHooks, AdminMerchantRef } from "./accounts-types";
import { CuotasError, type CuotasClient, type Micro, type WalletAddress } from "./types";
import type {
  Activity,
  DemoClock,
  Guarantee,
  Installment,
  InstallmentStatus,
  Merchant,
  Plan,
  PlanStatus,
  Pool,
  PoolEvent,
  ProtocolConfig,
  Quote,
  QuoteBlockReason,
  Reputation,
  Sale,
  TierIndex,
  TxResult,
  UnixSeconds,
} from "./types";

// ---------------------------------------------------------------------------
// Entorno y transporte
// ---------------------------------------------------------------------------

/** RPC de Kit. Los tests lo mockean y lo castean a este tipo. */
export type RealRpc = ReturnType<typeof createSolanaRpc>;

/** Hash de génesis de devnet. Verificación https://docs.solana.com/clusters. */
export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

/**
 * Versión preferida. v0: todas las wallets la firman Y devnet la ejecuta.
 * v1 se probó el 2026-10-06 contra api.devnet.solana.com y el clúster la
 * rechaza en simulación (`MaxLoadedAccountsDataSizeExceeded` sin logs, txs
 * mínimas): hasta que devnet soporte v1, no se usa aunque la wallet pueda.
 */
const TX_VERSION_PREFERRED = 0;
/** Reservado para cuando devnet soporte v1. */
const TX_VERSION_FUTURE = 1;

export type TxVersion = 0 | 1;

/**
 * Elige versión de transacción según lo que la wallet anuncia. Hoy siempre
 * v0 (ver arriba); si alguna wallet futura solo firmara v1, se intenta v1.
 */
export function resolveTxVersion(supported: ReadonlySet<string | number>): TxVersion {
  if (supported.has(TX_VERSION_PREFERRED)) return TX_VERSION_PREFERRED;
  if (supported.has(TX_VERSION_FUTURE)) return TX_VERSION_FUTURE;
  throw new CuotasError(
    "unsupported_version",
    "Tu wallet no firma transacciones versionadas: actualizala para continuar",
  );
}

/** Cuántas firmas de historial se escanean por panel (luego se filtra). */
const DEFAULT_HISTORY_LIMIT = 50;

export interface RealEnv {
  rpcUrl: string;
  programId: Address;
  usdcMint: Address;
}

type EnvLike = Record<string, string | undefined>;

/**
 * Entorno por defecto con referencias directas a `process.env.NEXT_PUBLIC_*`:
 * Next solo incrusta (inlining) esas referencias directas en el bundle del
 * navegador; leer `process.env` como objeto dinámico rompería el modo real
 * en producción.
 */
function defaultEnv(): EnvLike {
  return {
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_CUOTAS_PROGRAM_ID: process.env.NEXT_PUBLIC_CUOTAS_PROGRAM_ID,
    NEXT_PUBLIC_CUOTAS_USDC_MINT: process.env.NEXT_PUBLIC_CUOTAS_USDC_MINT,
  };
}

/**
 * Lee y valida la config real. Falla cerrado si falta el programa o el mint:
 * en modo real no hay direcciones de ejemplo.
 */
export function loadRealEnv(env: EnvLike = defaultEnv()): RealEnv {
  const rpcUrl = env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  if (/mainnet/i.test(rpcUrl)) {
    throw new CuotasError("wrong_cluster", `RPC rechazado (solo devnet): ${rpcUrl}`);
  }
  const programIdRaw = env.NEXT_PUBLIC_CUOTAS_PROGRAM_ID;
  const usdcMintRaw = env.NEXT_PUBLIC_CUOTAS_USDC_MINT;
  if (!programIdRaw || !usdcMintRaw) {
    throw new CuotasError(
      "unavailable",
      "Faltan NEXT_PUBLIC_CUOTAS_PROGRAM_ID y/o NEXT_PUBLIC_CUOTAS_USDC_MINT (ver app/.env.example)",
    );
  }
  let programId: Address;
  let usdcMint: Address;
  try {
    programId = address(programIdRaw);
    usdcMint = address(usdcMintRaw);
  } catch {
    throw new CuotasError("unavailable", "Program ID o mint devUSDC inválidos en el entorno");
  }
  return { rpcUrl, programId, usdcMint };
}

/**
 * Lo que `real.ts` necesita del resto de la app. Las lecturas usan `rpc`;
 * las escrituras piden además el firmante de la wallet conectada.
 */
export interface RealTransport {
  readonly rpc: RealRpc;
  getSigner(): Promise<{
    signer: TransactionSigner;
    supportedVersions: ReadonlySet<string | number>;
  }>;
}

let boundTransport: RealTransport | null = null;

/** Conecta el transporte real (lo llama el binder de `providers.tsx`). */
export function configureRealTransport(t: RealTransport | null): void {
  boundTransport = t;
}

export function getRealTransport(): RealTransport | null {
  return boundTransport;
}

/** Fuente de estado de wallet con forma estructural (evita importar providers). */
export interface WalletStateSource {
  getState(): {
    connected: {
      signer: TransactionSigner | null;
      supportedTransactionVersions: ReadonlySet<string | number>;
    } | null;
  };
}

/**
 * Ata el cliente Kit de la app (`providers.tsx`) como transporte real. Lee el
 * estado de la wallet en cada firma, así conectar/desconectar no requiere
 * re-bindear. Devuelve la desconexión para el cleanup del efecto.
 */
export function bindRealTransport(rpc: RealRpc, wallet: WalletStateSource): () => void {
  configureRealTransport({
    rpc,
    getSigner: async () => {
      const connected = wallet.getState().connected;
      if (!connected?.signer) {
        throw new CuotasError("wallet_required", "Conectá Phantom en devnet para firmar");
      }
      return { signer: connected.signer, supportedVersions: connected.supportedTransactionVersions };
    },
  });
  return () => configureRealTransport(null);
}

// El hash de génesis se verifica una vez por URL de RPC.
const genesisChecked = new Set<string>();

export function __resetGenesisCacheForTests(): void {
  genesisChecked.clear();
}

/** Verifica devnet por génesis. Para scripts Node (seed) antes de proponer. */
export async function assertDevnetRpc(rpc: RealRpc, rpcUrl: string): Promise<void> {
  await assertDevnet(rpc, rpcUrl);
}

async function assertDevnet(rpc: RealRpc, rpcUrl: string): Promise<void> {
  if (genesisChecked.has(rpcUrl)) return;
  let hash: string;
  try {
    hash = await rpc.getGenesisHash().send();
  } catch (e) {
    throw new CuotasError("unavailable", `Sin respuesta del RPC: ${rpcErr(e)}`);
  }
  if (hash !== DEVNET_GENESIS_HASH) {
    throw new CuotasError("wrong_cluster", `El RPC no es devnet (génesis ${hash})`);
  }
  genesisChecked.add(rpcUrl);
}

export interface RealOverrides {
  env?: EnvLike;
  transport?: RealTransport;
  historyLimit?: number;
  /**
   * Revisor de propuestas (tests, scripts). La UI lo omite y usa el
   * `window.confirm` por defecto.
   */
  reviewer?: Reviewer;
}

interface RealCtx {
  env: RealEnv;
  rpc: RealRpc;
  historyLimit: number;
}

async function readCtx(overrides: RealOverrides): Promise<RealCtx> {
  const env = loadRealEnv(overrides.env);
  const rpc = overrides.transport?.rpc ?? getRealTransport()?.rpc ?? createSolanaRpc(env.rpcUrl);
  await assertDevnet(rpc, env.rpcUrl);
  return { env, rpc, historyLimit: overrides.historyLimit ?? DEFAULT_HISTORY_LIMIT };
}

async function writeCtx(
  overrides: RealOverrides,
): Promise<RealCtx & { signer: TransactionSigner; version: TxVersion }> {
  const ctx = await readCtx(overrides);
  const transport = overrides.transport ?? getRealTransport();
  if (!transport) {
    throw new CuotasError("wallet_required", "Conectá Phantom en devnet para firmar");
  }
  const { signer, supportedVersions } = await transport.getSigner();
  return { ...ctx, signer, version: resolveTxVersion(supportedVersions) };
}

function rpcErr(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function asAddress(value: string, what: string): Address {
  try {
    return address(value);
  } catch {
    throw new CuotasError("not_found", `${what} inválido: ${value}`);
  }
}

/** u64 onchain → Micro. Falla cerrado ante un overflow (no trunca). */
function safeMicro(value: bigint, what: string): Micro {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new CuotasError("unavailable", `${what} excede el rango representable`);
  }
  return Number(value);
}

async function configPda(programId: Address): Promise<Address> {
  const [pda] = await findConfigPda({ programAddress: programId });
  return pda;
}

// ---------------------------------------------------------------------------
// Propuestas de transacción (revisión antes de firmar)
// ---------------------------------------------------------------------------

export interface ProposedInstruction {
  /** Programa destino (base58). */
  programId: string;
  /** Nombre Anchor de la instrucción (ej. "StudentInitReputation"). */
  name: string;
  /** Resumen legible para mostrar en la revisión. */
  summary: string;
  /** Huella de programa+cuentas+datos: el envío verifica que no cambió. */
  fingerprint: string;
}

/** cyrb53 (dominio público): huella hex de 128 bits, sync, sin dependencias. */
function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Huella de una instrucción (programa + cuentas con rol + datos; la
 * identidad del firmante no entra: el firmante se verifica aparte).
 * Evidencia de manipulación dentro de la sesión, en defensa en profundidad
 * junto a la revisión en wallet, la simulación y los checks onchain.
 */
export function instructionFingerprint(ix: Instruction): string {
  const accounts = ((ix as { accounts?: readonly unknown[] }).accounts ?? [])
    .map((a) => {
      const m = a as { address?: unknown; role?: unknown };
      return `${String(m.address)}:${String(m.role)}`;
    })
    .join(",");
  const data = (ix as { data?: ReadonlyUint8Array }).data;
  const payload = `${String(ix.programAddress)}|${accounts}|${data ? bytesToHex(data) : ""}`;
  const h1 = cyrb53(payload, 0x9e37).toString(16).padStart(14, "0");
  const h2 = cyrb53(payload, 0x7f4a).toString(16).padStart(14, "0");
  return h1 + h2;
}

export interface TxProposal {
  readonly label: string;
  readonly cluster: "devnet";
  readonly version: TxVersion;
  readonly rpcUrl: string;
  readonly programId: string;
  readonly feePayer: string;
  readonly instructions: ProposedInstruction[];
  /** Mensaje compilado exacto (base64). Solo cambian blockhash y firmas al enviar. */
  readonly messageBase64: string;
  readonly simulation: {
    readonly ok: boolean;
    readonly unitsConsumed?: number;
    readonly logs: string[];
    readonly error?: string;
  };
  readonly recentBlockhash: string;
  readonly lastValidBlockHeight: bigint;
}

/** Serializa una propuesta para revisión humana (JSON, bigint-safe). */
export function proposalToJson(proposal: TxProposal): string {
  return JSON.stringify(
    proposal,
    (_key, value: unknown) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function explorerAddressUrl(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

export interface ProposalInput {
  label: string;
  instructions: { ix: Instruction; name: string; summary: string }[];
  feePayer: Address;
  version: TxVersion;
}

/**
 * Firmante de mentira solo para simular: rellena firmas de 64 bytes en cero.
 * La simulación corre con `sigVerify: false`, así que los bytes nunca se
 * validan; este firmante jamás se usa para enviar.
 */
function dummySimulatorSigner(addr: Address): TransactionSigner {
  return {
    address: addr,
    signTransactions: async (txs) =>
      txs.map(() => ({ [addr]: new Uint8Array(64) as SignatureBytes })),
  };
}

/**
 * Reemplaza TODOS los firmantes de una instrucción por dummies (uno por
 * dirección). La simulación así nunca puede pedir una firma real, ni siquiera
 * si el llamante pasó su firmante de wallet en la instrucción.
 */
function withSimulationSigners(ix: Instruction, dummies: Map<string, TransactionSigner>): Instruction {
  const accounts = (ix as { accounts?: readonly unknown[] }).accounts;
  if (!accounts) return ix;
  return {
    ...ix,
    accounts: accounts.map((a) => {
      const meta = a as { address?: Address; signer?: TransactionSigner };
      if (!meta || typeof meta !== "object" || !meta.signer) return a;
      const key = String(meta.address ?? meta.signer.address);
      let dummy = dummies.get(key);
      if (!dummy) {
        dummy = dummySimulatorSigner(meta.signer.address);
        dummies.set(key, dummy);
      }
      return { ...meta, signer: dummy };
    }),
  } as Instruction;
}

/**
 * Arma el mensaje exacto y lo simula SIN pedir firmas (firmantes dummy + sin
 * verificación de firmas). Si la simulación falla, lanza `simulation_failed`
 * con los logs: la wallet nunca ve la transacción.
 */
export async function proposeTransaction(
  rpc: RealRpc,
  env: RealEnv,
  input: ProposalInput,
  opts?: { strict?: boolean },
): Promise<TxProposal> {
  const { value: latest } = await rpc.getLatestBlockhash().send().catch((e: unknown) => {
    throw new CuotasError("unavailable", `Sin blockhash reciente: ${rpcErr(e)}`);
  });
  // Un dummy por dirección: Kit exige la misma instancia por firmante, y el
  // fee payer suele repetirse dentro de las instrucciones.
  const dummies = new Map<string, TransactionSigner>();
  dummies.set(String(input.feePayer), dummySimulatorSigner(input.feePayer));
  const feePayer = dummies.get(String(input.feePayer)) as TransactionSigner;
  const message = pipe(
    createTransactionMessage({ version: input.version }),
    (m) => setTransactionMessageFeePayerSigner(feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latest, m),
    (m) =>
      appendTransactionMessageInstructions(
        input.instructions.map((i) => withSimulationSigners(i.ix, dummies)),
        m,
      ),
  );
  const signed = await signTransactionMessageWithSigners(message);
  const wire = getBase64EncodedWireTransaction(signed);
  const sim = await rpc
    .simulateTransaction(wire, {
      encoding: "base64",
      sigVerify: false,
      replaceRecentBlockhash: false,
      innerInstructions: false,
    })
    .send()
    .catch((e: unknown) => {
      throw new CuotasError("unavailable", `Simulación sin respuesta: ${rpcErr(e)}`);
    });
  const error = sim.value.err
    ? JSON.stringify(sim.value.err, (_key, value: unknown) =>
        typeof value === "bigint" ? value.toString() : value,
      )
    : undefined;
  const proposal: TxProposal = {
    label: input.label,
    cluster: "devnet",
    version: input.version,
    rpcUrl: env.rpcUrl,
    programId: String(env.programId),
    feePayer: String(input.feePayer),
    instructions: input.instructions.map((i) => ({
      programId: String(i.ix.programAddress),
      name: i.name,
      summary: i.summary,
      fingerprint: instructionFingerprint(i.ix),
    })),
    messageBase64: String(wire),
    simulation: {
      ok: !sim.value.err,
      unitsConsumed:
        typeof sim.value.unitsConsumed === "bigint" ? Number(sim.value.unitsConsumed) : undefined,
      logs: sim.value.logs ?? [],
      error,
    },
    recentBlockhash: latest.blockhash.toString(),
    lastValidBlockHeight: latest.lastValidBlockHeight,
  };
  if (sim.value.err && opts?.strict !== false) {
    throw new CuotasError(
      "simulation_failed",
      `${input.label}: la simulación falló (${error}). No se pidió ninguna firma.`,
    );
  }
  return proposal;
}

/** Espera confirmación (processed basta para la UI; finalized lo muestra Explorer). */
async function confirmSignature(rpc: RealRpc, signature: Signature): Promise<void> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const res = await rpc
      .getSignatureStatuses([signature])
      .send()
      .catch(() => null);
    const status = res?.value?.[0];
    if (status?.err) {
      throw new CuotasError(
        "unavailable",
        `La transacción falló onchain: ${JSON.stringify(status.err)} (${explorerTxUrl(signature)})`,
      );
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return;
    }
    if (Date.now() > deadline) {
      throw new CuotasError(
        "unavailable",
        `Sin confirmación en 60s; revisá ${explorerTxUrl(signature)} antes de reintentar`,
      );
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/**
 * Revisor explícito: recibe la propuesta simulada y devuelve si se aprueba.
 * `false` (o cualquier excepción) = cero firmas, cero envíos.
 */
export type Reviewer = (proposal: TxProposal) => boolean | Promise<boolean>;

/** Texto de revisión para el confirm del navegador. */
export function reviewText(proposal: TxProposal): string {
  const lines = [
    `Revisá antes de firmar (${proposal.cluster}):`,
    `Operación: ${proposal.label}`,
    `Pagador: ${proposal.feePayer}`,
    `Versión: v${proposal.version}`,
    "Instrucciones:",
    ...proposal.instructions.map(
      (i) => `- ${i.name}: ${i.summary} [${i.programId.slice(0, 8)}…]`,
    ),
    proposal.simulation.ok
      ? `Simulación: OK (${proposal.simulation.unitsConsumed ?? "?"} units)`
      : `Simulación: FALLÓ (${proposal.simulation.error ?? "sin detalle"})`,
    `Blockhash: ${proposal.recentBlockhash.slice(0, 8)}…`,
  ];
  return lines.join("\n");
}

/**
 * Revisor por defecto: `window.confirm` en el navegador. En Node (scripts,
 * tests, SSR) no hay ventana: falla cerrado exigiendo revisor explícito.
 */
export function defaultReviewer(proposal: TxProposal): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    throw new CuotasError(
      "unavailable",
      "Sin revisor: la firma requiere aprobación explícita (pasá reviewer en Node)",
    );
  }
  return window.confirm(reviewText(proposal));
}

/**
 * Envía una propuesta YA revisada, byte por byte: exige simulación OK,
 * verifica que las instrucciones sean las revisadas (huellas), que el
 * firmante sea el fee payer revisado, y rearma el mensaje con el MISMO
 * blockhash simulado (no se refresca: lo revisado es lo enviado). Si el
 * blockhash venció entre la revisión y el envío, la cadena lo rechaza y se
 * reintenta con propuesta fresca. No re-simula: la simulación es la de la
 * propuesta.
 */
export async function sendReviewedProposal(
  rpc: RealRpc,
  proposal: TxProposal,
  instructions: { ix: Instruction; name: string; summary: string }[],
  signer: TransactionSigner,
): Promise<string> {
  if (!proposal.simulation.ok) {
    throw new CuotasError(
      "simulation_failed",
      `${proposal.label}: la simulación no pasó (${proposal.simulation.error ?? "sin detalle"}). No se firma.`,
    );
  }
  if (instructions.length !== proposal.instructions.length) {
    throw new CuotasError(
      "unavailable",
      "La propuesta cambió desde la revisión: cantidad de instrucciones difiere",
    );
  }
  for (let i = 0; i < instructions.length; i++) {
    if (instructionFingerprint(instructions[i].ix) !== proposal.instructions[i].fingerprint) {
      throw new CuotasError(
        "unavailable",
        `La instrucción ${i} (${proposal.instructions[i].name}) difiere de la revisada: envío abortado`,
      );
    }
  }
  if (String(signer.address) !== proposal.feePayer) {
    throw new CuotasError("unauthorized", "El firmante difiere del fee payer revisado");
  }
  const message = pipe(
    createTransactionMessage({ version: proposal.version }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: proposal.recentBlockhash as never,
          lastValidBlockHeight: proposal.lastValidBlockHeight,
        },
        m,
      ),
    (m) => appendTransactionMessageInstructions(instructions.map((i) => i.ix), m),
  );
  const signed = await signTransactionMessageWithSigners(message).catch((e: unknown) => {
    throw new CuotasError("wallet_required", `Firma cancelada o rechazada: ${rpcErr(e)}`);
  });
  const wire = getBase64EncodedWireTransaction(signed);
  const signature = await rpc
    .sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" })
    .send()
    .catch((e: unknown) => {
      const msg = rpcErr(e);
      if (/BlockhashNotFound|blockhash.*expir/i.test(msg)) {
        throw new CuotasError(
          "unavailable",
          "El blockhash venció entre la revisión y el envío: reintentá (se arma una propuesta fresca)",
        );
      }
      throw new CuotasError("unavailable", `Envío rechazado: ${msg}`);
    });
  void getSignatureFromTransaction(signed);
  await confirmSignature(rpc, signature);
  return signature.toString();
}

/**
 * Revisión explícita + envío exacto: simula (estricto), pide APROBACIÓN al
 * revisor (booleano; por defecto `window.confirm` en el navegador), y solo
 * con `true` envía EXACTAMENTE lo revisado vía `sendReviewedProposal`.
 * `false`, cancelación o falta de revisor = cero firmas, cero envíos. La
 * wallet del usuario aprueba además la firma (Phantom); este módulo nunca
 * firma solo.
 */
export async function proposeAndSend(
  rpc: RealRpc,
  env: RealEnv,
  input: ProposalInput & { signer: TransactionSigner },
  opts?: { reviewer?: Reviewer },
): Promise<{ signature: string; proposal: TxProposal }> {
  const proposal = await proposeTransaction(rpc, env, input);
  const reviewer = opts?.reviewer ?? defaultReviewer;
  let approved = false;
  try {
    approved = await reviewer(proposal);
  } catch (e) {
    if (e instanceof CuotasError) throw e;
    throw new CuotasError("unavailable", `Revisor falló: ${rpcErr(e)}. No se firmó nada.`);
  }
  if (!approved) {
    throw new CuotasError(
      "review_rejected",
      `${proposal.label}: revisión rechazada. No se firmó ni envió nada.`,
    );
  }
  const signature = await sendReviewedProposal(rpc, proposal, input.instructions, input.signer);
  return { signature, proposal };
}

// ---------------------------------------------------------------------------
// Lectura validada de cuentas (owner + discriminador + tamaño exacto)
// ---------------------------------------------------------------------------

/**
 * Lee una cuenta del programa validando lo que el decoder generado NO
 * valida: que el dueño sea el programa, que el discriminador coincida y que
 * el tamaño sea el exacto del tipo. Cualquier desvío falla cerrado (datos de
 * otro programa, cuenta equivocada o esquema cambiado). `null` = no existe.
 */
async function readProgramAccount<T>(
  rpc: RealRpc,
  addr: Address,
  programId: Address,
  discriminator: ReadonlyUint8Array,
  decoder: FixedSizeDecoder<T>,
  what: string,
): Promise<T | null> {
  const info = await rpc
    .getAccountInfo(addr, { encoding: "base64" })
    .send()
    .catch((e: unknown) => {
      throw new CuotasError("unavailable", `Sin lectura de ${what}: ${rpcErr(e)}`);
    });
  if (!info.value) return null;
  // Cuenta cerrada (ej. Plan saldado: System, 0 bytes) = no existe.
  if (info.value.owner === "11111111111111111111111111111111") return null;
  if (String(info.value.owner) !== String(programId)) {
    throw new CuotasError("unavailable", `${what}: dueño inesperado ${info.value.owner}`);
  }
  const data = info.value.data;
  if (typeof data === "string" || !Array.isArray(data) || typeof data[0] !== "string") {
    throw new CuotasError("unavailable", `${what}: codificación inesperada`);
  }
  let bytes: ReadonlyUint8Array;
  try {
    bytes = getBase64Encoder().encode(data[0]);
  } catch {
    throw new CuotasError("unavailable", `${what}: base64 inválido`);
  }
  if (bytes.length !== decoder.fixedSize) {
    throw new CuotasError(
      "unavailable",
      `${what}: tamaño ${bytes.length}, se esperaban ${decoder.fixedSize} bytes`,
    );
  }
  if (!bytesStartWith(bytes, discriminator)) {
    throw new CuotasError("unavailable", `${what}: discriminador inesperado`);
  }
  try {
    return decoder.decode(bytes);
  } catch (e) {
    throw new CuotasError("unavailable", `${what}: bytes inválidos (${rpcErr(e)})`);
  }
}

// ---------------------------------------------------------------------------
// Mapeos onchain → tipos de `cuotas.ts`
// ---------------------------------------------------------------------------

/**
 * Cantidad de cuotas por plan. Estructural del programa, no configurable:
 * `INSTALLMENT_COUNT` en `programa/programs/cuotas/src/constants.rs` y
 * `[Installment; 3]` en el IDL (ronda 4: "3 cuotas mensuales fijas").
 */
const INSTALLMENT_COUNT = 3;

const PROTOCOL_STATE_NAMES = ["Normal", "Halted", "WithdrawsOnly"] as const;

function mapProtocolState(raw: GeneratedProtocolState): ProtocolConfig["state"] {
  const name = PROTOCOL_STATE_NAMES[raw as number];
  if (!name) throw new CuotasError("unavailable", `Estado del protocolo inválido: ${String(raw)}`);
  return name;
}

function mapConfig(d: GeneratedProtocolConfig): ProtocolConfig {
  const tiers = d.guaranteedTiers.map((t) => ({
    downPaymentBps: t.downPaymentBps,
    guarantorCoverageBps: t.guarantorCoverageBps,
    maxPurchase: safeMicro(t.maxPurchase, "max_purchase"),
    interestBps: t.interestBps,
  }));
  const bare = d.unguaranteedTiers.map((t) => ({
    downPaymentBps: t.downPaymentBps,
    guarantorCoverageBps: t.guarantorCoverageBps,
    maxPurchase: safeMicro(t.maxPurchase, "max_purchase"),
    interestBps: t.interestBps,
  }));
  if (tiers.length !== 4 || bare.length !== 2) {
    throw new CuotasError("unavailable", "La config onchain no trae 4+2 escalones");
  }
  return {
    admin: String(d.admin),
    keeper: String(d.keeper),
    feeBps: d.feeBps,
    penaltyBps: d.penaltyBps,
    graceDays: d.graceDays,
    guarantorNoticeDay: d.guarantorNoticeDay,
    guarantorChargeDay: d.guarantorChargeDay,
    secondsPerDay: d.secondsPerDay,
    installmentsCount: INSTALLMENT_COUNT,
    installmentIntervalDays: d.installmentIntervalDays,
    guaranteedTiers: tiers as ProtocolConfig["guaranteedTiers"],
    unguaranteedTiers: bare as ProtocolConfig["unguaranteedTiers"],
    minFinancedToCount: safeMicro(d.minFinancedToCount, "min_financed_to_count"),
    state: mapProtocolState(d.state),
    usdcMint: String(d.usdcMint),
    cluster: "devnet",
  };
}

function mapReputation(student: WalletAddress, data: {
  tier: number;
  plansCompleted: number;
  lateCount: number;
  activeExposure: bigint;
}): Reputation {
  if (data.tier < 0 || data.tier > 3) {
    throw new CuotasError("unavailable", `Escalón onchain inválido: ${data.tier}`);
  }
  return {
    student,
    tier: data.tier as TierIndex,
    plansCompleted: data.plansCompleted,
    lateCount: data.lateCount,
    activeExposure: safeMicro(data.activeExposure, "active_exposure"),
    // Regla del programa (`open_plan.rs`): `late_count == 0` o la compra se
    // rechaza con `BlockedFromNewPlans`. Derivado, no inventado.
    blockedFromNewPlans: data.lateCount > 0,
  };
}

function bytesToHex(bytes: ReadonlyUint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string, what: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new CuotasError("unavailable", `${what}: se esperaban 64 hex (sha-256)`);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function mapGuarantee(student: WalletAddress, data: {
  maxPurchase: bigint;
  coverageMax: bigint;
  mandateHash: ReadonlyUint8Array;
  active: boolean;
  registeredAt: bigint;
}): Guarantee {
  return {
    student,
    maxPurchase: safeMicro(data.maxPurchase, "max_purchase"),
    coverageMax: safeMicro(data.coverageMax, "coverage_max"),
    mandateHash: bytesToHex(data.mandateHash),
    active: data.active,
    registeredAt: safeMicro(
      data.registeredAt < BigInt(0) ? BigInt(0) : data.registeredAt,
      "registered_at",
    ),
    // `display` (nombre del fiador, tarjeta) vive off-chain y lo sirve el
    // backend: en real nunca se inventa.
  };
}

const bpsOf = (amount: Micro, bps: number): Micro => Math.floor((amount * bps) / 10_000);

/**
 * Días de atraso espejando `Installment::days_late` del programa: diferencia
 * cruda si es ≤ 0, piso de la división si es positiva.
 */
export function programDaysLate(now: UnixSeconds, dueAt: UnixSeconds, secondsPerDay: number): number {
  const diff = now - dueAt;
  if (diff <= 0) return diff;
  return Math.floor(diff / secondsPerDay);
}

type GeneratedInstallment = GeneratedPlan["installments"][number];

function displayInstallment(
  raw: GeneratedInstallment,
  index: number,
  config: ProtocolConfig,
  now: UnixSeconds,
): Installment {
  const dueAt = raw.dueAt < BigInt(0) ? 0 : Number(raw.dueAt);
  let status: InstallmentStatus;
  if (raw.paid) status = "Paid";
  else if (raw.charged) status = "ChargedToGuarantor";
  else {
    const daysLate = programDaysLate(now, dueAt, config.secondsPerDay);
    status =
      daysLate < 0 ? "Upcoming" : daysLate === 0 ? "Due" : daysLate <= config.graceDays ? "Grace" : "Late";
  }
  return {
    index,
    amount: safeMicro(raw.amount, "installment.amount"),
    dueAt,
    penalty: safeMicro(raw.penalty, "installment.penalty"),
    status,
    // `paidAt` no se guarda onchain (decisión de privacidad: el detalle muere
    // con el cierre del plan): se omite, no se inventa.
  };
}

/**
 * Mapea un Plan onchain. Un plan existente siempre está activo (el programa
 * cierra la cuenta al saldar): el estado es `Active` o `Late`.
 */
export function mapPlan(
  pda: Address,
  data: GeneratedPlan,
  config: ProtocolConfig,
  now: UnixSeconds,
  signature: string,
): Plan {
  if (data.installments.length !== INSTALLMENT_COUNT) {
    throw new CuotasError("unavailable", "El plan onchain no trae 3 cuotas");
  }
  const installments = data.installments.map((raw, index) =>
    displayInstallment(raw, index, config, now),
  );
  const status: PlanStatus = installments.some((i) => i.status === "Late") ? "Late" : "Active";
  return {
    id: String(pda),
    student: String(data.student),
    merchant: String(data.merchant),
    price: safeMicro(data.price, "plan.price"),
    downPayment: safeMicro(data.downPayment, "plan.down_payment"),
    financed: safeMicro(data.financed, "plan.financed"),
    merchantFee: safeMicro(data.merchantFee, "plan.merchant_fee"),
    installments,
    openedAt: data.openedAt < BigInt(0) ? 0 : Number(data.openedAt),
    status,
    counts: data.counts,
    signature,
  };
}

/**
 * Cotizador puro: la misma matemática del mock, sobre datos onchain. Se
 * exporta para testearla sin RPC.
 */
export function computeRealQuote(
  config: ProtocolConfig,
  price: Micro,
  student: WalletAddress,
  reputation: Reputation | null,
  guarantee: Guarantee | null,
  hasActivePlan: boolean,
): Quote {
  // Sin reputación onchain, la cotización supone escalón 0: es lo que el
  // estudiante obtendría tras `student_init_reputation`. No afirma estado.
  const tier = reputation?.tier ?? 0;
  const withGuarantee = guarantee?.active === true;
  const tierParams = withGuarantee
    ? config.guaranteedTiers[tier]
    : config.unguaranteedTiers[Math.min(tier, config.unguaranteedTiers.length - 1)];

  const downPayment = bpsOf(price, tierParams.downPaymentBps);
  const financed = price - downPayment;
  const interest = bpsOf(financed, tierParams.interestBps);
  const repayable = financed + interest;
  const base = Math.floor(repayable / config.installmentsCount);
  const installments = Array.from({ length: config.installmentsCount }, (_, i) =>
    i === config.installmentsCount - 1 ? repayable - base * (config.installmentsCount - 1) : base,
  );
  const merchantFee = bpsOf(financed, config.feeBps);
  const requiredCoverage = bpsOf(financed, tierParams.guarantorCoverageBps);

  const reasons: QuoteBlockReason[] = [];
  if (config.state !== "Normal") reasons.push("protocol_halted");
  if (reputation?.blockedFromNewPlans) reasons.push("blocked_after_default");
  if (hasActivePlan) reasons.push("has_active_plan");
  if (!withGuarantee) reasons.push("no_guarantee");
  if (price > tierParams.maxPurchase) reasons.push("exceeds_tier_max");
  if (withGuarantee && guarantee) {
    if (price > guarantee.maxPurchase) reasons.push("exceeds_guarantor_max_purchase");
    if (requiredCoverage > guarantee.coverageMax) reasons.push("exceeds_guarantee_coverage");
  }

  return {
    price,
    tier,
    withGuarantee,
    downPayment,
    financed,
    installments,
    interest,
    total: price + interest,
    merchantFee,
    merchantReceives: price - merchantFee,
    requiredCoverage,
    eligible: reasons.length === 0,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Historial real (firmas + Explorer, sin inventar montos)
// ---------------------------------------------------------------------------

interface HistoryEntry {
  signature: string;
  slot: number;
  blockTime: UnixSeconds;
}

async function addressHistory(rpc: RealRpc, addr: Address, limit: number): Promise<HistoryEntry[]> {
  const infos = await rpc
    .getSignaturesForAddress(addr, { limit })
    .send()
    .catch((e: unknown) => {
      throw new CuotasError("unavailable", `Sin historial de ${addr}: ${rpcErr(e)}`);
    });
  return infos.flatMap((i) =>
    !i.err && typeof i.blockTime === "number"
      ? [{ signature: i.signature, slot: Number(i.slot), blockTime: Number(i.blockTime) }]
      : [],
  );
}

/** Forma mínima del `jsonParsed` que nos interesa (el resto se ignora). */
interface ParsedTx {
  meta?: {
    err?: unknown;
    logMessages?: string[] | null;
    preTokenBalances?: { accountIndex: number; uiTokenAmount: { amount: string } }[] | null;
    postTokenBalances?: { accountIndex: number; uiTokenAmount: { amount: string } }[] | null;
  } | null;
  transaction?: { message?: { accountKeys?: { pubkey: string }[] } };
}

async function fetchParsedTx(rpc: RealRpc, signature: string): Promise<ParsedTx | null> {
  const tx = await rpc
    .getTransaction(signature as Signature, {
      commitment: "confirmed",
      encoding: "jsonParsed",
      maxSupportedTransactionVersion: 1,
    })
    .send()
    .catch(() => null);
  return tx as unknown as ParsedTx | null;
}

// ---------------------------------------------------------------------------
// Eventos Anchor (atribución exacta: plan, estudiante, montos, comprobantes)
// ---------------------------------------------------------------------------

type ParsedCuotasEvent =
  | { name: "PlanOpened"; event: ReturnType<typeof parsePlanOpenedEvent> }
  | { name: "InstallmentPaid"; event: ReturnType<typeof parseInstallmentPaidEvent> }
  | { name: "InstallmentMarkedLate"; event: ReturnType<typeof parseInstallmentMarkedLateEvent> }
  | { name: "RecoveryRegistered"; event: ReturnType<typeof parseRecoveryRegisteredEvent> }
  | { name: "Deposited"; event: ReturnType<typeof parseDepositedEvent> }
  | { name: "LossApplied"; event: ReturnType<typeof parseLossAppliedEvent> }
  | { name: "GuaranteeRegistered"; event: ReturnType<typeof parseGuaranteeRegisteredEvent> }
  | { name: "GuaranteeRevoked"; event: ReturnType<typeof parseGuaranteeRevokedEvent> };

const EVENT_PARSERS: {
  discriminator: ReadonlyUint8Array;
  parse: (bytes: ReadonlyUint8Array) => ParsedCuotasEvent;
}[] = [
  {
    discriminator: PLAN_OPENED_EVENT_DISCRIMINATOR,
    parse: (b) => ({ name: "PlanOpened", event: parsePlanOpenedEvent(b) }),
  },
  {
    discriminator: INSTALLMENT_PAID_EVENT_DISCRIMINATOR,
    parse: (b) => ({ name: "InstallmentPaid", event: parseInstallmentPaidEvent(b) }),
  },
  {
    discriminator: INSTALLMENT_MARKED_LATE_EVENT_DISCRIMINATOR,
    parse: (b) => ({ name: "InstallmentMarkedLate", event: parseInstallmentMarkedLateEvent(b) }),
  },
  {
    discriminator: RECOVERY_REGISTERED_EVENT_DISCRIMINATOR,
    parse: (b) => ({ name: "RecoveryRegistered", event: parseRecoveryRegisteredEvent(b) }),
  },
  {
    discriminator: DEPOSITED_EVENT_DISCRIMINATOR,
    parse: (b) => ({ name: "Deposited", event: parseDepositedEvent(b) }),
  },
  {
    discriminator: LOSS_APPLIED_EVENT_DISCRIMINATOR,
    parse: (b) => ({ name: "LossApplied", event: parseLossAppliedEvent(b) }),
  },
  {
    discriminator: GUARANTEE_REGISTERED_EVENT_DISCRIMINATOR,
    parse: (b) => ({ name: "GuaranteeRegistered", event: parseGuaranteeRegisteredEvent(b) }),
  },
  {
    discriminator: GUARANTEE_REVOKED_EVENT_DISCRIMINATOR,
    parse: (b) => ({ name: "GuaranteeRevoked", event: parseGuaranteeRevokedEvent(b) }),
  },
];

function bytesStartWith(bytes: ReadonlyUint8Array, prefix: ReadonlyUint8Array): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Extrae los eventos Cuotas de los logs de un tx (`Program data: <base64>`),
 * atribuyendo cada línea al programa que la emitió (pila de invokes): solo
 * se parsean los datos emitidos por NUESTRO programa. Lo corrupto, ajeno o
 * desconocido se omite, nunca se inventa.
 */
export function parseCuotasEventsFromLogs(
  logs: readonly string[] | null | undefined,
  programId: Address | string,
): ParsedCuotasEvent[] {
  if (!logs) return [];
  const ours = String(programId);
  const stack: string[] = [];
  const out: ParsedCuotasEvent[] = [];
  const base64 = getBase64Encoder();
  for (const line of logs) {
    const invoked = /^Program (\S+) invoke \[\d+\]/.exec(line);
    if (invoked) {
      stack.push(invoked[1]);
      continue;
    }
    const closed = /^Program (\S+) (success|failed)/.exec(line);
    if (closed) {
      while (stack.length > 0 && stack[stack.length - 1] !== closed[1]) stack.pop();
      if (stack.length > 0) stack.pop();
      continue;
    }
    if (!line.startsWith("Program data: ")) continue;
    if (stack[stack.length - 1] !== ours) continue;
    let bytes: ReadonlyUint8Array;
    try {
      bytes = base64.encode(line.slice("Program data: ".length).trim());
    } catch {
      continue;
    }
    for (const p of EVENT_PARSERS) {
      if (!bytesStartWith(bytes, p.discriminator)) continue;
      try {
        out.push(p.parse(bytes));
      } catch {
        // Evento corrupto: se omite.
      }
      break;
    }
  }
  return out;
}

/**
 * Eventos del pool desde el historial REAL del vault. SOLO eventos Anchor
 * atribuidos a nuestro programa (plan, tramo, comprobante exactos). Sin
 * eventos no hay evento: ni nombres de instrucción en logs ni deltas de
 * balance prueban un movimiento del protocolo.
 */
async function poolEventsFromHistory(
  rpc: RealRpc,
  programId: Address,
  vault: Address,
  limit: number,
): Promise<PoolEvent[]> {
  const history = await addressHistory(rpc, vault, limit);
  const events: (PoolEvent & { slot: number })[] = [];
  const CHUNK = 10;
  for (let i = 0; i < history.length; i += CHUNK) {
    const chunk = history.slice(i, i + CHUNK);
    const txs = await Promise.all(chunk.map((h) => fetchParsedTx(rpc, h.signature)));
    for (let j = 0; j < chunk.length; j++) {
      const h = chunk[j];
      const tx = txs[j];
      if (!tx || tx.meta?.err) continue;
      const parsed = parseCuotasEventsFromLogs(tx.meta?.logMessages, programId);
      for (const p of parsed) {
        try {
          if (p.name === "PlanOpened") {
            const advance = safeMicro(p.event.financed - p.event.merchantFee, "advance");
            events.push({
              kind: "Advance",
              amount: advance,
              at: h.blockTime,
              signature: h.signature,
              planId: String(p.event.plan),
              slot: h.slot,
            });
          } else if (p.name === "InstallmentPaid") {
            const total = safeMicro(p.event.amount + p.event.penalty, "repayment");
            events.push({
              kind: "Repayment",
              amount: total,
              at: h.blockTime,
              signature: h.signature,
              planId: String(p.event.plan),
              slot: h.slot,
            });
          } else if (p.name === "RecoveryRegistered") {
            const total = safeMicro(p.event.principal + p.event.penalties, "recovery");
            events.push({
              kind: "Recovery",
              amount: total,
              at: h.blockTime,
              signature: h.signature,
              planId: String(p.event.plan),
              receiptHash: bytesToHex(p.event.receiptHash),
              slot: h.slot,
            });
          } else if (p.name === "Deposited") {
            events.push({
              kind: "Deposit",
              amount: safeMicro(p.event.amount, "deposit"),
              at: h.blockTime,
              signature: h.signature,
              tranche: p.event.tranche === GeneratedTranche.Junior ? "junior" : "senior",
              slot: h.slot,
            });
          } else if (p.name === "LossApplied") {
            events.push({
              kind: "Loss",
              amount: safeMicro(p.event.amount, "loss"),
              at: h.blockTime,
              signature: h.signature,
              slot: h.slot,
            });
          }
        } catch {
          // Evento con números fuera de rango: se omite ese evento.
        }
      }
      // Sin eventos atribuidos no hay evento: ni el nombre de la instrucción
      // en logs ni el delta de balance prueban un movimiento del protocolo
      // (cualquier programa puede loguear el mismo nombre y cualquiera puede
      // transferir al vault).
    }
  }
  events.sort((a, b) => a.slot - b.slot || (a.signature < b.signature ? -1 : 1));
  return events.map(({ slot: _slot, ...e }) => e);
}

/**
 * Ventas del comercio desde el historial REAL de su ATA: cada evento
 * `PlanOpened` del comercio es una venta con montos exactos. Sin eventos
 * legibles no hay ventas atribuibles (los montos no se adivinan del delta).
 */
async function salesFromHistory(
  rpc: RealRpc,
  programId: Address,
  settlementAta: Address,
  owner: WalletAddress,
  limit: number,
): Promise<Sale[]> {
  const history = await addressHistory(rpc, settlementAta, limit);
  const sales: (Sale & { slot: number })[] = [];
  const CHUNK = 10;
  for (let i = 0; i < history.length; i += CHUNK) {
    const chunk = history.slice(i, i + CHUNK);
    const txs = await Promise.all(chunk.map((h) => fetchParsedTx(rpc, h.signature)));
    for (let j = 0; j < chunk.length; j++) {
      const h = chunk[j];
      const tx = txs[j];
      if (!tx || tx.meta?.err) continue;
      for (const p of parseCuotasEventsFromLogs(tx.meta?.logMessages, programId)) {
        if (p.name !== "PlanOpened" || String(p.event.merchant) !== owner) continue;
        try {
          const price = safeMicro(p.event.price, "sale.price");
          const fee = safeMicro(p.event.merchantFee, "sale.fee");
          sales.push({
            planId: String(p.event.plan),
            price,
            downPayment: safeMicro(p.event.downPayment, "sale.down"),
            financed: safeMicro(p.event.financed, "sale.financed"),
            fee,
            received: price - fee,
            at: h.blockTime,
            signature: h.signature,
            slot: h.slot,
          });
        } catch {
          // Venta con números fuera de rango: se omite.
        }
      }
    }
  }
  sales.sort((a, b) => a.slot - b.slot || (a.signature < b.signature ? -1 : 1));
  return sales.map(({ slot: _slot, ...e }) => e);
}

async function activityFromHistory(
  rpc: RealRpc,
  programId: Address,
  addr: Address,
  limit: number,
): Promise<Activity[]> {
  const history = await addressHistory(rpc, addr, limit);
  const out: (Activity & { slot: number })[] = [];
  const CHUNK = 10;
  for (let i = 0; i < history.length; i += CHUNK) {
    const chunk = history.slice(i, i + CHUNK);
    const txs = await Promise.all(chunk.map((h) => fetchParsedTx(rpc, h.signature)));
    for (let j = 0; j < chunk.length; j++) {
      const h = chunk[j];
      const tx = txs[j];
      if (!tx || tx.meta?.err) continue;
      const parsed = parseCuotasEventsFromLogs(tx.meta?.logMessages, programId);
      for (const p of parsed) {
        try {
          if (p.name === "PlanOpened") {
            out.push({
              kind: "PlanOpened",
              at: h.blockTime,
              signature: h.signature,
              student: String(p.event.student),
              planId: String(p.event.plan),
              amount: safeMicro(p.event.price, "activity.price"),
              slot: h.slot,
            });
          } else if (p.name === "InstallmentPaid") {
            out.push({
              kind: "InstallmentPaid",
              at: h.blockTime,
              signature: h.signature,
              student: String(p.event.student),
              planId: String(p.event.plan),
              amount: safeMicro(p.event.amount + p.event.penalty, "activity.paid"),
              slot: h.slot,
            });
          } else if (p.name === "InstallmentMarkedLate") {
            out.push({
              kind: "MarkedLate",
              at: h.blockTime,
              signature: h.signature,
              student: String(p.event.student),
              planId: String(p.event.plan),
              amount: safeMicro(p.event.penalty, "activity.penalty"),
              slot: h.slot,
            });
          } else if (p.name === "RecoveryRegistered") {
            out.push({
              kind: "RecoveryRegistered",
              at: h.blockTime,
              signature: h.signature,
              student: String(p.event.student),
              planId: String(p.event.plan),
              amount: safeMicro(p.event.principal + p.event.penalties, "activity.recovery"),
              slot: h.slot,
            });
          } else if (p.name === "GuaranteeRegistered") {
            out.push({
              kind: "GuaranteeRegistered",
              at: h.blockTime,
              signature: h.signature,
              student: String(p.event.student),
              amount: safeMicro(p.event.coverageMax, "activity.coverage"),
              slot: h.slot,
            });
          } else if (p.name === "GuaranteeRevoked") {
            out.push({
              kind: "GuaranteeRevoked",
              at: h.blockTime,
              signature: h.signature,
              student: String(p.event.student),
              slot: h.slot,
            });
          }
        } catch {
          // Evento con números fuera de rango: se omite.
        }
      }
      // Sin eventos atribuidos no hay actividad: los nombres de instrucción
      // en logs no son prueba (cualquier programa los emite).
    }
  }
  // PlanSettled no genera entrada propia: el pago que salda ya aporta
  // InstallmentPaid. TierUp/TierDown y GuarantorNotified no tienen traza
  // onchain (cambios internos de escalón / aviso off-chain del keeper).
  out.sort(
    (a, b) => a.slot - b.slot || ((a.signature ?? "") < (b.signature ?? "") ? -1 : 1),
  );
  return out.map(({ slot: _slot, ...e }) => e);
}

/** Balance real de un token account devUSDC (0 si la cuenta no existe). */
async function tokenBalance(rpc: RealRpc, account: Address): Promise<Micro> {
  const info = await rpc
    .getAccountInfo(account, { encoding: "base64" })
    .send()
    .catch((e: unknown) => {
      throw new CuotasError("unavailable", `Sin lectura de ${account}: ${rpcErr(e)}`);
    });
  if (!info.value) return 0;
  const bal = await rpc
    .getTokenAccountBalance(account)
    .send()
    .catch((e: unknown) => {
      throw new CuotasError("unavailable", `Sin balance de ${account}: ${rpcErr(e)}`);
    });
  const amount = BigInt(bal.value.amount);
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new CuotasError("unavailable", `Balance excede el rango: ${account}`);
  }
  return Number(amount);
}

async function findAta(owner: Address, mint: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({
    mint,
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return ata;
}

// ---------------------------------------------------------------------------
// Cliente real
// ---------------------------------------------------------------------------

/**
 * Crea el cliente real. `overrides` es solo para tests y scripts Node: la UI
 * lo llama sin argumentos y usa el entorno + el transporte bindeado en
 * `providers.tsx`.
 */
export function createRealCuotas(overrides: RealOverrides = {}): CuotasClient & AccountBaseHooks {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  /** Reloj de la cadena: blockTime del slot actual. */
  async function chainNow(rpc: RealRpc): Promise<UnixSeconds> {
    const slot = await rpc
      .getSlot()
      .send()
      .catch((e: unknown) => {
        throw new CuotasError("unavailable", `Sin slot actual: ${rpcErr(e)}`);
      });
    for (let back = 0; back < 3; back++) {
      const t = await rpc
        .getBlockTime(BigInt(slot) - BigInt(back))
        .send()
        .catch(() => null);
      if (typeof t === "bigint") return Number(t);
      if (typeof t === "number") return t;
    }
    throw new CuotasError("unavailable", "El RPC no devuelve blockTime");
  }

  async function readConfig(ctx: RealCtx): Promise<ProtocolConfig> {
    const pda = await configPda(ctx.env.programId);
    const data = await readProgramAccount(
      ctx.rpc,
      pda,
      ctx.env.programId,
      PROTOCOL_CONFIG_DISCRIMINATOR,
      getProtocolConfigDecoder(),
      "ProtocolConfig",
    );
    if (!data) {
      throw new CuotasError("not_found", "ProtocolConfig sin inicializar (falta admin_init_config)");
    }
    const mapped = mapConfig(data);
    if (mapped.usdcMint !== String(ctx.env.usdcMint)) {
      throw new CuotasError(
        "unavailable",
        `El mint onchain (${mapped.usdcMint}) difiere del entorno (${ctx.env.usdcMint})`,
      );
    }
    return mapped;
  }

  return {
    mode: "real",

    async getConfig(): Promise<ProtocolConfig> {
      return readConfig(await readCtx(overrides));
    },

    async getClock(): Promise<DemoClock> {
      const ctx = await readCtx(overrides);
      const config = await readConfig(ctx);
      return { now: await chainNow(ctx.rpc), secondsPerDay: config.secondsPerDay, daysAdvanced: 0 };
    },

    async getReputation(student: WalletAddress): Promise<Reputation> {
      const ctx = await readCtx(overrides);
      const studentAddr = asAddress(student, "estudiante");
      const [pda] = await findReputationPda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const data = await readProgramAccount(
        ctx.rpc,
        pda,
        ctx.env.programId,
        REPUTATION_DISCRIMINATOR,
        getReputationDecoder(),
        "Reputation",
      );
      if (!data) throw new CuotasError("not_found", `reputación de ${student}`);
      return mapReputation(student, data);
    },

    async getGuarantee(student: WalletAddress): Promise<Guarantee | null> {
      const ctx = await readCtx(overrides);
      const studentAddr = asAddress(student, "estudiante");
      const [pda] = await findGuaranteePda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const data = await readProgramAccount(
        ctx.rpc,
        pda,
        ctx.env.programId,
        GUARANTEE_DISCRIMINATOR,
        getGuaranteeDecoder(),
        "Guarantee",
      );
      if (!data) return null;
      return mapGuarantee(student, data);
    },

    async quote(price: Micro, student: WalletAddress): Promise<Quote> {
      const config = await readConfig(await readCtx(overrides));
      let reputation: Reputation | null = null;
      try {
        reputation = await this.getReputation(student);
      } catch (e) {
        if (!(e instanceof CuotasError && e.code === "not_found")) throw e;
      }
      const guarantee = await this.getGuarantee(student);
      const plans = await this.getPlans(student);
      const hasActivePlan = plans.some((p) => p.status === "Active" || p.status === "Late");
      return computeRealQuote(config, price, student, reputation, guarantee, hasActivePlan);
    },

    async getPlans(student: WalletAddress): Promise<Plan[]> {
      const ctx = await readCtx(overrides);
      const studentAddr = asAddress(student, "estudiante");
      const [pda] = await findPlanPda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const data = await readProgramAccount(
        ctx.rpc,
        pda,
        ctx.env.programId,
        PLAN_DISCRIMINATOR,
        getPlanDecoder(),
        "Plan",
      );
      // Un plan por estudiante (Q5) y cierre al saldar: existe o no existe.
      if (!data) return [];
      const config = await readConfig(ctx);
      const now = await chainNow(ctx.rpc);
      let signature = "";
      try {
        const history = await addressHistory(ctx.rpc, pda, 100);
        const oldest = history.sort((a, b) => a.slot - b.slot)[0];
        if (oldest) signature = oldest.signature;
      } catch {
        // Sin historial legible: firma vacía, plan real igual válido.
      }
      return [mapPlan(pda, data, config, now, signature)];
    },

    async getMerchant(owner: WalletAddress): Promise<Merchant> {
      const ctx = await readCtx(overrides);
      const ownerAddr = asAddress(owner, "comercio");
      const [pda] = await findMerchantPda(
        { merchantWallet: ownerAddr },
        { programAddress: ctx.env.programId },
      );
      const data = await readProgramAccount(
        ctx.rpc,
        pda,
        ctx.env.programId,
        MERCHANT_DISCRIMINATOR,
        getMerchantDecoder(),
        "Merchant",
      );
      if (!data) throw new CuotasError("not_found", `comercio ${owner}`);
      const settlementAta = data.settlementAta;
      const settlementBalance = await tokenBalance(ctx.rpc, settlementAta);
      const sales = await salesFromHistory(ctx.rpc, ctx.env.programId, settlementAta, owner, ctx.historyLimit);
      return {
        owner,
        // El programa no guarda el nombre del comercio: etiqueta derivada de
        // la dirección, nunca un nombre inventado.
        name: `Comercio ${owner.slice(0, 4)}…${owner.slice(-4)}`,
        active: data.active,
        settlementBalance,
        plansCount: safeMicro(data.plansCount, "plans_count"),
        sales,
      };
    },

    async getPool(): Promise<Pool> {
      const ctx = await readCtx(overrides);
      const [poolPda] = await findPoolPda(
        { usdcMint: ctx.env.usdcMint },
        { programAddress: ctx.env.programId },
      );
      const data = await readProgramAccount(
        ctx.rpc,
        poolPda,
        ctx.env.programId,
        POOL_DISCRIMINATOR,
        getPoolDecoder(),
        "Pool",
      );
      if (!data) {
        throw new CuotasError("not_found", "Pool sin inicializar (falta pool_init)");
      }
      const [vault] = await findVaultPda(
        { pool: poolPda },
        { programAddress: ctx.env.programId },
      );
      const available = await tokenBalance(ctx.rpc, vault);
      const outstandingCredit = safeMicro(data.outstandingCredit, "outstanding_credit");
      const juniorCapital = safeMicro(data.juniorCapital, "junior_capital");
      const seniorCapital = safeMicro(data.seniorCapital, "senior_capital");
      const events = await poolEventsFromHistory(ctx.rpc, ctx.env.programId, vault, ctx.historyLimit);
      return {
        juniorCapital,
        seniorCapital,
        outstandingCredit,
        accruedFees: safeMicro(data.accruedFees, "accrued_fees"),
        available,
        // NAV = capital reconocido por tramo. El vault puede tener donados sin
        // asignar, que no son NAV (semántica del Pool del programa).
        nav: juniorCapital + seniorCapital,
        events,
      };
    },

    async getActivity(filter?: { student?: WalletAddress; planId?: string }): Promise<Activity[]> {
      const ctx = await readCtx(overrides);
      let list: Activity[];
      if (filter?.student) {
        const studentAddr = asAddress(filter.student, "estudiante");
        const [pda] = await findReputationPda(
          { student: studentAddr },
          { programAddress: ctx.env.programId },
        );
        list = await activityFromHistory(ctx.rpc, ctx.env.programId, pda, ctx.historyLimit);
      } else {
        list = await activityFromHistory(
          ctx.rpc,
          ctx.env.programId,
          ctx.env.programId,
          ctx.historyLimit,
        );
      }
      // Mismo post-filtro que el mock: el planId es la dirección del PDA leída
      // del propio evento atribuido.
      return filter?.planId ? list.filter((a) => a.planId === filter.planId) : list;
    },

    async initReputation(student: WalletAddress): Promise<TxResult<Reputation>> {
      const ctx = await writeCtx(overrides);
      const studentAddr = asAddress(student, "estudiante");
      if (String(ctx.signer.address) !== String(studentAddr)) {
        throw new CuotasError(
          "wallet_required",
          `Conectá la wallet del estudiante (${student}) para crear su reputación`,
        );
      }
      const [configAddr] = await findConfigPda({ programAddress: ctx.env.programId });
      const [reputationAddr] = await findReputationPda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const existing = await readProgramAccount(
        ctx.rpc,
        reputationAddr,
        ctx.env.programId,
        REPUTATION_DISCRIMINATOR,
        getReputationDecoder(),
        "Reputation",
      );
      if (existing) {
        // Idempotente: devuelve el estado real y, si se encuentra, la firma
        // de creación (la más vieja del historial de la cuenta).
        let signature = "";
        try {
          const history = await addressHistory(ctx.rpc, reputationAddr, 100);
          const oldest = history.sort((a, b) => a.slot - b.slot)[0];
          if (oldest) signature = oldest.signature;
        } catch {
          // Sin historial legible: firma vacía, estado real igual válido.
        }
        return { value: mapReputation(student, existing), signature };
      }
      const ix = getStudentInitReputationInstruction({
        student: ctx.signer,
        config: configAddr,
        reputation: reputationAddr,
      });
      const { signature } = await proposeAndSend(ctx.rpc, ctx.env, {
        label: "student_init_reputation",
        version: ctx.version,
        feePayer: studentAddr,
        signer: ctx.signer,
        instructions: [
          {
            ix,
            name: "StudentInitReputation",
            summary: `Crear reputación (escalón 0) de ${student}`,
          },
        ],
      }, { reviewer: overrides.reviewer });
      const created = await readProgramAccount(
        ctx.rpc,
        reputationAddr,
        ctx.env.programId,
        REPUTATION_DISCRIMINATOR,
        getReputationDecoder(),
        "Reputation",
      );
      if (!created) {
        throw new CuotasError(
          "unavailable",
          `La reputación no aparece tras ${explorerTxUrl(signature)}`,
        );
      }
      notify();
      return { value: mapReputation(student, created), signature };
    },

    async openPlan(args): Promise<TxResult<Plan>> {
      const ctx = await writeCtx(overrides);
      const studentAddr = asAddress(args.student, "estudiante");
      if (String(ctx.signer.address) !== String(studentAddr)) {
        throw new CuotasError(
          "wallet_required",
          `Conectá la wallet del estudiante (${args.student}) para comprar`,
        );
      }
      const config = await readConfig(ctx);
      // Elegibilidad local primero: razones claras antes de simular. Sin
      // cuenta Reputation no es un error: la primera compra la crea en la
      // misma transacción (initReputation antes que open_plan, una firma).
      let reputation: Reputation | null = null;
      try {
        reputation = await this.getReputation(args.student);
      } catch (e) {
        if (!(e instanceof CuotasError && e.code === "not_found")) throw e;
      }
      const guarantee = await this.getGuarantee(args.student);
      const existing = await this.getPlans(args.student);
      const quote = computeRealQuote(
        config,
        args.price,
        args.student,
        reputation,
        guarantee,
        existing.some((p) => p.status === "Active" || p.status === "Late"),
      );
      if (!quote.eligible) {
        throw new CuotasError(quote.reasons[0], `openPlan: ${quote.reasons[0]}`);
      }
      const merchantAddr = asAddress(args.merchant, "comercio");
      const [merchantPda] = await findMerchantPda(
        { merchantWallet: merchantAddr },
        { programAddress: ctx.env.programId },
      );
      const merchantAcct = await readProgramAccount(
        ctx.rpc,
        merchantPda,
        ctx.env.programId,
        MERCHANT_DISCRIMINATOR,
        getMerchantDecoder(),
        "Merchant",
      );
      if (!merchantAcct) throw new CuotasError("not_found", `comercio ${args.merchant}`);
      if (!merchantAcct.active) {
        throw new CuotasError("unavailable", `comercio ${args.merchant} inactivo`);
      }
      const studentAta = await findAta(studentAddr, ctx.env.usdcMint);
      const balance = await tokenBalance(ctx.rpc, studentAta);
      if (balance < quote.downPayment) {
        throw new CuotasError(
          "unavailable",
          `Saldo devUSDC insuficiente para el anticipo (tenés ${balance}, necesitás ${quote.downPayment})`,
        );
      }
      const [configPda] = await findConfigPda({ programAddress: ctx.env.programId });
      const [poolPda] = await findPoolPda(
        { usdcMint: ctx.env.usdcMint },
        { programAddress: ctx.env.programId },
      );
      const [vault] = await findVaultPda({ pool: poolPda }, { programAddress: ctx.env.programId });
      const [lpJunior] = await findLpJuniorMintPda({ pool: poolPda }, { programAddress: ctx.env.programId });
      const [lpSenior] = await findLpSeniorMintPda({ pool: poolPda }, { programAddress: ctx.env.programId });
      const [reputationPda] = await findReputationPda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const [guaranteePda] = await findGuaranteePda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const [planPda] = await findPlanPda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const ix = getOpenPlanInstruction({
        student: ctx.signer,
        config: configPda,
        pool: poolPda,
        vault,
        usdcMint: ctx.env.usdcMint,
        lpJuniorMint: lpJunior,
        lpSeniorMint: lpSenior,
        merchant: merchantPda,
        merchantWallet: merchantAddr,
        settlementAta: merchantAcct.settlementAta,
        studentUsdcAta: studentAta,
        reputation: reputationPda,
        // Sin garantía registrada se pasa el ID del programa (convención de
        // `open_plan.rs` para la cuenta opcional).
        guarantee: guarantee ? guaranteePda : ctx.env.programId,
        plan: planPda,
        price: args.price,
      });
      // Primera compra sin Reputation on-chain: la misma transacción lleva
      // student_init_reputation ANTES de open_plan. Anchor deserializa cada
      // cuenta al ejecutar su instrucción, así que la segunda lee la
      // reputación que la primera acaba de crear — una sola firma.
      const instructions = [
        ...(reputation
          ? []
          : [
              {
                ix: getStudentInitReputationInstruction({
                  student: ctx.signer,
                  config: configPda,
                  reputation: reputationPda,
                }),
                name: "StudentInitReputation",
                summary: `Crear reputación (escalón 0) de ${args.student}`,
              },
            ]),
        {
          ix,
          name: "OpenPlan",
          summary: `Comprar por ${args.price} (anticipo ${quote.downPayment}, financia ${quote.financed})`,
        },
      ];
      const { signature } = await proposeAndSend(ctx.rpc, ctx.env, {
        label: "open_plan",
        version: ctx.version,
        feePayer: studentAddr,
        signer: ctx.signer,
        instructions,
      }, { reviewer: overrides.reviewer });
      const created = await readProgramAccount(
        ctx.rpc,
        planPda,
        ctx.env.programId,
        PLAN_DISCRIMINATOR,
        getPlanDecoder(),
        "Plan",
      );
      if (!created) {
        throw new CuotasError("unavailable", `El plan no aparece tras ${explorerTxUrl(signature)}`);
      }
      const now = await chainNow(ctx.rpc);
      notify();
      return { value: mapPlan(planPda, created, config, now, signature), signature };
    },

    async payInstallment(student: WalletAddress, planId: string): Promise<TxResult<Plan>> {
      const ctx = await writeCtx(overrides);
      const studentAddr = asAddress(student, "estudiante");
      if (String(ctx.signer.address) !== String(studentAddr)) {
        throw new CuotasError(
          "wallet_required",
          `Conectá la wallet del estudiante (${student}) para pagar`,
        );
      }
      const [planPda] = await findPlanPda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      if (planId !== String(planPda)) {
        throw new CuotasError("not_found", `plan ${planId}`);
      }
      const config = await readConfig(ctx);
      const plan = await readProgramAccount(
        ctx.rpc,
        planPda,
        ctx.env.programId,
        PLAN_DISCRIMINATOR,
        getPlanDecoder(),
        "Plan",
      );
      if (!plan) throw new CuotasError("not_found", `plan ${planId} (sin plan activo)`);
      const firstUnpaid = plan.installments.findIndex((i) => !i.paid && !i.charged);
      if (firstUnpaid < 0) throw new CuotasError("nothing_due", `plan ${planId} sin cuotas impagas`);
      const now = await chainNow(ctx.rpc);
      const preImage = mapPlan(planPda, plan, config, now, "");
      const [configPda] = await findConfigPda({ programAddress: ctx.env.programId });
      const [poolPda] = await findPoolPda(
        { usdcMint: ctx.env.usdcMint },
        { programAddress: ctx.env.programId },
      );
      const [vault] = await findVaultPda({ pool: poolPda }, { programAddress: ctx.env.programId });
      const [lpJunior] = await findLpJuniorMintPda({ pool: poolPda }, { programAddress: ctx.env.programId });
      const [lpSenior] = await findLpSeniorMintPda({ pool: poolPda }, { programAddress: ctx.env.programId });
      const [reputationPda] = await findReputationPda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const studentAta = await findAta(studentAddr, ctx.env.usdcMint);
      const ix = getPayInstallmentInstruction({
        student: ctx.signer,
        config: configPda,
        pool: poolPda,
        vault,
        usdcMint: ctx.env.usdcMint,
        lpJuniorMint: lpJunior,
        lpSeniorMint: lpSenior,
        studentUsdcAta: studentAta,
        reputation: reputationPda,
        plan: planPda,
        expectedInstallmentIndex: firstUnpaid,
        expectedOpenedAt: plan.openedAt,
        expectedGeneration: plan.generation,
      });
      const due = preImage.installments[firstUnpaid];
      const { signature } = await proposeAndSend(ctx.rpc, ctx.env, {
        label: "pay_installment",
        version: ctx.version,
        feePayer: studentAddr,
        signer: ctx.signer,
        instructions: [
          {
            ix,
            name: "PayInstallment",
            summary: `Pagar cuota ${firstUnpaid + 1} (${due.amount + due.penalty})`,
          },
        ],
      }, { reviewer: overrides.reviewer });
      const after = await readProgramAccount(
        ctx.rpc,
        planPda,
        ctx.env.programId,
        PLAN_DISCRIMINATOR,
        getPlanDecoder(),
        "Plan",
      );
      notify();
      if (after) return { value: mapPlan(planPda, after, config, now, signature), signature };
      // Se saldó y el programa cerró la cuenta: imagen verificada (todo
      // resuelto + cierre). El punitorio exacto sale del evento InstallmentPaid.
      let penalty = due.penalty;
      try {
        const tx = await fetchParsedTx(ctx.rpc, signature);
        for (const p of parseCuotasEventsFromLogs(tx?.meta?.logMessages, ctx.env.programId)) {
          if (p.name === "InstallmentPaid") penalty = safeMicro(p.event.penalty, "paid.penalty");
        }
      } catch {
        // Sin evento legible: se conserva el punitorio pre-imagen.
      }
      const settled: Plan = {
        ...preImage,
        installments: preImage.installments.map((inst, idx) =>
          idx === firstUnpaid ? { ...inst, penalty, status: "Paid" as const } : inst,
        ),
        status: "Settled",
        signature,
      };
      return { value: settled, signature };
    },

    // Puente keeper: solo la wallet keeper conectada registra garantías (el
    // operador aprueba en su wallet). Construye EXACTAMENTE lo que el
    // verificador del backend acepta (`keeper_register_guarantee` con los
    // args del acceptance); tras enviar, la UI/operador postea
    // {acceptanceId, signature} a /api/fiador/fianza/registrar para que el
    // servidor verifique onchain antes de marcar registrado. Sin keeper:
    // `unauthorized`, nunca un registro inventado.
    async registerGuarantee(args): Promise<TxResult<Guarantee>> {
      const ctx = await writeCtx(overrides);
      const config = await readConfig(ctx);
      if (String(ctx.signer.address) !== config.keeper) {
        throw new CuotasError("unauthorized", "Solo la wallet keeper registra garantías");
      }
      const studentAddr = asAddress(args.student, "estudiante");
      const mandateHash = hexToBytes(args.mandateHash, "mandate_hash");
      const [configPda] = await findConfigPda({ programAddress: ctx.env.programId });
      const [guaranteePda] = await findGuaranteePda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const existing = await readProgramAccount(
        ctx.rpc,
        guaranteePda,
        ctx.env.programId,
        GUARANTEE_DISCRIMINATOR,
        getGuaranteeDecoder(),
        "Guarantee",
      );
      if (existing) {
        throw new CuotasError(
          "unavailable",
          "Garantía ya registrada: la actualización (keeper_update_guarantee) pasa por el CLI del keeper, cuyo verificador solo acepta registros nuevos",
        );
      }
      const keeperAddr = asAddress(config.keeper ?? "", "keeper");
      const ix = getKeeperRegisterGuaranteeInstruction({
        keeper: ctx.signer,
        config: configPda,
        student: studentAddr,
        guarantee: guaranteePda,
        maxPurchase: args.maxPurchase,
        coverageMax: args.coverageMax,
        mandateHash,
      });
      const { signature } = await proposeAndSend(ctx.rpc, ctx.env, {
        label: "keeper_register_guarantee",
        version: ctx.version,
        feePayer: keeperAddr,
        signer: ctx.signer,
        instructions: [
          {
            ix,
            name: "KeeperRegisterGuarantee",
            summary: `Registrar fiador de ${args.student} (tope ${args.maxPurchase})`,
          },
        ],
      }, { reviewer: overrides.reviewer });
      const updated = await readProgramAccount(
        ctx.rpc,
        guaranteePda,
        ctx.env.programId,
        GUARANTEE_DISCRIMINATOR,
        getGuaranteeDecoder(),
        "Guarantee",
      );
      if (!updated) {
        throw new CuotasError("unavailable", `La garantía no aparece tras ${explorerTxUrl(signature)}`);
      }
      notify();
      return { value: mapGuarantee(args.student, updated), signature };
    },

    async revokeGuarantee(student: WalletAddress): Promise<TxResult<Guarantee>> {
      const ctx = await writeCtx(overrides);
      const config = await readConfig(ctx);
      if (String(ctx.signer.address) !== config.keeper) {
        throw new CuotasError("unauthorized", "Solo la wallet keeper revoca garantías");
      }
      const studentAddr = asAddress(student, "estudiante");
      const [configPda] = await findConfigPda({ programAddress: ctx.env.programId });
      const [guaranteePda] = await findGuaranteePda(
        { student: studentAddr },
        { programAddress: ctx.env.programId },
      );
      const existing = await readProgramAccount(
        ctx.rpc,
        guaranteePda,
        ctx.env.programId,
        GUARANTEE_DISCRIMINATOR,
        getGuaranteeDecoder(),
        "Guarantee",
      );
      if (!existing) throw new CuotasError("not_found", `fiador de ${student}`);
      const ix = getKeeperRevokeGuaranteeInstruction({
        keeper: ctx.signer,
        config: configPda,
        student: studentAddr,
        guarantee: guaranteePda,
      });
      const { signature } = await proposeAndSend(ctx.rpc, ctx.env, {
        label: "keeper_revoke_guarantee",
        version: ctx.version,
        feePayer: asAddress(config.keeper ?? "", "keeper"),
        signer: ctx.signer,
        instructions: [{ ix, name: "KeeperRevokeGuarantee", summary: `Revocar fiador de ${student}` }],
      }, { reviewer: overrides.reviewer });
      const updated = await readProgramAccount(
        ctx.rpc,
        guaranteePda,
        ctx.env.programId,
        GUARANTEE_DISCRIMINATOR,
        getGuaranteeDecoder(),
        "Guarantee",
      );
      if (!updated) {
        throw new CuotasError("unavailable", `La garantía no aparece tras ${explorerTxUrl(signature)}`);
      }
      notify();
      return { value: mapGuarantee(student, updated), signature };
    },

    async advanceDays(_days: number): Promise<DemoClock> {
      throw new CuotasError("demo_only");
    },

    async resetDemo(): Promise<void> {
      throw new CuotasError("demo_only");
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    // --- AccountBaseHooks (las implementa la base real con la wallet) ---

    async setProtocolState(actor: WalletAddress, state): Promise<ProtocolConfig> {
      const ctx = await writeCtx(overrides);
      const config = await readConfig(ctx);
      if (actor !== config.admin) {
        throw new CuotasError("unauthorized", "El actor no es la autoridad admin");
      }
      if (String(ctx.signer.address) !== actor) {
        throw new CuotasError("wallet_required", `Conectá la wallet admin (${actor}) para firmar`);
      }
      const [configAddr] = await findConfigPda({ programAddress: ctx.env.programId });
      const stateArg =
        state === "Normal"
          ? GeneratedProtocolState.Normal
          : state === "Halted"
            ? GeneratedProtocolState.Halted
            : GeneratedProtocolState.WithdrawsOnly;
      const ix = getAdminSetStateInstruction({ admin: ctx.signer, config: configAddr, state: stateArg });
      await proposeAndSend(ctx.rpc, ctx.env, {
        label: "admin_set_state",
        version: ctx.version,
        feePayer: asAddress(actor, "admin"),
        signer: ctx.signer,
        instructions: [{ ix, name: "AdminSetState", summary: `Cambiar estado a ${state}` }],
      }, { reviewer: overrides.reviewer });
      notify();
      return readConfig(ctx);
    },

    async registerMerchantAccount(actor: WalletAddress, args): Promise<Merchant> {
      const ctx = await writeCtx(overrides);
      const config = await readConfig(ctx);
      if (actor !== config.admin) {
        throw new CuotasError("unauthorized", "El actor no es la autoridad admin");
      }
      if (String(ctx.signer.address) !== actor) {
        throw new CuotasError("wallet_required", `Conectá la wallet admin (${actor}) para firmar`);
      }
      const merchantWallet = asAddress(args.owner, "comercio");
      const [configAddr] = await findConfigPda({ programAddress: ctx.env.programId });
      const ata = await findAta(merchantWallet, ctx.env.usdcMint);
      const [merchantAddr] = await findMerchantPda(
        { merchantWallet },
        { programAddress: ctx.env.programId },
      );
      const ix = getMerchantRegisterInstruction({
        admin: ctx.signer,
        config: configAddr,
        merchantWallet,
        usdcMint: ctx.env.usdcMint,
        settlementAta: ata,
        merchant: merchantAddr,
      });
      await proposeAndSend(ctx.rpc, ctx.env, {
        label: "merchant_register",
        version: ctx.version,
        feePayer: asAddress(actor, "admin"),
        signer: ctx.signer,
        instructions: [
          { ix, name: "MerchantRegister", summary: `Registrar comercio ${args.owner}` },
        ],
      }, { reviewer: overrides.reviewer });
      notify();
      return this.getMerchant(args.owner);
    },

    async getDevUsdcBalance(owner: WalletAddress): Promise<Micro> {
      const ctx = await readCtx(overrides);
      const ata = await findAta(asAddress(owner, "dueño"), ctx.env.usdcMint);
      return tokenBalance(ctx.rpc, ata);
    },

    async listMerchants(): Promise<AdminMerchantRef[]> {
      const ctx = await readCtx(overrides);
      const discriminatorB58 = getBase58Decoder().decode(
        new Uint8Array(MERCHANT_DISCRIMINATOR),
      ) as Base58EncodedBytes;
      const found = await ctx.rpc
        .getProgramAccounts(ctx.env.programId, {
          encoding: "base64",
          filters: [{ memcmp: { offset: BigInt(0), bytes: discriminatorB58, encoding: "base58" } }],
        })
        .send()
        .catch((e: unknown) => {
          throw new CuotasError("unavailable", `Sin listado de comercios: ${rpcErr(e)}`);
        });
      const decoder = getMerchantDecoder();
      const base64 = getBase64Encoder();
      const refs: AdminMerchantRef[] = [];
      for (const { account } of found) {
        const data = account.data;
        if (typeof data === "string" || !Array.isArray(data) || typeof data[0] !== "string") continue;
        let decoded;
        try {
          const bytes = base64.encode(data[0]);
          // El barrido ya filtra por discriminador en el RPC; se revalida
          // local + tamaño antes de decodificar.
          if (bytes.length !== decoder.fixedSize || !bytesStartWith(bytes, MERCHANT_DISCRIMINATOR)) {
            continue;
          }
          decoded = decoder.decode(bytes);
        } catch {
          continue;
        }
        refs.push({
          owner: String(decoded.owner),
          // El programa no guarda el nombre: `null` honesto, la UI decide.
          name: null,
          active: decoded.active,
          source: "account",
        });
      }
      return refs;
    },
  };
}

// Notas de cobertura real (2026-10-06, IDL 9c5abcce):
// - `registerGuarantee`/`revokeGuarantee`: puente keeper (la wallet keeper
//   conectada firma; el backend produce el mandato canónico). Sin keeper:
//   `unauthorized`.
// - `crank_mark_late` lo corre el keeper off-chain (Fase B, otro worker); este
//   cliente no expone crank (el pago auto-marca la mora igual).
// - `TierUp`/`TierDown`/`GuarantorNotified` no tienen traza onchain y no
//   aparecen en `getActivity` real (ver comentario en `activityFromHistory`).
// - `guarantor_notice_day` se mapea directo de `ProtocolConfig` (día 3 por
//   defecto en el seed, ronda 2 Q2). Nombre del comercio: etiqueta derivada
//   (el programa no lo guarda).



