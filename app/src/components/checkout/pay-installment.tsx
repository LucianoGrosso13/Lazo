"use client";

// Pago de la próxima cuota impaga (ticket 02): CTA sobre la primera impaga,
// revisión con importe exacto/destino pool/token/red y aprobación NUEVA en
// Phantom (la del anticipo no autoriza la cuota), progreso por fases,
// éxito solo tras confirmación + plan releído con la cuota `Paid`, y un
// `uncertain` persistido por wallet+plan que jamás reenvía a ciegas.
// Reusa el runner de ticket01 (`createOpenPlanRunner`): la máquina de
// estados es agnóstica a la operación.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useSWRConfig } from "swr";
import {
  formatUsdc,
  getAccountCuotas,
  getCuotas,
  waitForOperation,
  type Micro,
  type Plan,
  type UnixSeconds,
  type WalletAddress,
} from "@/lib/cuotas";
import { checkout } from "@/i18n/dictionaries/checkout";
import { design } from "@/i18n/dictionaries/design";
import { useLocale, useT } from "@/i18n/locale";
import { GlassPanel } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { StateMark } from "@/components/ui/state-mark";
import { ExplorerLink, ReferenceTag } from "@/components/ui/badges";
import { TxProgressView } from "./tx-progress";
import {
  createOpenPlanRunner,
  type OpenFlowState,
  type OpenPlanRun,
} from "./open-plan-flow";
import { unpaidInstallments } from "./plan-calendar";
import {
  clearPendingPay,
  loadPendingPay,
  savePendingPay,
  type PendingPayOp,
} from "./pending-pay";
import styles from "./checkout.module.css";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Total a pagar por la cuota: importe + punitorio si está en mora. */
function dueOf(i: { amount: Micro; status: string; penalty: Micro }): Micro {
  return i.amount + (i.status === "Late" ? i.penalty : 0);
}

/**
 * Flujo de pago embebible: devuelve `cta` (botón sobre la cuota impaga) y
 * `panel` (revisión → progreso → resultado) para renderizar donde convenga.
 * `student` = identidad que firma; si cambia, el resultado tardío se
 * descarta y la operación pendiente queda persistida para la original.
 */
