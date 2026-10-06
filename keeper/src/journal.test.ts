import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Journal, JournalError, parseKey } from "./journal.ts";

const freshDir = (): string => mkdtempSync(join(tmpdir(), "lazo-journal-test-"));
const OPENED = 1_799_000_000;

describe("journal", () => {
  it("proposes, tracks open proposals, and closes them terminally", () => {
    const j = new Journal(freshDir());
    const p = j.propose({
      kind: "charge",
      key: `charge:plan-1:${OPENED}:0`,
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1.5,
      detail: "charge plan=plan-1 installment=0 amount=100 day=15",
    });
    assert.equal(j.openProposals().length, 1);
    assert.equal(j.findProposal(p.id)?.key, `charge:plan-1:${OPENED}:0`);
    assert.equal(j.hasTerminal(`charge:plan-1:${OPENED}:0`), false);
    j.append({
      kind: "CHARGE_OK",
      key: `charge:plan-1:${OPENED}:0`,
      proposalId: p.id,
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1.5,
      receipt: "abc",
      detail: "charged",
    });
    assert.equal(j.hasTerminal(`charge:plan-1:${OPENED}:0`), true);
    assert.equal(j.openProposals().length, 0);
    assert.equal(j.findProposal(p.id), null);
  });

  it("keeps generations independent: same PDA, different openedAt", () => {
    const j = new Journal(freshDir());
    j.append({
      kind: "CHARGE_OK",
      key: `charge:plan-1:${OPENED}:0`,
      proposalId: "p1",
      planId: "plan-1",
      installment: 0,
      amountMicro: 1,
      amountArs: null,
      receipt: "r",
      detail: "gen1",
    });
    assert.equal(j.hasTerminal(`charge:plan-1:${OPENED}:0`), true);
    assert.equal(j.hasTerminal(`charge:plan-1:${OPENED + 1}:0`), false);
    assert.deepEqual(parseKey(`charge:plan-1:${OPENED}:0`), {
      kind: "charge",
      planId: "plan-1",
      openedAt: OPENED,
      index: 0,
    });
    assert.equal(parseKey("charge:plan-1:0"), null);
  });

  it("survives restarts: terminal keys stay done", () => {
    const dir = freshDir();
    const a = new Journal(dir);
    const p = a.propose({
      kind: "mark_late",
      key: `late:plan-9:${OPENED}:1`,
      planId: "plan-9",
      installment: 1,
      amountMicro: 0,
      amountArs: null,
      detail: "mark_late plan=plan-9 installment=1 day=6",
    });
    a.append({
      kind: "MARKED_LATE",
      key: `late:plan-9:${OPENED}:1`,
      proposalId: p.id,
      planId: "plan-9",
      installment: 1,
      amountMicro: null,
      amountArs: null,
      receipt: null,
      detail: "sig",
    });
    const b = new Journal(dir); // "restart"
    assert.equal(b.hasTerminal(`late:plan-9:${OPENED}:1`), true);
    assert.equal(b.openProposals().length, 0);
    // Sequence continues past the restart (no seq reuse).
    const c = b.propose({
      kind: "notify",
      key: `notify:plan-2:${OPENED}:0`,
      planId: "plan-2",
      installment: 0,
      amountMicro: 5,
      amountArs: null,
      detail: "notify plan=plan-2 installment=0 day=3",
    });
    assert.equal(b.findProposal(c.id)?.kind, "notify");
  });

  it("infers recover proposals and keeps ERROR non-terminal", () => {
    const j = new Journal(freshDir());
    const p = j.propose({
      kind: "recover",
      key: `recovery:plan-1:${OPENED}:0`,
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1.5,
      detail: "recover plan=plan-1 installment=0 receipt=abc",
    });
    assert.equal(j.findProposal(p.id)?.kind, "recover");
    j.append({
      kind: "ERROR",
      key: `recovery:plan-1:${OPENED}:0`,
      proposalId: p.id,
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1.5,
      receipt: "abc",
      detail: "boom",
    });
    assert.equal(j.hasTerminal(`recovery:plan-1:${OPENED}:0`), false);
    assert.equal(j.findProposal(p.id)?.id, p.id);
  });

  it("fails closed on a torn journal instead of guessing the lost effect", () => {
    const dir = freshDir();
    const a = new Journal(dir);
    a.append({
      kind: "PROPOSED",
      key: `charge:plan-1:${OPENED}:0`,
      proposalId: "p1",
      planId: "plan-1",
      installment: 0,
      amountMicro: 1,
      amountArs: null,
      receipt: null,
      detail: "charge plan=plan-1 installment=0",
    });
    writeFileSync(join(dir, "keeper-journal.jsonl"), '{"torn": true, unparseable\n', { flag: "a" });
    assert.throws(() => new Journal(dir), (e: unknown) => e instanceof JournalError && e.code === "corrupt_journal");
  });
});
