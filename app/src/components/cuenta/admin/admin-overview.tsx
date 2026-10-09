"use client";

// Franja de resumen del panel admin: 4 KPIs, planes por estado y "Requiere
// atención". Todo sale del snapshot (pool, actividad) y de los planes que
// expone `@/lib/cuotas` para los compradores de esa actividad; sin métricas
// inventadas. Con 0 planes los KPIs valen 0 y el gráfico lo dice.
import Link from "next/link";
import { useMemo, type CSSProperties } from "react";
import { shortAddr } from "@/components/cuenta/consulta";
import { BigNumber } from "@/components/ui/count-up-number";
import { GlassPanel } from "@/components/ui/glass";
import { StateMark } from "@/components/ui/state-mark";
import { useInView } from "@/components/ui/use-in-view";
import { CollapsibleHistory } from "@/components/ui/visual-primitives";
import { adminCuenta } from "@/i18n/dictionaries/admin-cuenta";
import { useLocale, useT } from "@/i18n/locale";
import { formatUsdc, type AdminSnapshot } from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";
import {
  BUCKETS,
  summarizePlans,
  type PlanBucket,
} from "./overview-metrics";
import styles from "./admin-overview.module.css";

const MICRO = 1_000_000;

const BUCKET_COLOR: Record<PlanBucket, string> = {
  ok: "var(--color-green)",
  grace: "var(--color-backlight)",
  late: "var(--color-crack)",
  charged: "var(--color-violet)",
};

const sub = (s: string, vars: Record<string, string>) =>
  Object.entries(vars).reduce((a, [k, v]) => a.replaceAll(`{${k}}`, v), s);

