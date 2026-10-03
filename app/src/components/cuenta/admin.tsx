"use client";

// Panel de la autoridad del protocolo (/app/admin). Lee el snapshot por
// `getAccountCuotas().getAdminSnapshot(actor)`: la API ejecutora vuelve a
// verificar que el actor sea la autoridad — esta pantalla nunca concede rol.
// En real sin autoridad configurada la entrada falla cerrada y no hay reloj.
// Las mutaciones (estado, alta de comercio, reloj demo) pasan por revisión
// inline con confirmación explícita; cancelar no ejecuta nada. En mock todo
// lo "onchain" es simulado y se declara: jamás un link a Explorer de mentira.
import Link from "next/link";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { useAccount } from "@/components/cuenta/account-context";
import {
  ConsultaCargando,
  EstadoConsulta,
  fmtFecha,
  fmtPct01,
  shortAddr,
} from "@/components/cuenta/consulta";
import { EvidenceMark, ModeBadge } from "@/components/cuenta/evidencia";
import { BigNumber } from "@/components/ui/big-number";
import { Button } from "@/components/ui/button";
import { Chip, ChipButton } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass";
import { StateMark } from "@/components/ui/state-mark";
import { WalletButton } from "@/components/wallet-button";
import { adminCuenta } from "@/i18n/dictionaries/admin-cuenta";
import { useLocale, useT } from "@/i18n/locale";
import { useCuotasQuery } from "@/lib/use-cuotas";
import {
  AccountCuotasError,
  CuotasError,
  formatUsdc,
  getAccountCuotas,
  getCuotas,
  type Activity,
  type ActivityKind,
  type Pool,
  type ProtocolState,
  type TierParams,
  type WalletAddress,
} from "@/lib/cuotas";

type Dict = (typeof adminCuenta)["es"];

const STATES: ProtocolState[] = ["Normal", "Halted", "WithdrawsOnly"];

/** Kinds de la línea de mora dentro de la bitácora completa. */
const MORA_KINDS: ActivityKind[] = [
  "GuarantorNotified",
  "MarkedLate",
  "GuarantorCharged",
  "RecoveryRegistered",
  "TierDown",
];

const MARCA_MORA: Partial<Record<ActivityKind, "lit" | "cracked" | "refilled" | "etched">> = {
  GuarantorNotified: "lit",
  MarkedLate: "cracked",
  GuarantorCharged: "cracked",
  RecoveryRegistered: "refilled",
  TierDown: "cracked",
};

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** "{from}" → valor. Sustitución simple para las cadenas del diccionario. */
const put = (s: string, vars: Record<string, string>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), s);

/** Traduce el error de la API ejecutora a una declaración honesta. */
function errorDetalle(e: unknown, t: Dict): string {
  const code =
    e instanceof AccountCuotasError || e instanceof CuotasError ? e.code : undefined;
  switch (code) {
    case "not_implemented":
      return t.errorNotImplemented;
    case "unauthorized":
      return t.errorUnauthorized;
    case "demo_only":
      return t.errorDemoOnly;
    default:
      return t.errorUnavailable;
  }
}

/** Snapshot del admin con revalidación cuando la base avisa un cambio. */
function useAdminSnapshot(actor: WalletAddress) {
  const res = useSWR(
    ["admin-snapshot", actor],
    ([, a]: [string, WalletAddress]) => getAccountCuotas().getAdminSnapshot(a),
  );
  const { mutate } = res;
  useEffect(() => getAccountCuotas().subscribe(() => void mutate()), [mutate]);
  return res;
}

/* ------------------------------------------------------------------ */
/*  Entrada y gating por actor                                         */
/* ------------------------------------------------------------------ */

