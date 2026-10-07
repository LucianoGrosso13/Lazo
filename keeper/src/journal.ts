// Append-only recovery journal (JSONL). The journal is the keeper's memory
// across restarts: every proposed and executed effect is keyed, so a restart
// never double-charges a card or double-registers a recovery.
//
// Keys include the plan generation (openedAt): the Plan PDA ["plan", student]
// is CLOSED on settlement and REUSED by the next plan, so planId alone would
// collide across generations and wrongly skip new charges.
//   late:{planId}:{openedAt}:{idx}      mark-late effect for an installment
//   charge:{planId}:{openedAt}:{idx}    card charge for an installment (+penalty)
//   recovery:{planId}:{openedAt}:{idx}  on-chain recovery registration
//   loss:{planId}:{openedAt}:{idx}      loss proposal when funding failed
//
// Terminal records (MARKED_LATE, CHARGE_OK, CHARGE_FAILED, CHARGE_REFUSED,
// CHARGE_SIMULATED, RECOVERY_REGISTERED, LOSS_PROPOSED, NOTIFIED) make their
// key done: later runs skip them.
import { appendFileSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export class JournalError extends Error {
  readonly code: "corrupt_journal" | "journal_io";
  constructor(code: "corrupt_journal" | "journal_io", message?: string) {
    super(message ?? code);
    this.name = "JournalError";
    this.code = code;
  }
}

export type JournalKind =
  | "PROPOSED"
  | "MARKED_LATE"
  | "CHARGE_OK"
  | "CHARGE_FAILED"
  | "CHARGE_REFUSED"
  | "CHARGE_SIMULATED"
  | "RECOVERY_REGISTERED"
  | "RECOVERY_PENDING"
  | "LOSS_PROPOSED"
  | "NOTIFIED"
  | "GUARANTEE_REGISTERED"
  | "PAYOUT_RELEASED"
  | "ERROR";

export interface JournalRecord {
  seq: number;
  at: number;
  kind: JournalKind;
  key: string;
  proposalId: string | null;
  planId: string | null;
  installment: number | null;
  amountMicro: number | null;
  amountArs: number | null;
  /** Verified receipt hash (CHARGE_OK only). Never fabricated. */
  receipt: string | null;
  detail: string;
}

export interface Proposal {
  id: string;
  kind: "mark_late" | "charge" | "notify" | "recover" | "loss" | "release_payout";
  key: string;
  planId: string;
  installment: number;
  amountMicro: number;
  amountArs: number | null;
  createdAt: number;
  detail: string;
}

const TERMINAL: ReadonlySet<JournalKind> = new Set([
  "MARKED_LATE",
  "CHARGE_OK",
  "CHARGE_FAILED",
  "CHARGE_REFUSED",
  "CHARGE_SIMULATED",
  "RECOVERY_REGISTERED",
  "LOSS_PROPOSED",
  "NOTIFIED",
  "GUARANTEE_REGISTERED",
  "PAYOUT_RELEASED",
]);

export class Journal {
  private seq = 0;
  private file: string;

  constructor(dataDir: string, fileName = "keeper-journal.jsonl") {
    mkdirSync(dataDir, { recursive: true });
    this.file = join(dataDir, fileName);
    if (existsSync(this.file)) {
      // A torn line means a crash mid-append with an UNKNOWN effect: fail
      // closed so the operator repairs explicitly instead of the keeper
      // silently re-executing (or skipping) a charge.
      const lines = readFileSync(this.file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!line.trim()) return;
        try {
          const r = JSON.parse(line) as Partial<JournalRecord>;
          if (typeof r.seq === "number" && r.seq >= this.seq) this.seq = r.seq + 1;
        } catch {
          throw new JournalError("corrupt_journal", `corrupt_journal: torn line ${i + 1} (repair or truncate explicitly)`);
        }
      });
    }
  }

  append(entry: Omit<JournalRecord, "seq" | "at"> & { at?: number }): JournalRecord {
    const record: JournalRecord = { seq: this.seq++, at: entry.at ?? Math.floor(Date.now() / 1000), ...entry };
    try {
      appendFileSync(this.file, JSON.stringify(record) + "\n", "utf8");
      const fd = openSync(this.file, "r");
      try {
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    } catch (e) {
      if (e instanceof JournalError) throw e;
      throw new JournalError("journal_io", `journal_io: append failed (${e instanceof Error ? e.message : "io error"})`);
    }
    return record;
  }

  readAll(): JournalRecord[] {
    if (!existsSync(this.file)) return [];
    const out: JournalRecord[] = [];
    const lines = readFileSync(this.file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      try {
        out.push(JSON.parse(line) as JournalRecord);
      } catch {
        throw new JournalError("corrupt_journal", `corrupt_journal: torn line ${i + 1} (repair or truncate explicitly)`);
      }
    });
    return out;
  }

  /** Keys with a terminal record: their effect must not run again. */
  terminalKeys(): Set<string> {
    const keys = new Set<string>();
    for (const r of this.readAll()) {
      if (TERMINAL.has(r.kind)) keys.add(r.key);
    }
    return keys;
  }

  hasTerminal(key: string): boolean {
    return this.terminalKeys().has(key);
  }

  propose(p: Omit<Proposal, "id" | "createdAt"> & { createdAt?: number }): Proposal {
    const proposal: Proposal = {
      ...p,
      id: `prop-${randomUUID().slice(0, 8)}`,
      createdAt: p.createdAt ?? Math.floor(Date.now() / 1000),
    };
    this.append({
      kind: "PROPOSED",
      key: p.key,
      proposalId: proposal.id,
      planId: p.planId,
      installment: p.installment,
      amountMicro: p.amountMicro,
      amountArs: p.amountArs,
      receipt: null,
      detail: p.detail,
    });
    return proposal;
  }

  /** Latest open (non-terminal) proposal per key. */
  openProposals(): Proposal[] {
    const terminal = this.terminalKeys();
    const latest = new Map<string, Proposal>();
    for (const r of this.readAll()) {
      if (r.kind !== "PROPOSED" || !r.proposalId || r.planId == null || r.installment == null) continue;
      if (terminal.has(r.key)) continue;
      latest.set(r.key, {
        id: r.proposalId,
        kind: r.detail.startsWith("release_payout")
          ? "release_payout"
          : r.detail.startsWith("mark_late")
          ? "mark_late"
          : r.detail.startsWith("notify")
            ? "notify"
            : r.detail.startsWith("recover")
              ? "recover"
              : r.detail.startsWith("loss")
                ? "loss"
                : "charge",
        key: r.key,
        planId: r.planId,
        installment: r.installment,
        amountMicro: r.amountMicro ?? 0,
        amountArs: r.amountArs,
        createdAt: r.at,
        detail: r.detail,
      });
    }
    return [...latest.values()];
  }

  findProposal(id: string): Proposal | null {
    return this.openProposals().find((p) => p.id === id) ?? null;
  }
}

