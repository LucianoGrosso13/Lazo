"use client";

// Alta de fiador paso a paso: resumen de topes (config) → identidad (KYC
// simulado) → documento de fianza demo con hash → tarjeta de crédito de
// ejemplo → confirmar. El registro delega en completeGuarantor → base.
import { useMemo, useState } from "react";
import useSWR from "swr";
import { ReferenceTag } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel, GlassSlab } from "@/components/ui/glass";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { garanteCuenta } from "@/i18n/dictionaries/fiador-cuenta";
import { useLocale, useT } from "@/i18n/locale";
import {
  formatUsdc,
  getAccountCuotas,
  getCuotas,
  type Invitation,
  type Micro,
} from "@/lib/cuotas";
import { descargarMandato, hashMandato, textoMandato } from "./documento";

// Tarjetas de ejemplo del procesador sandbox — nunca se pide PAN/CVV.
const DEMO_CARDS = [
  { label: "Visa", pan: "•••• 4242" },
  { label: "Mastercard", pan: "•••• 5555" },
];

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

type Paso = 0 | 1 | 2 | 3 | 4;
const PASOS: Paso[] = [0, 1, 2, 3, 4];

export function AltaFiador({ invitation }: { invitation: Invitation }) {
  const t = useT(garanteCuenta);
  const { locale } = useLocale();
  const [paso, setPaso] = useState<Paso>(0);
  const reduceMotion = useReducedMotion();
  const [tope, setTope] = useState<Micro | null>(null);
  const [nombre, setNombre] = useState("");
  const [card, setCard] = useState(0);
  const [fase, setFase] = useState<"editar" | "registrando" | "error">("editar");
  const [errorMsg, setErrorMsg] = useState("");

  const configQ = useSWR("fiador-config", () => getAccountCuotas().getAccountConfig());

  // Topes de compra respaldables: techos de los escalones configurados, sin inventar.
  const topes = useMemo(() => {
    const c = configQ.data?.protocol;
    if (!c) return [];
    return [...new Set(c.guaranteedTiers.map((x) => x.maxPurchase))].sort((a, b) =>
      Number(a - b),
    );
  }, [configQ.data]);

  const topeElegido = tope ?? (topes.length ? topes[topes.length - 1] : null);

  // Cobertura exigida por la compra elegida según el escalón del estudiante.
  const quoteQ = useSWR(
    topeElegido != null ? ["fiador-quote", topeElegido, invitation.student] : null,
    ([, m, s]) => getCuotas().quote(m, s),
  );

  // Documento + hash: se generan una vez con los valores elegidos.
  const docQ = useSWR(
    nombre.trim() && topeElegido != null
      ? ["fiador-doc", invitation.student, nombre.trim(), topeElegido, locale]
      : null,
    async ([, student, name, maxPurchase, lang]) => {
      // Q1 pendiente: la fórmula del máximo de la fianza aún no existe, así
      // que el documento lo declara "pendiente de definición" y el alta no
      // puede aceptarse con un número inventado.
      const coverageMax = null;
      const texto = textoMandato({
        student,
        guarantorName: name,
        maxPurchase,
        coverageMax,
        issuedAt: Math.floor(Date.now() / 1000),
        locale: lang === "en" ? "en" : "es",
      });
      return { texto, hash: await hashMandato(texto), coverageMax };
    },
  );

  if (configQ.isLoading || !configQ.data) {
    return (
      <GlassPanel className="animate-pulse p-6" role="status" aria-busy="true">
        <div className="h-3 w-32 rounded bg-beam/10" />
        <div className="mt-4 h-6 w-64 rounded bg-beam/10" />
      </GlassPanel>
    );
  }

  const cfg = configQ.data.protocol;
  const fmt = (v: Micro) => `US$${formatUsdc(v, locale)}`;
  const puedeAvanzar =
    paso === 0
      ? topeElegido != null
      : paso === 1
        ? nombre.trim().length > 0
        : paso === 2
          ? docQ.data != null
          : true;

  const registrar = async () => {
    if (!docQ.data || topeElegido == null || docQ.data.coverageMax == null) return;
    setFase("registrando");
    setErrorMsg("");
    try {
      await getAccountCuotas().completeGuarantor(invitation.token, {
        maxPurchase: topeElegido,
        coverageMax: docQ.data.coverageMax,
        mandateHash: docQ.data.hash,
        display: {
          guarantorName: nombre.trim(),
          cardLabel: `${DEMO_CARDS[card].label} ${DEMO_CARDS[card].pan}`,
        },
      });
      // La invitación quedó completada: recargar para que la entrada muestre el panel.
      window.location.reload();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setFase("error");
    }
  };

  const etiquetas = [t.alta.steps.resumen, t.alta.steps.identidad, t.alta.steps.documento, t.alta.steps.tarjeta, t.alta.steps.confirmar];

  return (
    <GlassPanel data-testid="fiador-alta" className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{t.alta.title}</p>
          <p className="mt-1 max-w-prose text-sm text-ink-2">{t.alta.subtitle}</p>
        </div>
        <ReferenceTag>{t.common.simulatedTag}</ReferenceTag>
      </div>

      {/* Paso indicador — navegable por teclado con botones */}
      <ol className="mt-5 flex flex-wrap gap-2" aria-label={t.alta.title}>
        {PASOS.map((n) => (
          <li key={n}>
            <Chip on={n === paso || n < paso}>{etiquetas[n]}</Chip>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
        <motion.div key={paso} initial={{ opacity: 0.94 }} animate={{ opacity: 1 }} exit={{ opacity: 0.94 }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}>
        {paso === 0 && (
          <section aria-label={t.alta.steps.resumen}>
            <p className="font-medium text-ink">{t.alta.resumenTitle}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">
              {t.alta.resumenBody}
            </p>

            <fieldset className="mt-5">
              <legend className="text-xs uppercase tracking-wide text-ink-2">
                {t.alta.topeLabel}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {topes.map((m) => (
                  <label
                    key={String(m)}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-sm has-checked:border-beam has-checked:bg-beam/10 has-checked:text-beam"
                  >
                    <input
                      type="radio"
                      name="tope"
                      className="accent-cyan"
                      checked={topeElegido === m}
                      onChange={() => setTope(m)}
                    />
                    {t.alta.topeOption} {fmt(m)}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-2">{t.alta.topeHint}</p>
            </fieldset>

            <GlassSlab className="mt-5">
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-ink-2">{t.alta.coberturaTitle}</p>
                <ul className="mt-2 space-y-2 text-sm text-ink-2">
                  <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="max-w-prose">{t.alta.coberturaRequerida}</span>
                    <strong className="text-ink">
                      {quoteQ.data ? fmt(quoteQ.data.requiredCoverage) : "—"}
                    </strong>
                  </li>
                  <li className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="max-w-prose">{t.alta.coberturaMaxima}</span>
                    <strong className="text-ink-2">{t.alta.maxPending}</strong>
                  </li>
                </ul>
              </div>
            </GlassSlab>

            <GlassSlab className="mt-4">
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-ink-2">{t.alta.timelineTitle}</p>
                <dl className="mt-2 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
                  <div className="flex justify-between gap-2 sm:block">
                    <dt>{t.alta.timelineGrace}</dt>
                    <dd className="font-medium text-ink">{cfg.graceDays} {t.alta.dayN}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt>{t.alta.timelineNotice}</dt>
                    <dd className="font-medium text-ink">{t.alta.dayN} {cfg.guarantorNoticeDay}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt>{t.alta.timelineCharge}</dt>
                    <dd className="font-medium text-ink">{t.alta.dayN} {cfg.guarantorChargeDay}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt>{t.alta.timelinePenalty}</dt>
                    <dd className="font-medium text-ink">{(cfg.penaltyBps / 100).toFixed(1)}%</dd>
                  </div>
                </dl>
              </div>
            </GlassSlab>
          </section>
        )}

        {paso === 1 && (
          <section aria-label={t.alta.steps.identidad}>
            <p className="font-medium text-ink">{t.alta.kycTitle}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">
              {t.alta.kycSimulated}
            </p>
            <label className="mt-4 block max-w-md">
              <span className="text-sm text-ink-2">{t.alta.kycNameLabel}</span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={t.alta.kycNamePlaceholder}
                className="mt-1 w-full rounded-2xl border border-hairline bg-transparent px-4 py-2.5 text-ink placeholder:text-ink-2/50 focus:border-beam focus:outline-none"
                autoComplete="name"
              />
            </label>
          </section>
        )}

        {paso === 2 && (
          <section aria-label={t.alta.steps.documento}>
            <p className="font-medium text-ink">{t.alta.docTitle}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">
              {t.alta.docBody}
            </p>
            {docQ.data ? (
              <>
                <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-hairline bg-beam/5 p-4 font-mono text-xs text-ink-2">
                  {docQ.data.texto}
                </pre>
                <p className="mt-3 break-all font-mono text-xs text-ink-2">
                  {t.alta.docHashLabel}: <span className="text-ink">{docQ.data.hash}</span>
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const doc = docQ.data;
                      if (doc) descargarMandato(doc.texto);
                    }}
                    className={buttonClasses("secondary", "sm")}
                  >
                    {t.alta.docDownload}
                  </button>
                  <span className="text-xs text-ink-2">{t.alta.docSimulated}</span>
                </div>
              </>
            ) : (
              <div className="mt-4 h-40 animate-pulse rounded-2xl bg-beam/5" />
            )}
          </section>
        )}

        {paso === 3 && (
          <section aria-label={t.alta.steps.tarjeta}>
            <p className="font-medium text-ink">{t.alta.cardTitle}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">
              {t.alta.cardBody}
            </p>
            <fieldset className="mt-4">
              <legend className="sr-only">{t.alta.cardTitle}</legend>
              <div className="flex flex-wrap gap-2">
                {DEMO_CARDS.map((c, i) => (
                  <label
                    key={c.pan}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-sm has-checked:border-beam has-checked:bg-beam/10 has-checked:text-beam"
                  >
                    <input
                      type="radio"
                      name="card"
                      className="accent-cyan"
                      checked={card === i}
                      onChange={() => setCard(i)}
                    />
                    {t.alta.cardOptionLabel} · {c.label} {c.pan}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="mt-3 text-xs text-ink-2">{t.alta.cardSimulated}</p>
          </section>
        )}

        {paso === 4 && (
          <section aria-label={t.alta.steps.confirmar}>
            <p className="font-medium text-ink">{t.alta.confirmTitle}</p>
            <dl className="mt-4 grid gap-3 rounded-2xl border border-hairline p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-2">{t.alta.confirmStudent}</dt>
                <dd className="font-mono text-xs text-ink" title={invitation.student}>
                  {short(invitation.student)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.alta.confirmName}</dt>
                <dd className="text-ink">{nombre.trim()}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.alta.confirmTope}</dt>
                <dd className="text-ink">{topeElegido != null ? fmt(topeElegido) : "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.alta.confirmMax}</dt>
                <dd className="text-ink-2">
                  {docQ.data?.coverageMax != null
                    ? fmt(docQ.data.coverageMax)
                    : t.alta.maxPending}
                </dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.alta.confirmCard}</dt>
                <dd className="text-ink">{DEMO_CARDS[card].label} {DEMO_CARDS[card].pan}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.alta.confirmDoc}</dt>
                <dd className="break-all font-mono text-xs text-ink-2">
                  {docQ.data ? `${docQ.data.hash.slice(0, 16)}…` : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">
              {t.alta.confirmLegal}
            </p>
            <div
              role="status"
              data-testid="fiador-q1-bloqueado"
              className="mt-4 rounded-2xl border border-hairline bg-beam/5 p-4"
            >
              <p className="text-sm font-medium text-ink">{t.alta.q1Title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.alta.q1Body}</p>
            </div>
            {fase === "error" && (
              <p role="alert" className="mt-3 text-sm text-bad">
                {t.alta.confirmError} {errorMsg}
              </p>
            )}
          </section>
        )}
        </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={paso === 0}
          onClick={() => setPaso((paso - 1) as Paso)}
          className={`${buttonClasses("secondary", "sm")} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {t.alta.back}
        </button>
        {paso < 4 ? (
          <button
            type="button"
            disabled={!puedeAvanzar}
            onClick={() => setPaso((paso + 1) as Paso)}
            className={`${buttonClasses("primary", "md")} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {t.alta.next}
          </button>
        ) : (
          <button
            type="button"
            disabled={docQ.data?.coverageMax == null || fase === "registrando"}
            onClick={() => void registrar()}
            title={docQ.data?.coverageMax == null ? t.alta.q1Title : undefined}
            className={`${buttonClasses("primary", "md")} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {fase === "registrando" ? t.alta.confirmWorking : t.alta.confirmCta}
          </button>
        )}
      </div>
    </GlassPanel>
  );
}