export function AdminPanel() {
  const t = useT(adminCuenta);
  const { mode, account, status, errorCode, refresh } = useAccount();

  if (status === "resolving") {
    return <ConsultaCargando />;
  }
  if (status === "error") {
    return (
      <EstadoConsulta
        testId="admin-error"
        tono="error"
        title={t.errorTitle}
        body={errorCode ? `${t.errorBody} (${errorCode})` : t.errorBody}
        onRetry={refresh}
        reintentar={t.reintentar}
      />
    );
  }
  if (status === "idle" || !account) {
    return (
      <GlassPanel data-testid="admin-sin-cuenta" className="p-6" role="status">
        <div className="flex items-start gap-3">
          <StateMark state="dim" className="mt-1" />
          <div className="min-w-0">
            <p className="font-medium text-ink">{t.sinCuentaTitle}</p>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-2">
              {t.sinCuentaBody}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <WalletButton />
              <Link href="/app" className="text-sm text-cyan underline">
                {t.sinCuentaIr}
              </Link>
            </div>
          </div>
        </div>
      </GlassPanel>
    );
  }
  if (account.role !== "admin") {
    return (
      <GlassPanel data-testid="admin-denied" className="p-6" role="alert">
        <div className="flex items-start gap-3">
          <StateMark state="cracked" className="mt-1" />
          <div className="min-w-0">
            <p className="font-medium text-crack">{t.deniedTitle}</p>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-2">
              {t.deniedBody}
            </p>
            <p className="mt-3 text-sm text-ink-3">
              {mode === "mock" ? t.deniedMockHint : t.deniedRealHint}
            </p>
          </div>
        </div>
      </GlassPanel>
    );
  }
  return <AdminDashboard actor={account.address} />;
}

/* ------------------------------------------------------------------ */
/*  Revisión inline: un acuerdo a la vez, cancelable                    */
/* ------------------------------------------------------------------ */

type RevisionId = "estado" | "comercio" | "reloj-avance" | "reloj-reset";

interface Revision {
  id: RevisionId;
  titulo: string;
  cuerpo: string;
  nota?: string;
  run: () => Promise<void>;
}

interface Resultado {
  id: RevisionId;
  ok: boolean;
  detalle: string;
}

