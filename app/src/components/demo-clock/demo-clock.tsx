"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getCuotas, type ProtocolConfig } from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { useProtocolConfig } from "@/components/landing/use-config";
import { useWalletAddress } from "@/components/wallet-button";
import { demoClock } from "@/i18n/dictionaries/demo-clock";
import { useT } from "@/i18n/locale";
import { GlassPanel } from "@/components/ui/glass";
import { ChipButton } from "@/components/ui/chip";
import { buttonClasses } from "@/components/ui/button";
import { ReferenceTag } from "@/components/ui/badges";
import styles from "./demo-clock.module.css";

type MoraStage = "grace" | "notice" | "penalty" | "charge";

/** Actividades que delatan a un estudiante con mora, para encontrarlo sin wallet. */
const MORA_KINDS = new Set([
  "GuarantorNotified",
  "MarkedLate",
  "GuarantorCharged",
  "RecoveryRegistered",
]);

/** Atajos de tiempo que pide el diseño del demo day. */
const STEPS = [1, 5, 15] as const;

const fmtDays = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Tramo de la mora según los días de atraso y la config del protocolo. */
function moraStage(daysLate: number, cfg: ProtocolConfig): MoraStage {
  if (daysLate >= cfg.guarantorChargeDay) return "charge";
  if (daysLate > cfg.graceDays) return "penalty";
  if (daysLate >= cfg.guarantorNoticeDay) return "notice";
  return "grace";
}

const noopSubscribe = () => () => {};

/**
 * Control flotante del reloj de demo (solo modo mock). Colapsado es una píldora
 * con el día; abierto muestra la regla de la mora con sellos en los hitos de la
 * config y la luz del atraso actual, más los atajos de tiempo y el reinicio.
 */
