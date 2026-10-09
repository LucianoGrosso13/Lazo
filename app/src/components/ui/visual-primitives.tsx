"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useInView } from "./use-in-view";
import styles from "./visual-primitives.module.css";

export type ComparisonBar = {
  label: ReactNode;
  value: number;
  /** Preformatted value, including units; primitive never invents copy. */
  formattedValue: ReactNode;
  winner?: boolean;
  winnerLabel?: string;
  note?: ReactNode;
};
export type ComparisonBarsProps = { items: readonly ComparisonBar[]; label: string; maxValue?: number; className?: string };
/** Values share a zero baseline; explicit winner avoids assuming high/low is good. */
export function ComparisonBars({ items, label, maxValue, className = "" }: ComparisonBarsProps) {
  const { ref, entered } = useInView<HTMLOListElement>();
  const reduced = useReducedMotion();
  const max = Math.max(0, maxValue ?? 0, ...items.map(item => Number.isFinite(item.value) ? item.value : 0));
  return <ol ref={ref} aria-label={label} className={`${styles.bars} ${className}`}>
    {items.map((item, i) => <li key={i} className={styles.barRow} data-winner={item.winner || undefined}>
      <div className={styles.barHeading}><span>{item.label}</span><strong>{item.winner && <svg aria-hidden={!item.winnerLabel} aria-label={item.winnerLabel} role={item.winnerLabel ? "img" : undefined} viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 8 3 3 7-7" /></svg>}{item.formattedValue}</strong></div>
      <div className={styles.track} aria-hidden="true"><div className={styles.fill} data-entered={entered && !reduced || undefined} style={{ width: `${max > 0 ? Math.max(0, Number.isFinite(item.value) ? item.value : 0) / max * 100 : 0}%` }} /></div>
      {item.note && <div className={styles.note}>{item.note}</div>}
    </li>)}
  </ol>;
}

export type GaugeProps = { value: number; max?: number; label: string; valueLabel?: ReactNode; note?: ReactNode; className?: string };
export function Gauge({ value, max = 100, label, valueLabel, note, className = "" }: GaugeProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Math.min(safeMax, Math.max(0, Number.isFinite(value) ? value : 0));
  const { ref, entered } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const ratio = safeValue / safeMax;
  return <div ref={ref} className={`${styles.gauge} ${className}`}>
    <div className={styles.gaugeFace}>
      <svg viewBox="0 0 200 115" aria-hidden="true" className={styles.gaugeSvg}>
        <path d="M 15 100 A 85 85 0 0 1 185 100" pathLength="100" className={styles.gaugeTrack} />
        <path d="M 15 100 A 85 85 0 0 1 185 100" pathLength="100" className={styles.gaugeArc} data-entered={entered && !reduced || undefined} strokeDasharray={`${ratio * 100} 100`} />
      </svg>
      <strong className={styles.gaugeValue}>{valueLabel ?? `${Math.round(ratio * 100)}%`}</strong>
    </div>
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={safeMax} aria-valuenow={safeValue} aria-valuetext={typeof valueLabel === "string" ? valueLabel : undefined} className={styles.gaugeLabel}>{label}</div>
    {note && <p className={styles.note}>{note}</p>}
  </div>;
}

export type CollapsibleHistoryProps = {
  items: readonly ReactNode[];
  visibleCount?: number;
  label: string;
  /** Caller supplies translated label including total, e.g. Ver todas (8). */
  expandLabel: string;
  collapseLabel: string;
  empty?: ReactNode;
  className?: string;
};
export function CollapsibleHistory({ items, visibleCount = 3, label, expandLabel, collapseLabel, empty, className = "" }: CollapsibleHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const count = Math.max(0, Math.floor(visibleCount));
  return <div className={`${styles.history} ${className}`}>
    {items.length === 0 ? empty : <ol id={id} aria-label={label} className={styles.historyList}>
      {items.map((item, i) => <li key={i} hidden={!expanded && i >= count}>{item}</li>)}
    </ol>}
    {items.length > count && <button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>{expanded ? collapseLabel : expandLabel}<Chevron expanded={expanded} /></button>}
  </div>;
}

export type AnimatedStep = { title: ReactNode; body?: ReactNode };
export type AnimatedStepsProps = { steps: readonly AnimatedStep[]; label: string; className?: string };
/** Text only inside step buttons. Body is always visible; tap selects, focus/hover highlights. */
export function AnimatedSteps({ steps, label, className = "" }: AnimatedStepsProps) {
  const { ref, entered } = useInView<HTMLOListElement>();
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  return <ol ref={ref} aria-label={label} className={`${styles.steps} ${className}`} data-entered={entered && !reduced || undefined}>
    {steps.map((step, i) => <li key={i} style={{ "--step-delay": `${i * 120}ms` } as CSSProperties} data-selected={selected === i || undefined}>
      <button type="button" aria-pressed={selected === i} className={styles.stepButton} onClick={() => setSelected(selected === i ? null : i)}>
        <span aria-hidden="true" className={styles.stepNumber}>{i + 1}</span>
        <span className={styles.stepText}><strong>{step.title}</strong>{step.body && <span>{step.body}</span>}</span>
      </button>
    </li>)}
  </ol>;
}

export type AccordionItem = { q: ReactNode; a: ReactNode };
export type AccordionProps = { items: readonly AccordionItem[]; label: string; className?: string };
export function Accordion({ items, label, className = "" }: AccordionProps) {
  return <div role="group" aria-label={label} className={`${styles.accordion} ${className}`}>{items.map((item, i) => <AccordionRow key={i} item={item} />)}</div>;
}
function AccordionRow({ item }: { item: AccordionItem }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <div className={styles.accordionRow}>
    <button id={`${id}-button`} type="button" className={styles.accordionButton} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}><span>{item.q}</span><Chevron expanded={expanded} /></button>
    <div id={id} aria-labelledby={`${id}-button`} hidden={!expanded} className={styles.answer}>{item.a}</div>
  </div>;
}
function Chevron({ expanded }: { expanded: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" className={styles.chevron} data-expanded={expanded} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg>;
}
