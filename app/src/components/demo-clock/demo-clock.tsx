"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
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

const DEMO_CLOCK_EXPLAINED_KEY = "lazo:demo-clock:explained";

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

const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

const getStoredExplained = () => {
  try {
    return localStorage.getItem(DEMO_CLOCK_EXPLAINED_KEY) === "true";
  } catch {
    return false;
  }
};

const getStoredExplainedServer = () => true;

export interface DemoClockProps {
  /** Marca opcional para forzar la visualización del hito de tramos del comercio. */
  hasTranches?: boolean;
}

interface Milestone {
  id: "day0" | "due" | "grace" | "notice" | "penalty" | "charge" | "tranche";
  day: number;
  label: string;
  tooltip: string;
  pos: string;
  stamp?: string;
  isActive: boolean;
}

/**
 * Control flotante del reloj de demo (solo modo mock). Colapsado es una píldora
 * con el día; abierto muestra la regla de la mora con sellos en los hitos de la
 * config y la luz del atraso actual, más los atajos de tiempo y el reinicio.
 */
export function DemoClock({ hasTranches }: DemoClockProps = {}) {
  const t = useT(demoClock);
  const cuotas = getCuotas();
  const config = useProtocolConfig();
  const wallet = useWalletAddress();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const storedDismissed = useSyncExternalStore(
    subscribeStorage,
    getStoredExplained,
    getStoredExplainedServer,
  );
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localDismissed, setLocalDismissed] = useState(false);
  const [hoveredMarkId, setHoveredMarkId] = useState<string | null>(null);

  const explainedDismissed = storedDismissed || localDismissed;

  const dismissExplanation = () => {
    setLocalDismissed(true);
    try {
      localStorage.setItem(DEMO_CLOCK_EXPLAINED_KEY, "true");
      window.dispatchEvent(new Event("storage"));
    } catch {
      // Ignorar fallas de localStorage
    }
  };

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

  // Detección automática si existen tramos del comercio registrados
  const { data: detectedTranches } = useCuotasQuery(
    ["demo-clock-tranches", wallet ?? "-"],
    async (c) => {
      try {
        const [acts, plans] = await Promise.all([
          c.getActivity(),
          wallet ? c.getPlans(wallet) : Promise.resolve([]),
        ]);
        const hasPayoutAct = acts.some(
          (a) =>
            (a.kind as string) === "PayoutReleased" ||
            (a.kind as string) === "PayoutScheduled",
        );
        const hasPlanWithTranches = plans.some((p) => {
          const terms = p.terms as unknown as Record<string, unknown> | undefined;
          return (
            Array.isArray(terms?.payoutTranches) &&
            terms.payoutTranches.length > 0
          );
        });
        return hasPayoutAct || hasPlanWithTranches;
      } catch {
        return false;
      }
    },
  );

  const showTranches = Boolean(hasTranches ?? detectedTranches);

  const days = clock?.daysAdvanced ?? 0;
  const stage = useMemo(
    () => (late && config ? moraStage(late.days, config) : null),
    [late, config],
  );

  const dayStr = fmtDays(days);
  const chargeDay = config?.guarantorChargeDay ?? 15;
  const penaltyPct = `${(config?.penaltyBps ?? 500) / 100}%`;
  const trancheDay = config?.installmentIntervalDays ?? 30;
  const maxDay = showTranches ? Math.max(chargeDay, trancheDay) : chargeDay;

  const calcPos = useCallback(
    (d: number) => `${Math.min(100, Math.max(0, (d / maxDay) * 100))}%`,
    [maxDay],
  );

  const milestones: Milestone[] = useMemo(() => {
    if (!config) return [];
    const list: Milestone[] = [
      {
        id: "day0",
        day: 0,
        label: t.legend.day0,
        tooltip: t.tooltips.day0,
        pos: calcPos(0),
        stamp: "0",
        isActive: late?.days === 0,
      },
      {
        id: "due",
        day: 0,
        label: t.legend.due,
        tooltip: t.tooltips.due,
        pos: calcPos(0),
        isActive: late?.days === 0,
      },
      {
        id: "grace",
        day: 1,
        label: t.legend.grace(config.graceDays),
        tooltip: t.tooltips.grace(config.graceDays),
        pos: calcPos(1),
        stamp: "1",
        isActive: stage === "grace",
      },
      {
        id: "notice",
        day: config.guarantorNoticeDay,
        label: t.legend.notice(config.guarantorNoticeDay),
        tooltip: t.tooltips.notice(config.guarantorNoticeDay),
        pos: calcPos(config.guarantorNoticeDay),
        stamp: String(config.guarantorNoticeDay),
        isActive: stage === "notice",
      },
      {
        id: "penalty",
        day: config.graceDays + 1,
        label: t.legend.penalty(penaltyPct),
        tooltip: t.tooltips.penalty(config.graceDays + 1, penaltyPct),
        pos: calcPos(config.graceDays + 1),
        stamp: String(config.graceDays + 1),
        isActive: stage === "penalty",
      },
      {
        id: "charge",
        day: chargeDay,
        label: t.legend.charge(chargeDay),
        tooltip: t.tooltips.charge(chargeDay),
        pos: calcPos(chargeDay),
        stamp: String(chargeDay),
        isActive: stage === "charge",
      },
    ];

    if (showTranches) {
      list.push({
        id: "tranche",
        day: trancheDay,
        label: t.legend.tranche,
        tooltip: t.tooltips.tranche(trancheDay),
        pos: calcPos(trancheDay),
        stamp: String(trancheDay),
        isActive: days >= trancheDay,
      });
    }

    return list;
  }, [config, calcPos, chargeDay, penaltyPct, trancheDay, showTranches, days, late, stage, t]);

  const rulerTicks = useMemo(() => {
    // Ticks únicos en la regla: 0, 1, aviso, punitorio, cobro (y tramo si activo)
    const seen = new Set<number>();
    const ticks: { id: string; day: number; pos: string; label: string; tooltip: string }[] = [];
    for (const m of milestones) {
      if (!seen.has(m.day)) {
        seen.add(m.day);
        ticks.push({
          id: m.id,
          day: m.day,
          pos: m.pos,
          label: m.label,
          tooltip: m.tooltip,
        });
      }
    }
    return ticks.sort((a, b) => a.day - b.day);
  }, [milestones]);

  const rulerStamps = useMemo(() => {
    // Sellos numéricos debajo de la regla
    const seen = new Set<string>();
    const stamps: { day: number; stamp: string; pos: string }[] = [];
    for (const m of milestones) {
      if (m.stamp && !seen.has(m.stamp)) {
        seen.add(m.stamp);
        stamps.push({
          day: m.day,
          stamp: m.stamp,
          pos: m.pos,
        });
      }
    }
    return stamps.sort((a, b) => a.day - b.day);
  }, [milestones]);

  if (!mounted || cuotas.mode !== "mock" || !config) return null;

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

  const hoveredMilestone = milestones.find((m) => m.id === hoveredMarkId);
  const activeStageMilestone = milestones.find((m) => m.isActive);

  const activeTooltipText =
    hoveredMilestone?.tooltip ??
    activeStageMilestone?.tooltip ??
    t.tooltipHint;

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

          {!explainedDismissed && (
            <div
              className={styles.introCard}
              role="region"
              aria-label={t.explanationTitle}
            >
              <p className={styles.introText}>{t.explanation}</p>
              <button
                type="button"
                className={styles.introDismiss}
                aria-label={t.explanationDismiss}
                onClick={dismissExplanation}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 14 14"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
          )}

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
              <span
                aria-hidden
                className={styles.rulerGrace}
                style={{ "--grace-pos": calcPos(config.graceDays) } as CSSProperties}
              />
              {rulerTicks.map((tk) => {
                const isHovered = hoveredMarkId === tk.id;
                return (
                  <button
                    key={tk.id}
                    type="button"
                    className={styles.tick}
                    data-hit={!!late && late.days >= tk.day}
                    data-hovered={isHovered}
                    style={{ left: tk.pos }}
                    title={tk.tooltip}
                    aria-label={`${tk.label}: ${tk.tooltip}`}
                    onMouseEnter={() => setHoveredMarkId(tk.id)}
                    onMouseLeave={() => setHoveredMarkId(null)}
                    onFocus={() => setHoveredMarkId(tk.id)}
                    onBlur={() => setHoveredMarkId(null)}
                    onClick={() =>
                      setHoveredMarkId(hoveredMarkId === tk.id ? null : tk.id)
                    }
                  />
                );
              })}
              {stage && late && (
                <>
                  <span
                    aria-hidden
                    className={styles.beamFill}
                    data-stage={stage}
                    style={
                      {
                        "--pos": calcPos(Math.min(late.days, maxDay)),
                      } as CSSProperties
                    }
                  />
                  <span
                    aria-hidden
                    className={styles.beamHead}
                    data-stage={stage}
                    style={
                      {
                        "--pos": calcPos(Math.min(late.days, maxDay)),
                      } as CSSProperties
                    }
                  />
                </>
              )}
            </div>

            <div className={styles.stamps} aria-hidden>
              {rulerStamps.map((s) => (
                <button
                  key={s.day}
                  type="button"
                  tabIndex={-1}
                  className={styles.stamp}
                  data-hit={!!late && late.days >= s.day}
                  data-edge={
                    s.day === maxDay
                      ? "end"
                      : s.day === 0
                        ? "start"
                        : undefined
                  }
                  style={{ left: s.pos }}
                  onClick={() => {
                    const match = milestones.find((m) => m.day === s.day);
                    if (match) {
                      setHoveredMarkId(
                        hoveredMarkId === match.id ? null : match.id,
                      );
                    }
                  }}
                >
                  {s.stamp}
                </button>
              ))}
            </div>

            <div
              className={styles.tooltipRow}
              role="status"
              aria-live="polite"
            >
              <span className={styles.tooltipText}>{activeTooltipText}</span>
            </div>

            <ol className={styles.legend} aria-label={t.legendTitle}>
              {milestones.map((m) => {
                const isHovered = hoveredMarkId === m.id;
                const isLit = m.isActive || isHovered;
                return (
                  <li
                    key={m.id}
                    className={styles.legendItem}
                    data-on={isLit}
                    data-hovered={isHovered}
                    tabIndex={0}
                    role="button"
                    aria-label={`${m.label}: ${m.tooltip}`}
                    onMouseEnter={() => setHoveredMarkId(m.id)}
                    onMouseLeave={() => setHoveredMarkId(null)}
                    onFocus={() => setHoveredMarkId(m.id)}
                    onBlur={() => setHoveredMarkId(null)}
                    onClick={() =>
                      setHoveredMarkId(hoveredMarkId === m.id ? null : m.id)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setHoveredMarkId(
                          hoveredMarkId === m.id ? null : m.id,
                        );
                      }
                    }}
                  >
                    <span aria-hidden className={styles.legendDot} />
                    <span className={styles.legendLabel}>{m.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </GlassPanel>
      )}

      <ChipButton
        className={styles.toggle}
        aria-expanded={open}
        data-demo-clock-toggle
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