export const lateKey = (planId: string, openedAt: number, idx: number): string =>
  `late:${planId}:${openedAt}:${idx}`;
export const chargeKey = (planId: string, openedAt: number, idx: number): string =>
  `charge:${planId}:${openedAt}:${idx}`;
export const recoveryKey = (planId: string, openedAt: number, idx: number): string =>
  `recovery:${planId}:${openedAt}:${idx}`;
export const lossKey = (planId: string, openedAt: number, idx: number): string =>
  `loss:${planId}:${openedAt}:${idx}`;
export const notifyKey = (planId: string, openedAt: number, idx: number): string =>
  `notify:${planId}:${openedAt}:${idx}`;
export const guaranteeKey = (student: string): string => `guarantee:${student}`;

/** Parses a generation-aware key back into its parts. Null when malformed. */
export function parseKey(key: string): { kind: string; planId: string; openedAt: number; index: number } | null {
  const parts = key.split(":");
  if (parts.length !== 4) return null;
  const [kind, planId, openedAtRaw, indexRaw] = parts;
  const openedAt = Number(openedAtRaw);
  const index = Number(indexRaw);
  if (!kind || !planId || !Number.isSafeInteger(openedAt) || !Number.isSafeInteger(index)) return null;
  return { kind, planId, openedAt, index };
}