export function DemoClock() {
  const t = useT(demoClock);
  const cuotas = getCuotas();
  const config = useProtocolConfig();
  const wallet = useWalletAddress();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Escape cierra el panel desde cualquier foco (el botón puede quedar
  // disabled durante una llamada y perder el foco).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setArmed(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const { data: clock } = useCuotasQuery(["clock"], (c) => c.getClock());

  // La cuota más atrasada del mundo demo: la del estudiante conectado, más la de
  // cualquier estudiante que ya tenga actividad de mora en la bitácora.
  const { data: late } = useCuotasQuery(
    ["demo-late", wallet ?? "-"],
    async (c) => {
      const [cfg, clk, acts] = await Promise.all([
        c.getConfig(),
        c.getClock(),
        c.getActivity(),
      ]);
      const students = new Set<string>();
      if (wallet) students.add(wallet);
      for (const a of acts)
        if (a.student && MORA_KINDS.has(a.kind)) students.add(a.student);
      let worst = 0;
      for (const student of students)
        for (const plan of await c.getPlans(student))
          for (const cuota of plan.installments) {
            if (cuota.status === "Paid" || cuota.status === "ChargedToGuarantor")
              continue;
            const days = Math.floor(
              (clk.now - cuota.dueAt) / cfg.secondsPerDay,
            );
            if (days > worst) worst = days;
          }
      return worst > 0 ? { days: worst } : null;
    },
  );

  const days = clock?.daysAdvanced ?? 0;
  const stage = useMemo(
    () => (late && config ? moraStage(late.days, config) : null),
    [late, config],
  );

  if (!mounted || cuotas.mode !== "mock" || !config) return null;

  const dayStr = fmtDays(days);
  const pos = (d: number) => `${(d / config.guarantorChargeDay) * 100}%`;
  const chargeDay = config.guarantorChargeDay;
  const stamps = [...new Set([
    1,
    config.guarantorNoticeDay,
    config.graceDays + 1,
    chargeDay,
  ])].sort((a, b) => a - b);

  const advance = async (n: number) => {
    setBusy(true);
    try {
      await cuotas.advanceDays(n);
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    setBusy(true);
    try {
      await cuotas.resetDemo();
    } finally {
      setBusy(false);
    }
  };
  const collapse = () => {
    setOpen(false);
    setArmed(false);
  };

  return (
    <div className={styles.wrap}>
      {open && (
        <GlassPanel id="demo-clock-panel" className={styles.panel}>
          <div className={styles.head}>
            <p className={styles.title}>
              {t.title} <ReferenceTag>{t.simulated}</ReferenceTag>
            </p>
            <button
              type="button"
              className={styles.chev}
              data-open="true"
              aria-expanded="true"
              aria-controls="demo-clock-panel"
              aria-label={t.collapse}
              onClick={collapse}
            >
              <svg
                aria-hidden
                viewBox="0 0 12 8"
                width="12"
                height="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1.5 1.5 6 6l4.5-4.5" />
              </svg>
            </button>
          </div>

          <p className={styles.dayRow} aria-live="polite">
            <span className={styles.dayNum}>
              {days > 0 ? `+${dayStr}` : "0"}
            </span>
            <span className={styles.dayCap}>{t.advancedCaption(dayStr)}</span>
          </p>

          <div className={styles.actions}>
            <div className={styles.advance} role="group" aria-label={t.advanceGroup}>
              {STEPS.map((n) => (
                <ChipButton
                  key={n}
                  disabled={busy}
                  aria-label={t.advance(n)}
                  onClick={() => void advance(n)}
                >
                  +{n}
                </ChipButton>
              ))}
            </div>
            <button
              type="button"
              className={buttonClasses("ghost", "sm")}
              disabled={busy}
              aria-live="polite"
              onClick={() => void reset()}
            >
              {armed ? t.resetConfirm : t.reset}
            </button>
          </div>

          <div className={styles.moraHead}>
            <p className={styles.moraTitle}>{t.moraTitle}</p>
            <p className={styles.moraState} data-late={!!stage} aria-live="polite">
              {stage && late
                ? `${t.daysLate(fmtDays(late.days))} · ${t.stages[stage]}`
                : t.noLate}
            </p>
          </div>

          <div className={styles.rulerWrap}>
            <div
              className={styles.ruler}
              role="img"
              aria-label={
                stage && late
                  ? t.rulerAria(fmtDays(late.days), t.stages[stage])
                  : t.noLate
              }
            >
              {stamps.map((d) => (
                <span
                  key={d}
                  aria-hidden
                  className={styles.tick}
                  data-hit={!!late && late.days >= d}
                  style={{ left: pos(d) }}
                />
              ))}
              {stage && late && (
                <>
                  <span
                    aria-hidden
                    className={styles.beamFill}
                    data-stage={stage}
                    style={{ "--pos": pos(Math.min(late.days, chargeDay)) } as CSSProperties}
                  />
                  <span
                    aria-hidden
                    className={styles.beamHead}
                    data-stage={stage}
                    style={{ "--pos": pos(Math.min(late.days, chargeDay)) } as CSSProperties}
                  />
                </>
              )}
            </div>
            <div className={styles.stamps} aria-hidden>
              {stamps.map((d) => (
                <span
                  key={d}
                  className={styles.stamp}
                  data-hit={!!late && late.days >= d}
                  data-edge={d === chargeDay ? "end" : undefined}
                  style={{ left: pos(d) }}
                >
                  {d}
                </span>
              ))}
            </div>
            <ol className={styles.legend}>
              <li data-on={stage === "grace"}>
                {t.stages.grace}
                <span className={styles.num}>{t.stageDay.grace(config.graceDays)}</span>
              </li>
              <li data-on={stage === "notice"}>
                {t.stages.notice}
                <span className={styles.num}>{t.stageDay.notice(config.guarantorNoticeDay)}</span>
              </li>
              <li data-on={stage === "penalty"}>
                {t.stages.penalty}
                <span className={styles.num}>{t.stageDay.penalty(config.graceDays + 1)}</span>
              </li>
              <li data-on={stage === "charge"}>
                {t.stages.charge}
                <span className={styles.num}>{t.stageDay.charge(chargeDay)}</span>
              </li>
            </ol>
          </div>
        </GlassPanel>
      )}

      <ChipButton
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={open ? "demo-clock-panel" : undefined}
        aria-label={open ? t.collapse : t.expand}
        onClick={() => (open ? collapse() : setOpen(true))}
      >
        <span aria-hidden className={styles.toggleDot} />
        {t.toggle(days > 0 ? `+${dayStr}` : "0")}
      </ChipButton>
    </div>
  );
}