function RevisionSlot({
  id,
  revision,
  resultado,
  ejecutando,
  onConfirm,
  onCancel,
  t,
  mode,
}: {
  id: RevisionId;
  revision: Revision | null;
  resultado: Resultado | null;
  ejecutando: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: Dict;
  mode: "mock" | "real";
}) {
  if (revision?.id === id) {
    return (
      <div
        data-testid="admin-revision"
        className="mt-4 rounded-xl border border-cyan/30 bg-cyan/[0.06] p-4"
      >
        <p className="font-medium text-beam">{revision.titulo}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{revision.cuerpo}</p>
        {revision.nota && (
          <p className="mt-2 text-sm leading-relaxed text-ink-3">{revision.nota}</p>
        )}
        {mode === "mock" && (
          <p className="mt-2 text-xs text-ink-ghost">{t.revisionMockNota}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            data-testid="admin-confirmar"
            disabled={ejecutando}
            onClick={onConfirm}
          >
            {ejecutando ? t.ejecutando : t.confirmar}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            data-testid="admin-cancelar"
            disabled={ejecutando}
            onClick={onCancel}
          >
            {t.cancelar}
          </Button>
        </div>
      </div>
    );
  }
  if (resultado?.id === id) {
    return (
      <div
        data-testid={resultado.ok ? "admin-resultado" : "admin-mutacion-error"}
        className="mt-4 flex items-start gap-3 rounded-xl border border-beam/10 bg-beam/[0.04] p-4"
        role="status"
      >
        <StateMark state={resultado.ok ? "etched" : "cracked"} className="mt-0.5" />
        <div className="min-w-0">
          <p className={`text-sm font-medium ${resultado.ok ? "text-ink" : "text-crack"}`}>
            {resultado.ok ? t.resultadoOk : t.resultadoError}
          </p>
          {!resultado.ok && (
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{resultado.detalle}</p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

function AdminDashboard({ actor }: { actor: WalletAddress }) {
  const t = useT(adminCuenta);
  const { locale } = useLocale();
  const { mode, resetDemo } = useAccount();
  const snapshot = useAdminSnapshot(actor);
  // El reloj solo existe en la demo: en real jamás se consulta ni se muestra.
  const clock = useCuotasQuery(mode === "mock" ? ["admin-clock"] : null, (c) =>
    c.getClock(),
  );

  const [revision, setRevision] = useState<Revision | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [estadoSel, setEstadoSel] = useState<ProtocolState | null>(null);
  const [comercioOwner, setComercioOwner] = useState("");
  const [comercioName, setComercioName] = useState("");
  const [comercioValid, setComercioValid] = useState<string | null>(null);

  const confirmar = async () => {
    if (!revision || ejecutando) return;
    setEjecutando(true);
    try {
      await revision.run();
      setResultado({ id: revision.id, ok: true, detalle: "" });
      setRevision(null);
    } catch (e) {
      setResultado({ id: revision.id, ok: false, detalle: errorDetalle(e, t) });
      setRevision(null);
    } finally {
      setEjecutando(false);
    }
  };
  const cancelar = () => {
    // Cancelar no ejecuta: el estado compartido queda exactamente igual.
    setRevision(null);
  };

  if (snapshot.error) {
    const code =
      snapshot.error instanceof AccountCuotasError ? snapshot.error.code : "unavailable";
    return (
      <div data-testid="admin-panel" className="space-y-6">
        <EstadoConsulta
          testId="admin-snapshot-error"
          tono={code === "unauthorized" ? "vacio" : "error"}
          title={code === "unauthorized" ? t.deniedTitle : t.errorTitle}
          body={errorDetalle(snapshot.error, t)}
          onRetry={() => void snapshot.mutate()}
          reintentar={t.reintentar}
        />
      </div>
    );
  }
  if (snapshot.isLoading || !snapshot.data) {
    return <ConsultaCargando />;
  }
  const s = snapshot.data;
  const cfg = s.config;
  const estadoElegido = estadoSel ?? cfg.state;

  const slot = (id: RevisionId) => (
    <RevisionSlot
      id={id}
      revision={revision}
      resultado={resultado}
      ejecutando={ejecutando}
      onConfirm={() => void confirmar()}
      onCancel={cancelar}
      t={t}
      mode={mode}
    />
  );

  return (
    <div data-testid="admin-panel" className="space-y-8">
      <header className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-beam">{t.titulo}</h1>
          <ModeBadge />
          {mode === "mock" && (
            <span className="ref-tag" title={t.datosSimuladosHint}>
              {t.datosSimulados}
            </span>
          )}
        </div>
        <p className="mt-3 text-ink-2">{t.subtitulo}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip on data-testid="admin-autoridad">
            {t.autoridad}:{" "}
            <span className="font-num normal-case">
              {shortAddr(s.authority.admin ?? actor)}
            </span>
            <span className="normal-case text-ink-ghost">
              ·{" "}
              {s.authority.source === "config" ? t.autoridadConfig : t.autoridadFixture}
            </span>
          </Chip>
          {s.authority.keeper && (
            <Chip>
              {t.keeperLabel}:{" "}
              <span className="font-num normal-case">{shortAddr(s.authority.keeper)}</span>
            </Chip>
          )}
          {s.pending.map((p) => (
            <Chip key={p} data-testid={`admin-pendiente-${p}`}>
              {p} · {t.pendienteTag}
            </Chip>
          ))}
        </div>
      </header>

      {/* Estado del protocolo: lectura + cambio con revisión */}
      <section data-testid="admin-estado" className="glass p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-lg font-semibold text-beam">{t.estadoTitle}</h2>
          <p data-testid="admin-estado-actual" className="flex items-center gap-2 text-sm">
            <StateMark
              state={cfg.state === "Normal" ? "lit" : cfg.state === "Halted" ? "cracked" : "dim"}
            />
            <span className="text-ink-3">{t.estadoActual}:</span>
            <span className="font-medium text-beam">{t.estado[cfg.state]}</span>
          </p>
        </div>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">
          {t.estadoHint[estadoElegido]}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div role="group" aria-label={t.estadoCambiar} className="segtrack">
            {STATES.map((st) => (
              <ChipButton
                key={st}
                data-testid={`admin-estado-op-${st.toLowerCase()}`}
                on={estadoElegido === st}
                onClick={() => setEstadoSel(st)}
              >
                {t.estado[st]}
              </ChipButton>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            data-testid="admin-estado-revisar"
            disabled={estadoElegido === cfg.state}
            onClick={() =>
              setRevision({
                id: "estado",
                titulo: t.estadoRevisionTitulo,
                cuerpo: put(t.estadoRevisionBody, {
                  from: t.estado[cfg.state],
                  to: t.estado[estadoElegido],
                }),
                nota: t.estadoRevisionNota,
                run: async () => {
                  await getAccountCuotas().adminSetState(actor, estadoElegido);
                },
              })
            }
          >
            {t.estadoCambiar}
          </Button>
        </div>
        {slot("estado")}
      </section>

      {/* Escalones y reglas: solo lectura desde la config */}
      <section data-testid="admin-escalones" className="glass p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-beam">{t.escalonesTitle}</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-3">
          {t.escalonesHint}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-beam/10 text-left font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
                <th className="py-2 pr-4 font-medium">{t.colEscalon}</th>
                <th className="py-2 pr-4 font-medium">{t.colAnticipo}</th>
                <th className="py-2 pr-4 font-medium">{t.colCobertura}</th>
                <th className="py-2 pr-4 font-medium">{t.colTope}</th>
                <th className="py-2 font-medium">{t.colInteres}</th>
              </tr>
            </thead>
            <tbody>
              {cfg.guaranteedTiers.map((tier: TierParams, i: number) => (
                <tr key={i} className="border-b border-beam/5 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-ink">
                    {put(t.escalonN, { n: String(i) })}
                  </td>
                  <td className="py-2.5 pr-4 font-num tabular-nums text-ink-2">
                    {fmtPct01(tier.downPaymentBps / 10_000, locale)}
                  </td>
                  <td className="py-2.5 pr-4 font-num tabular-nums text-ink-2">
                    {fmtPct01(tier.guarantorCoverageBps / 10_000, locale)}
                  </td>
                  <td className="py-2.5 pr-4 font-num tabular-nums text-ink-2">
                    {formatUsdc(tier.maxPurchase, locale)} devUSDC
                  </td>
                  <td className="py-2.5 font-num tabular-nums text-ink-2">
                    {fmtPct01(tier.interestBps / 10_000, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-ink">{t.sinFiadorTitle}</p>
          <p className="mt-0.5 text-xs text-ink-ghost">{t.sinFiadorHint}</p>
          <ul className="mt-2 space-y-1">
            {cfg.unguaranteedTiers.map((tier: TierParams, i: number) => (
              <li key={i} className="font-num text-sm tabular-nums text-ink-2">
                {put(t.escalonN, { n: String(i) })}: {fmtPct01(tier.downPaymentBps / 10_000, locale)}{" "}
                {t.colAnticipo.toLowerCase()} · {formatUsdc(tier.maxPurchase, locale)} devUSDC
              </li>
            ))}
          </ul>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-2 border-t border-beam/10 pt-4 text-sm sm:grid-cols-2">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">{t.reglaGracia}</dt>
            <dd className="font-num tabular-nums text-ink">{cfg.graceDays}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">{t.reglaAviso}</dt>
            <dd className="font-num tabular-nums text-ink">
              {put(t.diaN, { n: String(cfg.guarantorNoticeDay) })}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">{t.reglaPunitorio}</dt>
            <dd className="font-num tabular-nums text-ink">
              {fmtPct01(cfg.penaltyBps / 10_000, locale)} {t.sobreLaCuota}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">{t.reglaCargo}</dt>
            <dd className="font-num tabular-nums text-ink">
              {put(t.diaN, { n: String(cfg.guarantorChargeDay) })}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">{t.reglaCuotas}</dt>
            <dd className="font-num tabular-nums text-ink">{cfg.installmentsCount}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">{t.reglaComision}</dt>
            <dd className="font-num tabular-nums text-ink">
              {fmtPct01(cfg.feeBps / 10_000, locale)} {t.sobreLoFinanciado}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">{t.reglaMinimo}</dt>
            <dd className="font-num tabular-nums text-ink">
              {formatUsdc(cfg.minFinancedToCount, locale)} devUSDC
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">Mint</dt>
            <dd className="font-num text-ink">
              {shortAddr(cfg.usdcMint)} · {cfg.cluster}
            </dd>
          </div>
        </dl>
      </section>

      {/* Pool: NAV, tramos, utilización, crédito y movimientos */}
      <section data-testid="admin-pool" className="glass p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-beam">{t.poolTitle}</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-3">{t.poolHint}</p>
        {s.pool ? (
          <PoolBlock pool={s.pool} t={t} />
        ) : (
          <EstadoConsulta
            testId="admin-pool-pendiente"
            tono="pendiente"
            title={t.poolTitle}
            body={t.movimientosVacio}
            reintentar={t.reintentar}
          />
        )}
      </section>

      {/* Mora: línea del keeper según config + eventos reales del estado */}
      <section data-testid="admin-mora" className="glass p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-beam">{t.moraTitle}</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-3">{t.moraHint}</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <li className="rounded-xl border border-beam/10 bg-beam/[0.03] p-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <StateMark state="lit" /> {t.moraPasoGrace}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">
              {put(t.moraPasoGraceBody, { grace: String(cfg.graceDays) })}
            </p>
          </li>
          <li className="rounded-xl border border-beam/10 bg-beam/[0.03] p-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <StateMark state="lit" /> {t.moraPasoAviso}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">
              {put(t.moraPasoAvisoBody, { notice: String(cfg.guarantorNoticeDay) })}
            </p>
          </li>
          <li className="rounded-xl border border-beam/10 bg-beam/[0.03] p-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <StateMark state="cracked" /> {t.moraPasoPunitorio}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">
              {put(t.moraPasoPunitorioBody, {
                day: String(cfg.graceDays + 1),
                pct: fmtPct01(cfg.penaltyBps / 10_000, locale),
              })}
            </p>
          </li>
          <li className="rounded-xl border border-beam/10 bg-beam/[0.03] p-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <StateMark state="refilled" /> {t.moraPasoCargo}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">
              {put(t.moraPasoCargoBody, { charge: String(cfg.guarantorChargeDay) })}
            </p>
          </li>
        </ol>
        <h3 className="mt-5 font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
          {t.moraEventosTitle}
        </h3>
        <MoraEventos activity={s.activity} t={t} />
      </section>

      {/* Bitácora completa del keeper */}
      <section data-testid="admin-bitacora" className="glass p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-beam">{t.bitacoraTitle}</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-3">
          {t.bitacoraHint}
        </p>
        {s.activity === null ? (
          <EstadoConsulta
            testId="admin-bitacora-pendiente"
            tono="pendiente"
            title={t.bitacoraTitle}
            body={t.bitacoraVacia}
            reintentar={t.reintentar}
          />
        ) : s.activity.length === 0 ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-3">{t.bitacoraVacia}</p>
        ) : (
          <ul className="mt-4 divide-y divide-beam/8">
            {[...s.activity]
              .sort((a, b) => b.at - a.at)
              .map((a, i) => (
                <li
                  key={`${a.signature ?? a.kind}-${a.at}-${i}`}
                  className="py-3 first:pt-1 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className="flex items-center gap-2 text-sm text-ink">
                      <StateMark state={MARCA_MORA[a.kind] ?? "dim"} />
                      {t.actividad[a.kind]}
                    </span>
                    <span className="font-num text-xs tabular-nums text-ink-ghost">
                      {fmtFecha(a.at, locale)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-ink-3">
                    {a.student && (
                      <span className="font-num">{shortAddr(a.student)}</span>
                    )}
                    {a.planId && (
                      <span className="font-num">
                        {t.plan} {a.planId}
                      </span>
                    )}
                    {a.amount !== undefined && (
                      <span className="font-num tabular-nums">
                        {formatUsdc(a.amount, locale)} devUSDC
                      </span>
                    )}
                    <EvidenceMark
                      evidence={
                        a.signature
                          ? { kind: "signature", signature: a.signature }
                          : { kind: "none" }
                      }
                    />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* Comercios: lista + alta con revisión */}
      <section data-testid="admin-comercios" className="glass p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-beam">{t.comerciosTitle}</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-3">
          {t.comerciosHint}
        </p>
        {s.merchants.length === 0 ? (
          <p className="mt-3 text-sm text-ink-3">{t.comerciosVacio}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {s.merchants.map((m) => (
              <li
                key={m.owner}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
              >
                <span className="font-medium text-ink">{m.name ?? shortAddr(m.owner)}</span>
                <span className="font-num text-xs text-ink-ghost">{shortAddr(m.owner)}</span>
                {m.active && <Chip on>{t.comercioActivo}</Chip>}
                {m.source === "demo-fixture" && (
                  <span className="ref-tag">{t.comercioFixture}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-5 space-y-3 border-t border-beam/10 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const owner = comercioOwner.trim();
            const name = comercioName.trim();
            if (!B58.test(owner)) {
              setComercioValid(t.comercioInvalido);
              return;
            }
            if (!name) {
              setComercioValid(t.comercioFaltaNombre);
              return;
            }
            setComercioValid(null);
            setRevision({
              id: "comercio",
              titulo: t.comercioRevisionTitulo,
              cuerpo: put(t.comercioRevisionBody, {
                owner: shortAddr(owner),
                name,
              }),
              run: async () => {
                await getAccountCuotas().adminRegisterMerchant(actor, { owner, name });
              },
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
            <label className="block">
              <span className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
                {t.comercioOwner}
              </span>
              <input
                value={comercioOwner}
                onChange={(e) => setComercioOwner(e.target.value)}
                data-testid="admin-comercio-owner"
                placeholder={t.comercioOwnerPlaceholder}
                spellCheck={false}
                autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-beam/15 bg-abyss-2/60 px-3 py-2 font-num text-sm text-ink placeholder:text-ink-ghost focus-visible:outline-2 focus-visible:outline-cyan"
              />
            </label>
            <label className="block">
              <span className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
                {t.comercioNombre}
              </span>
              <input
                value={comercioName}
                onChange={(e) => setComercioName(e.target.value)}
                data-testid="admin-comercio-name"
                placeholder={t.comercioNombrePlaceholder}
                autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-beam/15 bg-abyss-2/60 px-3 py-2 text-sm text-ink placeholder:text-ink-ghost focus-visible:outline-2 focus-visible:outline-cyan"
              />
            </label>
          </div>
          {comercioValid && (
            <p data-testid="admin-comercio-validacion" className="text-sm text-crack" role="alert">
              {comercioValid}
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            data-testid="admin-comercio-registrar"
            type="submit"
          >
            {t.comercioRegistrar}
          </Button>
        </form>
        {slot("comercio")}
      </section>

      {/* Reloj de la demo: solo mock admin, nunca en real */}
      {mode === "mock" && (
        <section data-testid="admin-reloj" className="glass p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-beam">{t.relojTitle}</h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-3">
            {t.relojHint}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <p data-testid="admin-reloj-dia" className="text-sm text-ink">
              {clock.data
                ? put(t.relojDia, { n: String(clock.data.daysAdvanced) })
                : "…"}
            </p>
            {clock.data && (
              <p className="font-num text-xs tabular-nums text-ink-3">
                {t.relojFecha}: {fmtFecha(clock.data.now, locale)}
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ChipButton
              data-testid="admin-reloj-avanzar-1"
              onClick={() =>
                setRevision({
                  id: "reloj-avance",
                  titulo: t.relojRevisionTitulo,
                  cuerpo: put(t.relojRevisionBody, {
                    n: "1",
                    from: String(clock.data?.daysAdvanced ?? 0),
                    to: String((clock.data?.daysAdvanced ?? 0) + 1),
                  }),
                  run: async () => {
                    await getCuotas().advanceDays(1);
                  },
                })
              }
            >
              {t.relojAvanzar1}
            </ChipButton>
            {[7, 15].map((n) => (
              <ChipButton
                key={n}
                data-testid={`admin-reloj-avanzar-${n}`}
                onClick={() =>
                  setRevision({
                    id: "reloj-avance",
                    titulo: t.relojRevisionTitulo,
                    cuerpo: put(t.relojRevisionBody, {
                      n: String(n),
                      from: String(clock.data?.daysAdvanced ?? 0),
                      to: String((clock.data?.daysAdvanced ?? 0) + n),
                    }),
                    run: async () => {
                      await getCuotas().advanceDays(n);
                    },
                  })
                }
              >
                {put(t.relojAvanzar, { n: String(n) })}
              </ChipButton>
            ))}
            <Button
              variant="ghost"
              size="sm"
              data-testid="admin-reloj-reset"
              onClick={() =>
                setRevision({
                  id: "reloj-reset",
                  titulo: t.relojResetRevisionTitulo,
                  cuerpo: t.relojResetRevisionBody,
                  nota: t.relojResetNota,
                  run: resetDemo,
                })
              }
            >
              {t.relojReset}
            </Button>
          </div>
          {slot("reloj-avance")}
          {slot("reloj-reset")}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bloques internos                                                   */
/* ------------------------------------------------------------------ */

const SIGNO_EVENTO = { Deposit: "+", Advance: "−", Repayment: "+", Recovery: "+", Loss: "−" } as const;

function PoolBlock({ pool, t }: { pool: Pool; t: Dict }) {
  const { locale } = useLocale();
  const capital = pool.juniorCapital + pool.seniorCapital;
  const uso = capital > 0 ? pool.outstandingCredit / capital : 0;
  const eventos = [...pool.events].sort((a, b) => b.at - a.at);
  return (
    <div className="mt-4 space-y-5">
      <div>
        <p className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
          {t.nav}
        </p>
        <p data-testid="admin-pool-nav" className="mt-1">
          <BigNumber amount={pool.nav} currency="none" size="lg" />
          <span className="ml-2 text-sm text-ink-3">devUSDC</span>
        </p>
        <p className="mt-1 text-xs text-ink-ghost">{t.navHint}</p>
      </div>
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {(
          [
            [t.capitalTotal, formatUsdc(capital, locale)],
            [`${t.tramoJunior} / ${t.tramoSenior}`, `${formatUsdc(pool.juniorCapital, locale)} / ${formatUsdc(pool.seniorCapital, locale)}`],
            [t.utilizacion, fmtPct01(uso, locale)],
            [t.credito, formatUsdc(pool.outstandingCredit, locale)],
            [t.disponible, formatUsdc(pool.available, locale)],
            [t.comisiones, formatUsdc(pool.accruedFees, locale)],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">{k}</dt>
            <dd className="font-num tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
          {t.movimientosTitle}
        </h3>
        {eventos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-3">{t.movimientosVacio}</p>
        ) : (
          <ul data-testid="admin-pool-eventos" className="mt-3 divide-y divide-beam/8">
            {eventos.map((e, i) => (
              <li key={`${e.signature}-${i}`} className="py-3 first:pt-1 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <StateMark
                      state={e.kind === "Recovery" ? "refilled" : e.kind === "Loss" ? "cracked" : "etched"}
                    />
                    {t.poolEvento[e.kind]}
                    {e.tranche && <span className="ref-tag">{e.tranche}</span>}
                  </span>
                  <span className="font-num text-sm tabular-nums text-ink-2">
                    {SIGNO_EVENTO[e.kind]}
                    {formatUsdc(e.amount, locale)} devUSDC
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-ink-3">
                  <span>{fmtFecha(e.at, locale)}</span>
                  {e.planId && (
                    <span className="font-num">
                      {t.plan} {e.planId}
                    </span>
                  )}
                  <EvidenceMark evidence={{ kind: "signature", signature: e.signature }} />
                  {e.receiptHash && (
                    <EvidenceMark evidence={{ kind: "receipt", hash: e.receiptHash }} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Eventos de mora: aviso, punitorio, 1er/2do cargo al fiador, recupero, baja. */
function MoraEventos({ activity, t }: { activity: Activity[] | null; t: Dict }) {
  const { locale } = useLocale();
  if (activity === null) {
    return (
      <EstadoConsulta
        testId="admin-mora-pendiente"
        tono="pendiente"
        title={t.moraEventosTitle}
        body={t.moraVacio}
        reintentar={t.reintentar}
      />
    );
  }
  const eventos = activity.filter((a) => MORA_KINDS.includes(a.kind));
  if (eventos.length === 0) {
    return (
      <p data-testid="admin-mora-vacio" className="mt-3 text-sm leading-relaxed text-ink-3">
        {t.moraVacio}
      </p>
    );
  }
  // El cargo N de un plan distingue el primer cobro del segundo, que acelera
  // todo el saldo (regla del keeper del mock de A).
  const cargosPorPlan = new Map<string, number>();
  return (
    <ul data-testid="admin-mora-eventos" className="mt-3 divide-y divide-beam/8">
      {eventos.map((a, i) => {
        let label = t.actividad[a.kind];
        if (a.kind === "GuarantorCharged" && a.planId) {
          const n = (cargosPorPlan.get(a.planId) ?? 0) + 1;
          cargosPorPlan.set(a.planId, n);
          label = n === 1 ? t.moraCargoN.primero : t.moraCargoN.segundo;
        }
        return (
          <li key={`${a.signature ?? a.kind}-${a.at}-${i}`} className="py-3 first:pt-1 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="flex items-center gap-2 text-sm text-ink">
                <StateMark state={MARCA_MORA[a.kind] ?? "dim"} />
                {label}
              </span>
              <span className="font-num text-xs tabular-nums text-ink-ghost">
                {fmtFecha(a.at, locale)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-ink-3">
              {a.student && <span className="font-num">{shortAddr(a.student)}</span>}
              {a.planId && (
                <span className="font-num">
                  {t.plan} {a.planId}
                </span>
              )}
              {a.amount !== undefined && (
                <span className="font-num tabular-nums">
                  {formatUsdc(a.amount, locale)} devUSDC
                </span>
              )}
              <EvidenceMark
                evidence={
                  a.signature ? { kind: "signature", signature: a.signature } : { kind: "none" }
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