export function AdminOverview({
  snapshot,
  daysAdvanced,
}: {
  snapshot: AdminSnapshot;
  /** Cambia con el reloj de la demo para volver a leer los estados. */
  daysAdvanced?: number;
}) {
  const t = useT(adminCuenta);
  const { locale } = useLocale();
  const { ref, entered } = useInView<HTMLDivElement>();
  const { pool, activity, pending } = snapshot;

  // Compradores que abrieron plan según la bitácora del snapshot.
  const students = useMemo(() => {
    const set = new Set<string>();
    for (const a of activity ?? []) {
      if (a.kind === "PlanOpened" && a.student) set.add(a.student);
    }
    return [...set].sort();
  }, [activity]);

  const plans = useCuotasQuery(
    ["admin-overview-plans", students.join(","), activity?.length ?? -1, daysAdvanced ?? 0],
    async (c) => (await Promise.all(students.map((s) => c.getPlans(s)))).flat(),
  );
  const m = useMemo(() => summarizePlans(plans.data ?? []), [plans.data]);
  const loading = plans.isLoading && students.length > 0;
  const total = BUCKETS.reduce((s, b) => s + m.buckets[b], 0);
  const moraPct = m.opened > 0 ? (m.delinquent / m.opened) * 100 : 0;

  const kpis: {
    key: string;
    role: "buyer" | "merchant" | "pool";
    late?: boolean;
    label: string;
    hint: string;
    value: React.ReactNode;
  }[] = [
    {
      key: "planes",
      role: "buyer",
      label: t.kpiPlanes,
      hint: t.kpiPlanesHint,
      value: <BigNumber amount={m.active * MICRO} currency="none" decimals={0} size="lg" />,
    },
    {
      key: "volumen",
      role: "merchant",
      label: t.kpiVolumen,
      hint: t.kpiVolumenHint,
      value: <BigNumber amount={m.financed} size="lg" decimals={0} />,
    },
    {
      key: "mora",
      role: "pool",
      late: m.delinquent > 0,
      label: t.kpiMora,
      hint:
        m.opened > 0
          ? sub(t.kpiMoraHint, { n: String(m.delinquent), total: String(m.opened) })
          : t.kpiMoraSin,
      value: (
        <BigNumber
          amount={Math.round(moraPct * MICRO)}
          currency="none"
          suffix="%"
          decimals={moraPct > 0 && moraPct < 10 ? 1 : 0}
          size="lg"
        />
      ),
    },
    {
      key: "liquidez",
      role: "pool",
      label: t.kpiLiquidez,
      hint: pool ? t.kpiLiquidezHint : t.kpiLiquidezSin,
      value: pool ? (
        <BigNumber amount={pool.available} size="lg" decimals={0} />
      ) : (
        <span className="font-num text-[2.25rem] leading-none text-ink-ghost">—</span>
      ),
    },
  ];

  const attention = m.attention.map((a) => (
    <div key={a.planId} data-testid="admin-atencion-item" className={styles.attnItem}>
      <div className={styles.attnMain}>
        <span className={styles.attnName}>
          <StateMark
            state={a.bucket === "late" ? "cracked" : "refilled"}
            title={a.bucket === "late" ? t.graficoEstado.late : t.graficoEstado.charged}
          />
          <span className="font-num">{a.planId}</span>
        </span>
        <span className={styles.attnMeta}>{shortAddr(a.student)}</span>
      </div>
      <div className={styles.attnSide}>
        <span className={styles.attnAmount}>
          US$ {formatUsdc(a.amount, locale)}
        </span>
        <span className={styles.attnKind}>
          {a.bucket === "late" ? t.atencionVencido : t.atencionCobrado}
        </span>
      </div>
    </div>
  ));
  const base = pending.map((p) => (
    <div key={`p-${p}`} className={styles.attnItem}>
      <span className={styles.attnName}>
        <StateMark state="dim" title={t.pendienteTag} />
        {t.atencionBaseTitle}: <span className="font-num">{p}</span>
      </span>
    </div>
  ));
  const items = [...attention, ...base];

  return (
    <section
      data-testid="admin-resumen"
      aria-label={t.resumenLabel}
      className={styles.strip}
    >
      <ul className={`${styles.kpis} m-0 list-none p-0`} data-testid="admin-kpis">
        {kpis.map((k, i) => (
          <li
            key={k.key}
            data-testid={`admin-kpi-${k.key}`}
            data-role={k.role}
            className={`${styles.kpi} ${k.late ? styles.kpiLate : ""}`}
            style={{ "--i": i } as CSSProperties}
          >
            <p className={styles.kpiLabel}>
              <span className={styles.kpiDot} aria-hidden="true" />
              {k.label}
            </p>
            <p className={styles.kpiValue}>{k.value}</p>
            <p className={styles.kpiHint}>{k.hint}</p>
          </li>
        ))}
      </ul>

      <div className={styles.panels} data-role="merchant">
        <GlassPanel data-testid="admin-estados" className={styles.panel}>
          <h2 className={styles.panelTitle}>{t.graficoTitle}</h2>
          {total === 0 ? (
            <p data-testid="admin-estados-vacio" className={styles.empty}>
              {loading ? "…" : t.graficoVacio}
            </p>
          ) : (
            <>
              <div
                ref={ref}
                role="img"
                aria-label={`${t.graficoLabel}: ${BUCKETS.map(
                  (b) => `${t.graficoEstado[b]} ${m.buckets[b]}`,
                ).join(", ")}`}
                className={styles.stack}
                data-entered={entered || undefined}
              >
                {BUCKETS.filter((b) => m.buckets[b] > 0).map((b, i) => (
                  <span
                    key={b}
                    className={styles.seg}
                    style={
                      {
                        flexGrow: m.buckets[b],
                        background: BUCKET_COLOR[b],
                        "--i": i,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
              <ul className={styles.rows}>
                {BUCKETS.map((b) => (
                  <li
                    key={b}
                    data-testid={`admin-estado-${b}`}
                    data-count={m.buckets[b]}
                    className={styles.row}
                  >
                    <span
                      aria-hidden="true"
                      className={styles.swatch}
                      style={{ background: BUCKET_COLOR[b] }}
                    />
                    <span className={styles.rowName}>{t.graficoEstado[b]}</span>
                    <span className={styles.rowCount}>{m.buckets[b]}</span>
                    <span className={styles.rowPct}>
                      {Math.round((m.buckets[b] / total) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </GlassPanel>

        <GlassPanel data-testid="admin-atencion" className={styles.panel}>
          <div className={styles.attn}>
            <h2 className={styles.panelTitle}>{t.atencionTitle}</h2>
            {items.length > 0 && (
              <span className={styles.attnCount}>{items.length}</span>
            )}
          </div>
          {items.length === 0 ? (
            <p className={styles.attnOk}>
              <StateMark state="lit" className="mt-0.5" />
              <span>{t.atencionVacio}</span>
            </p>
          ) : (
            <>
              <CollapsibleHistory
                items={items}
                label={t.atencionTitle}
                visibleCount={3}
                expandLabel={sub(t.atencionMasVisibles, { n: String(items.length) })}
                collapseLabel={t.atencionMenos}
                className="mt-3"
              />
              <Link href="#admin-mora" className={styles.attnLink}>
                {t.atencionVer}
              </Link>
            </>
          )}
        </GlassPanel>
      </div>
    </section>
  );
}