export function usePayInstallment({
  plan,
  student,
  onPaid,
}: {
  plan: Plan | null;
  student: WalletAddress | null;
  /** Se llama una vez por veredicto confirmado con el plan releído
   * (`null` = cuenta cerrada: refrescar lecturas, el efecto ya se probó). */
  onPaid?: (plan: Plan | null, signature: string) => void;
}): { cta: ReactNode; panel: ReactNode } {
  const all = useT(checkout);
  const t = all.pay;
  const { locale } = useLocale();
  const { mutate } = useSWRConfig();

  const [runner] = useState(() => createOpenPlanRunner());
  const flow = useSyncExternalStore(
    (cb) => runner.subscribe(cb),
    () => runner.state(),
    () => runner.state(),
  );
  const [open, setOpen] = useState(false);
  // La cuota pagada queda congelada: al releer el plan la primera impaga
  // avanza y el título del éxito debe seguir nombrando a la que se pagó.
  const [paidIdx, setPaidIdx] = useState<number | null>(null);
  // La cuota esperada queda congelada al firmar/restaurar: persistir el
  // `nextUp` vivo reescribiría la entrada con otra cuota bajo la misma firma.
  const expectedRef = useRef<{ index: number; openedAt?: UnixSeconds } | null>(
    null,
  );
  // Altura de expiración de la propuesta firmada (cuando el cliente la
  // emite): se propaga al snapshot de reconciliación y a lo persistido.
  const payExpiryRef = useRef<number | undefined>(undefined);

  // Identidad que firma: snapshot por render; un cambio descarta resultados
  // tardíos (nunca se aplica a otra cuenta).
  const studentRef = useRef(student);
  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  const pending = plan ? unpaidInstallments(plan) : [];
  const nextUp = pending[0] ?? null;
  // El plan puede avanzar mientras se verifica la firma original. La
  // revisión sigue mostrando ESA cuota, no el importe de la siguiente.
  const reviewed = paidIdx === null
    ? nextUp
    : plan?.installments.find((i) => i.index === paidIdx);
  const due = reviewed ? dueOf(reviewed) : 0;

  // `expected` es la cuota tal como se firmó (o como quedó persistida):
  // reconciliar con el `nextUp` de ESTE render marcaría otra cuota si el
  // plan avanzó entre la firma y la verificación.
  const buildRun = (
    payer: WalletAddress,
    expected: {
      index: number;
      openedAt?: UnixSeconds;
      lastValidBlockHeight?: number;
    },
  ): OpenPlanRun => ({
    call: (onProgress) =>
      getCuotas().payInstallment(payer, plan!.id, { onProgress }),
    isCurrent: () => studentRef.current === payer,
    reconcile: (signature) =>
      signature
        ? waitForOperation(
            getCuotas(),
            {
              operation: "pay_installment",
              student: payer,
              planId: plan!.id,
              signature,
              expectedInstallmentIndex: expected.index,
              expectedOpenedAt: expected.openedAt,
              lastValidBlockHeight:
                payExpiryRef.current ?? expected.lastValidBlockHeight,
            },
            // Verificación manual acotada: `null` = sigue incierta.
            { intervalMs: 1_500, timeoutMs: 8_000 },
          )
        : Promise.resolve(null),
  });

  const buildSnapshot = (sig: string): PendingPayOp | null => {
    const expected = expectedRef.current;
    return plan && student && expected
      ? {
          operation: "pay_installment",
          student,
          planId: plan.id,
          signature: sig,
          expectedInstallmentIndex: expected.index,
          expectedOpenedAt: expected.openedAt,
          lastValidBlockHeight: payExpiryRef.current,
        }
      : null;
  };

  // Persistencia del pago en duda por wallet+plan (sessionStorage). Se
  // limpia solo con veredicto: éxito o `failed` onchain.
  useEffect(() => {
    if (!student || !plan || typeof window === "undefined") return;
    const s = window.sessionStorage;
    if ((flow.kind === "running" || flow.kind === "uncertain") && flow.signature) {
      if (flow.lastValidBlockHeight !== undefined) {
        payExpiryRef.current = flow.lastValidBlockHeight;
      }
      const op = buildSnapshot(flow.signature);
      if (op) savePendingPay(s, op);
    } else if (flow.kind === "success" || flow.kind === "failed_onchain") {
      clearPendingPay(s, student, plan.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, student, plan]);

  // Suscribir antes de restaurar: el cambio del runner también abre el
  // panel tras reload y congela el índice original en estado de React.
  useEffect(() => {
    return runner.subscribe(() => {
      if (runner.state().kind === "uncertain") {
        setOpen(true);
        setPaidIdx((i) => i ?? expectedRef.current?.index ?? null);
      }
    });
  }, [runner]);

  // Restaurar un pago pendiente de ESTA wallet+plan: vuelve como `uncertain`
  // para reconciliar la firma original — nunca como un envío nuevo.
  useEffect(() => {
    if (!student || !plan || flow.kind !== "idle" || typeof window === "undefined") {
      return;
    }
    const op = loadPendingPay(window.sessionStorage, student, plan.id);
    if (op) {
      expectedRef.current = {
        index: op.expectedInstallmentIndex,
        openedAt: op.expectedOpenedAt,
      };
      payExpiryRef.current = op.lastValidBlockHeight;
      runner.restore(
        buildRun(student, {
          index: op.expectedInstallmentIndex,
          openedAt: op.expectedOpenedAt,
          lastValidBlockHeight: op.lastValidBlockHeight,
        }),
        op.signature,
        op.lastValidBlockHeight,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, plan?.id, flow.kind, runner]);

  // Avisar al padre del veredicto (una vez por firma) + refrescar saldos.
  const notifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (flow.kind !== "success" || notifiedRef.current === flow.signature) {
      return;
    }
    notifiedRef.current = flow.signature;
    onPaid?.(flow.plan, flow.signature);
    if (student && plan) {
      void mutate(["cuotas", "plans", student]);
      void mutate(["account-balance", student]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, student, plan?.id]);

  const sign = () => {
    if (!student || !plan || !nextUp) return;
    expectedRef.current = { index: nextUp.index, openedAt: plan.openedAt };
    // Firma nueva: la altura vieja (de otra operación o de un restore
    // fallido) no se arrastra — el cliente emitirá la de ESTA propuesta.
    payExpiryRef.current = undefined;
    setPaidIdx(nextUp.index);
    // El runner ignora el arranque si hay una corrida viva o un `uncertain`:
    // doble clic y reintento a ciegas no producen otro pago. La cuota queda
    // congelada en el run: la reconciliación verifica ESTA operación, no
    // la primera impaga que haya cuando termine de verificar.
    runner.start(
      buildRun(student, { index: nextUp.index, openedAt: plan.openedAt }),
    );
  };

  const cta =
    plan && student && nextUp && flow.kind !== "success" ? (
      <Button
        onClick={() => setOpen(true)}
        data-testid="pay-installment-cta"
        disabled={flow.kind === "running"}
      >
        {t.cta(nextUp.index + 1, formatUsdc(due, locale))}
      </Button>
    ) : null;

  // El panel existe aunque ya no quede cuota impaga: un `uncertain` sobre la
  // última cuota (o un plan releído sin impagas) debe poder verificarse.
  const panel =
    open && plan && student && (nextUp !== null || flow.kind !== "idle") ? (
      <PayPanel
        plan={plan}
        student={student}
        titleIndex={paidIdx ?? nextUp?.index ?? 0}
        due={due}
        flow={flow}
        onClose={() => {
          // `uncertain` sigue en duda: cerrar NO lo resetea (un reenvío a
          // ciegas duplicaría el pago). Solo los demás estados vuelven a idle.
          if (flow.kind !== "uncertain") {
            runner.reset();
            setPaidIdx(null);
            expectedRef.current = null;
            payExpiryRef.current = undefined;
          }
          setOpen(false);
        }}
        onSign={sign}
        onVerify={() => runner.recheck()}
      />
    ) : null;

  return { cta, panel };
}

function PayPanel({
  plan,
  student,
  titleIndex,
  due,
  flow,
  onClose,
  onSign,
  onVerify,
}: {
  plan: Plan;
  student: WalletAddress;
  /** Índice congelado de la cuota pagada (la primera impaga avanza tras pagar). */
  titleIndex: number;
  /** Importe exacto a pagar (cuota + punitorio si hay). */
  due: Micro;
  flow: OpenFlowState;
  onClose: () => void;
  onSign: () => void;
  onVerify: () => void;
}) {
  const all = useT(checkout);
  const t = all.pay;
  const u = all.confirm.uncertain;
  const errs = all.confirm.errors;
  const d = useT(design);
  const { locale } = useLocale();
  const fmt = (m: Micro, dd = 2) => formatUsdc(m, locale, dd);
  const mock = getCuotas().mode === "mock";
  const busy = flow.kind === "running";
  const success = flow.kind === "success";
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [success]);

  // Saldo vivo tras el pago confirmado (se consulta, no se estima).
  const [balance, setBalance] = useState<Micro | null>(null);
  useEffect(() => {
    if (flow.kind !== "success") return;
    let live = true;
    getAccountCuotas()
      .getBalance(student)
      .then((b) => {
        if (live) setBalance(b.available);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [flow, student]);

  const remaining =
    flow.kind === "success" && flow.plan
      ? unpaidInstallments(flow.plan).length
      : null;

  return (
    <GlassPanel className={styles.panel} data-testid="pay-panel">
      <div className={styles.panelHead}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.panelTitle}>
          {flow.kind === "success" ? t.successTitle(titleIndex + 1) : t.title}
        </h2>
        {mock ? <ReferenceTag>{d.chrome.simulated}</ReferenceTag> : null}
      </div>

      {flow.kind === "running" ? (
        <TxProgressView
          phase={flow.phase}
          signature={flow.signature}
          copy={t.progress}
        />
      ) : flow.kind === "success" ? (
        <div className={styles.receiptRow}>
          {mock ? (
            <p className={styles.receipt}>
              {all.confirm.success.receipt(short(flow.signature))}
            </p>
          ) : (
            <ExplorerLink signature={flow.signature} />
          )}
        </div>
      ) : (
        <dl className={styles.rows}>
          <div className={`${styles.row} ${styles.rowFirst}`}>
            <dt className={styles.rowKey}>{t.rows.amount}</dt>
            <dd className={styles.rowVal} data-testid="pay-exact-amount">
              US$ {fmt(due, 6)}
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowKey}>{t.rows.dest}</dt>
            <dd className={styles.rowVal}>{t.rows.destValue}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowKey}>{t.rows.token}</dt>
            <dd className={styles.rowVal}>{t.rows.tokenValue}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowKey}>{t.rows.network}</dt>
            <dd className={styles.rowVal}>{t.rows.networkValue}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowKey}>{t.rows.wallet}</dt>
            <dd className={styles.rowVal}>
              <span className={styles.due}>{short(student)}</span>
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowKey}>{t.rows.plan}</dt>
            <dd className={styles.rowVal}>
              {t.rows.installment(titleIndex + 1)}{" "}
              <span className={styles.due}>{short(plan.id)}</span>
            </dd>
          </div>
        </dl>
      )}

      {flow.kind === "success" ? (
        <div className={styles.successFacts}>
          {remaining !== null ? <span>{t.remainingLabel(remaining)}</span> : null}
          {balance !== null ? (
            <span data-testid="pay-new-balance">
              {t.balanceLabel}: US$ {fmt(balance)}
            </span>
          ) : null}
        </div>
      ) : null}

      {flow.kind !== "running" && flow.kind !== "success" && mock ? (
        <p className={styles.previewNote}>{t.mockNote}</p>
      ) : null}
      {flow.kind === "idle" ? (
        <p className={styles.ctaHint}>{t.approvalNote}</p>
      ) : null}

      {flow.kind === "uncertain" ? (
        <div
          className={`${styles.blocked} ${styles.pending}`}
          role="alert"
          data-testid="tx-uncertain"
        >
          <p className={styles.blockedTitle}>{u.t}</p>
          <div className={styles.reason}>
            <StateMark state="lit" title={u.t} />
            <div>
              <p className={styles.reasonD}>{u.d}</p>
              {flow.signature ? (
                <p className={styles.reasonD}>
                  {u.sigLabel}: <ExplorerLink signature={flow.signature} />
                </p>
              ) : null}
              {flow.checked ? (
                <p className={styles.reasonNext}>{u.stillPending}</p>
              ) : null}
            </div>
          </div>
          <div className={styles.confirmCtas}>
            <Button variant="ghost" onClick={onClose}>
              {u.backCta}
            </Button>
            <Button onClick={onVerify}>{u.verifyCta}</Button>
          </div>
        </div>
      ) : null}

      {flow.kind === "failed_onchain" ? (
        <div className={styles.blocked} role="alert">
          <p className={styles.blockedTitle}>{t.errorTitle}</p>
          <div className={styles.reason}>
            <StateMark state="cracked" title={t.errorTitle} />
            <div>
              <p className={styles.reasonD}>{u.failedOnchain}</p>
              <p className={styles.reasonD}>
                <ExplorerLink signature={flow.signature} />
              </p>
            </div>
          </div>
          <div className={styles.confirmCtas}>
            <Button onClick={onClose}>{u.backCta}</Button>
          </div>
        </div>
      ) : null}

      {flow.kind === "failed" ? (
        <div className={styles.blocked} role="alert">
          <p className={styles.blockedTitle}>{t.errorTitle}</p>
          <div className={styles.reason}>
            <StateMark state="cracked" title={t.errorTitle} />
            <div>
              <p className={styles.reasonD}>
                {flow.error.code in errs
                  ? errs[flow.error.code as keyof typeof errs]
                  : errs.generic}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {flow.kind === "idle" || flow.kind === "failed" ? (
        <div className={styles.confirmCtas}>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            {t.back}
          </Button>
          <Button disabled={busy} onClick={onSign} aria-busy={busy}>
            {t.sign}
          </Button>
        </div>
      ) : null}

      {flow.kind === "success" ? (
        <div className={styles.confirmCtas}>
          <Button onClick={onClose}>{t.done}</Button>
        </div>
      ) : null}
    </GlassPanel>
  );
}
