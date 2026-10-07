"use client";

// Real guarantor flow (server HMAC tokens, "v1.…"): invite resolution,
// Didit hosted KYC, Mobbex hosted card entry, and the server-canonical
// surety acceptance. Chain reads (tiers, quotes) go through the shared
// CuotasClient; everything off-chain goes through /api/fiador/*.
// No card numbers are ever typed here: KYC and card entry happen on
// provider-hosted pages opened in a new tab.
import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ExplorerLink, ReferenceTag } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel, GlassSlab } from "@/components/ui/glass";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { garanteCuenta } from "@/i18n/dictionaries/fiador-cuenta";
import { tierLabel } from "@/i18n/dictionaries/tiers";
import { defineDict, useLocale, useT } from "@/i18n/locale";
import { formatUsdc, getAccountCuotas, type Micro } from "@/lib/cuotas";
import { fmtPct } from "../consulta";
import { descargarMandato, hashMandato, textoMandato } from "./documento";

const tReal = defineDict({
  es: {
    expiredTitle: "Este enlace venció",
    expiredBody: "Las invitaciones duran 72 horas. Pedile al estudiante que te mande un enlace nuevo.",
    backToEntry: "Ir a la entrada",
    loadingInvite: "Abriendo la invitación…",
    altaTitle: "Alta de garante",
    altaSubtitle: "Verificás tu identidad y tu tarjeta en páginas externas (Didit y Mobbex, sandbox). Acá nunca escribís documentos ni números de tarjeta.",
    requiredCoverage: "Cobertura exigida por compra",
    coveragePctLabel: "Cobertura sobre el capital pendiente",
    coverageScope: "La fianza cubre el 100% de lo que falta pagar del plan (capital + interés); el punitorio por mora queda afuera.",
    acceptedCap: "Máximo de la fianza (calculado por el protocolo)",
    capTier: "Tier del estudiante",
    capPolicy: "Fórmula aplicada",
    policyPendingTitle: "Falta definir la fórmula del máximo",
    policyPendingBody: "El equipo todavía no eligió entre las dos fórmulas candidatas para el máximo de la fianza. Sin esa decisión no se puede seguir.",
    quotePendingTitle: "No se pudo cotizar",
    quotePendingBody: "La cotización se calcula en el servidor con la configuración del protocolo. Probá de nuevo en un momento.",
    steps: { resumen: "Resumen", identidad: "Identidad", documento: "Documento", tarjeta: "Tarjeta", confirmar: "Confirmar" },
    next: "Continuar",
    back: "Volver",
    topeLabel: "Tope de compras que respaldás",
    topeOption: "Compras de hasta",
    kycTitle: "Verificación de identidad con Didit",
    kycBody: "Se abre la página de Didit en otra pestaña. Cuando termines, esta pantalla detecta el resultado sola.",
    kycNameLabel: "Tu nombre como aparecería en la fianza",
    kycStart: "Verificar identidad con Didit",
    kycOpen: "Abrir Didit",
    kycWaiting: "Esperando el resultado de Didit…",
    kycApproved: "Identidad verificada",
    kycNotApproved: "Didit todavía no aprobó esta verificación.",
    kycMissing: "El proveedor de identidad no está configurado en este despliegue. Sin KYC real no se puede seguir.",
    docTitle: "Documento de fianza (vista previa)",
    docBody: "El texto final se genera en el servidor al aceptar y su hash es el que se registra. Podés descargarlo después.",
    cardTitle: "Tarjeta de crédito (Mobbex sandbox)",
    cardBody: "Se abre la página de Mobbex en otra pestaña para registrar tu tarjeta de prueba. Acá nunca escribís el número.",
    cardStart: "Registrar tarjeta con Mobbex",
    cardOpen: "Abrir Mobbex",
    cardWaiting: "Esperando la tarjeta en Mobbex…",
    cardLinked: "Tarjeta registrada",
    cardMissing: "El procesador de pagos no está configurado en este despliegue. Sin tarjeta registrada no se puede seguir.",
    reviewTitle: "Revisá y aceptá",
    reviewCheck: "Acepto respaldar al estudiante con el máximo indicado. Solo pago si él no paga.",
    reviewCta: "Aceptar la fianza",
    reviewWorking: "Aceptando…",
    reviewError: "No se pudo aceptar la fianza. Probá de nuevo.",
    acceptedTitle: "Fianza aceptada",
    acceptedBody: "El hash del documento quedó guardado en el servidor. Falta el registro onchain, que firma el keeper.",
    proposalTitle: "Propuesta de registro onchain (borrador, sin firmar)",
    verifyLabel: "Registro onchain (paso del equipo, no del garante)",
    verifyHint: "El operador registra con el keeper CLI y pega acá la firma. El servidor la verifica en la cadena antes de marcarla.",
    verifySig: "Firma de la transacción",
    verifyCta: "Verificar firma en devnet",
    verifyWorking: "Verificando…",
    registeredTitle: "Fianza registrada onchain",
    pendingClient: "Nada se firmó ni se envió todavía. La propuesta queda guardada.",
    panelTitle: "Tu respaldo",
    panelSubtitle: "Seguimiento de la fianza que aceptaste por este enlace.",
    sameLink: "Este mismo enlace te trae de vuelta acá, sin wallet.",
    docHash: "Hash del documento (SHA-256)",
    registeredOn: "Registrada onchain",
    pendingOnchain: "Pendiente de registro onchain",
    retry: "Reintentar",
    sandboxTag: "sandbox",
  },
  en: {
    expiredTitle: "This link expired",
    expiredBody: "Invitations last 72 hours. Ask the student to send you a new link.",
    backToEntry: "Go to the entry",
    loadingInvite: "Opening the invitation…",
    altaTitle: "Guarantor signup",
    altaSubtitle: "You verify your identity and card on external pages (Didit and Mobbex, sandbox). You never type documents or card numbers here.",
    requiredCoverage: "Coverage required per purchase",
    coveragePctLabel: "Coverage of outstanding principal",
    coverageScope: "The guarantee covers 100% of the remaining plan balance (principal + interest); late fees are excluded.",
    acceptedCap: "Guarantee maximum (computed by the protocol)",
    capTier: "Student Tier",
    capPolicy: "Formula applied",
    policyPendingTitle: "The maximum formula is still undecided",
    policyPendingBody: "The team has not chosen between the two candidate formulas for the guarantee maximum. This cannot continue without that decision.",
    quotePendingTitle: "Could not quote",
    quotePendingBody: "The quote is computed server-side from the protocol config. Try again in a moment.",
    steps: { resumen: "Summary", identidad: "Identity", documento: "Document", tarjeta: "Card", confirmar: "Confirm" },
    next: "Continue",
    back: "Back",
    topeLabel: "Purchase cap you're backing",
    topeOption: "Purchases up to",
    kycTitle: "Identity verification with Didit",
    kycBody: "Didit's page opens in another tab. When you finish, this screen picks up the result on its own.",
    kycNameLabel: "Your name as it would appear on the guarantee",
    kycStart: "Verify identity with Didit",
    kycOpen: "Open Didit",
    kycWaiting: "Waiting for Didit's result…",
    kycApproved: "Identity verified",
    kycNotApproved: "Didit has not approved this verification yet.",
    kycMissing: "The identity provider is not configured in this deployment. Without real KYC this cannot continue.",
    docTitle: "Guarantee document (preview)",
    docBody: "The final text is generated server-side when you accept, and its hash is what gets registered. You can download it afterwards.",
    cardTitle: "Credit card (Mobbex sandbox)",
    cardBody: "Mobbex's page opens in another tab to register your test card. You never type the number here.",
    cardStart: "Register card with Mobbex",
    cardOpen: "Open Mobbex",
    cardWaiting: "Waiting for the card on Mobbex…",
    cardLinked: "Card registered",
    cardMissing: "The payment processor is not configured in this deployment. Without a registered card this cannot continue.",
    reviewTitle: "Review and accept",
    reviewCheck: "I accept backing the student with the stated maximum. I only pay if they don't.",
    reviewCta: "Accept the guarantee",
    reviewWorking: "Accepting…",
    reviewError: "The guarantee could not be accepted. Try again.",
    acceptedTitle: "Guarantee accepted",
    acceptedBody: "The document hash is stored server-side. The on-chain registration, signed by the keeper, is still pending.",
    proposalTitle: "On-chain registration proposal (draft, unsigned)",
    verifyLabel: "On-chain registration (team step, not the guarantor's)",
    verifyHint: "The operator registers with the keeper CLI and pastes the signature here. The server verifies it on-chain before marking it.",
    verifySig: "Transaction signature",
    verifyCta: "Verify signature on devnet",
    verifyWorking: "Verifying…",
    registeredTitle: "Guarantee registered on-chain",
    pendingClient: "Nothing was signed or sent yet. The proposal is saved.",
    panelTitle: "Your backing",
    panelSubtitle: "Tracking the guarantee you accepted through this link.",
    sameLink: "This same link brings you back here, no wallet needed.",
    docHash: "Document hash (SHA-256)",
    registeredOn: "Registered on-chain",
    pendingOnchain: "Pending on-chain registration",
    retry: "Try again",
    sandboxTag: "sandbox",
  },
});

// --- API client ---------------------------------------------------------------

class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code =
      body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : "request_failed";
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : code;
    throw new ApiError(code, res.status, message);
  }
  return body as T;
}

const apiGet = <T,>(url: string): Promise<T> => apiFetch<T>(url);
const apiPost = <T,>(url: string, payload: unknown): Promise<T> =>
  apiFetch<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

interface InviteStatus {
  student: string;
  issuedAt: number;
  expiresAt: number;
  completed: boolean;
  acceptance: {
    id: string;
    maxPurchase: Micro;
    coverageMax: Micro;
    requiredCoverage: Micro;
    mandateHash: string;
    guarantorName: string;
    cardLabel: string | null;
    acceptedAt: number;
    registeredSignature: string | null;
  } | null;
}

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const codeOf = (e: unknown): string | null => (e instanceof ApiError ? e.code : null);

function Estado({ testId, title, body, alert, children }: {
  testId: string;
  title: string;
  body: string;
  alert?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <GlassPanel data-testid={testId} className="p-6" role={alert ? "alert" : "status"}>
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{body}</p>
      {children}
    </GlassPanel>
  );
}

// --- Entry --------------------------------------------------------------------

export function RealFiadorEntry({ token }: { token: string }) {
  const t = useT(garanteCuenta);
  const l = useT(tReal);
  const query = useSWR(["real-invitation", token], () =>
    apiGet<InviteStatus>(`/api/fiador/invitaciones/${encodeURIComponent(token)}`),
  );

  if (query.isLoading || (query.data === undefined && !query.error)) {
    return (
      <GlassPanel className="animate-pulse p-6" role="status" aria-busy="true">
        <div className="h-3 w-32 rounded bg-beam/10" />
        <p className="mt-4 text-sm text-ink-2">{l.loadingInvite}</p>
      </GlassPanel>
    );
  }

  if (query.error) {
    const code = codeOf(query.error);
    if (code === "invalid_token" || code === "expired_token") {
      const expired = code === "expired_token";
      return (
        <Estado
          testId={expired ? "fiador-vencido" : "fiador-invalido"}
          title={expired ? l.expiredTitle : t.invalid.title}
          body={expired ? l.expiredBody : t.invalid.body}
          alert
        >
          <Link href="/app" className={`mt-5 inline-flex ${buttonClasses("secondary", "sm")}`}>
            {l.backToEntry}
          </Link>
        </Estado>
      );
    }
    return (
      <Estado testId="fiador-error" title={t.error.title} body={t.error.body} alert>
        <button type="button" onClick={() => void query.mutate()} className={`mt-5 ${buttonClasses("secondary", "sm")}`}>
          {t.error.retry}
        </button>
      </Estado>
    );
  }

  const invite = query.data as InviteStatus;
  if (invite.completed && invite.acceptance) {
    return <RealPanel token={token} invite={invite} />;
  }
  return <RealAlta key={token} token={token} student={invite.student} expiresAt={invite.expiresAt} />;
}

// --- Completed invitation ------------------------------------------------------

function RealPanel({ token, invite }: { token: string; invite: InviteStatus }) {
  const l = useT(tReal);
  const { locale } = useLocale();
  const a = invite.acceptance;
  const query = useSWR(["real-invitation", token], () =>
    apiGet<InviteStatus>(`/api/fiador/invitaciones/${encodeURIComponent(token)}`),
  );
  const live = query.data?.acceptance ?? a;
  if (!live) return null;
  const fmt = (v: Micro) => `US$${formatUsdc(v, locale)}`;
  const fecha = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-AR", { dateStyle: "medium" }).format(
    live.acceptedAt * 1000,
  );
  return (
    <div data-testid="fiador-panel-real" className="space-y-4">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-ink">{l.panelTitle}</p>
            <p className="mt-1 text-sm text-ink-2">{l.panelSubtitle}</p>
            <p className="mt-1 text-xs text-ink-2">{l.sameLink}</p>
          </div>
          <ReferenceTag>{l.sandboxTag}</ReferenceTag>
        </div>
      </GlassPanel>
      <GlassPanel className="p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink-2">{l.topeLabel}</p>
            <p className="mt-0.5 font-medium text-ink">{fmt(live.maxPurchase)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-2">{l.acceptedCap}</p>
            <p className="mt-0.5 font-medium text-beam">{fmt(live.coverageMax)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-2">{l.kycNameLabel}</p>
            <p className="mt-0.5 text-sm text-ink">{live.guarantorName}</p>
          </div>
          <div>
            <p className="text-xs text-ink-2">{l.cardTitle}</p>
            <p className="mt-0.5 text-sm text-ink">{live.cardLabel ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-2">{l.registeredOn}</p>
            <p className="mt-0.5 text-sm text-ink">{fecha}</p>
          </div>
          <div>
            <p className="text-xs text-ink-2">{l.registeredOn}</p>
            {live.registeredSignature ? (
              <ExplorerLink signature={live.registeredSignature} />
            ) : (
              <p className="mt-0.5 text-sm text-ink-2">{l.pendingOnchain}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-ink-2">{l.docHash}</p>
            <p className="mt-0.5 break-all font-mono text-xs text-ink">{live.mandateHash}</p>
          </div>
        </dl>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-2">{l.coverageScope}</p>
        <p className="mt-4 font-mono text-xs text-ink-2" title={invite.student}>
          {short(invite.student)}
        </p>
      </GlassPanel>
    </div>
  );
}

// --- Signup wizard ---------------------------------------------------------------

type Paso = 0 | 1 | 2 | 3 | 4;
const PASOS: Paso[] = [0, 1, 2, 3, 4];

interface KycStart {
  sessionId: string;
  url: string;
  status: string;
}
interface KycStatus {
  status: string;
  approved: boolean;
}
interface CardStart {
  subscriberId: string;
  sourceUrl: string;
}
interface CardStatus {
  linked: boolean;
  cardLabel: string | null;
  reason: string | null;
}
interface Cotizar {
  tier: number;
  tierSource: "chain" | "default";
  canOpenPlan: boolean;
  maxPurchase: Micro;
  downPayment: Micro;
  financed: Micro;
  requiredCoverage: Micro;
  coverageMax: Micro;
  policy: string;
}
interface Acceptance {
  acceptanceId: string;
  mandateHash: string;
  mandateText: string;
  proposal: {
    instruction: string;
    program: string;
    network: string;
    args: { max_purchase: number; coverage_max: number; mandate_hash: string };
    accounts: { keeper: string; student: string };
    status: string;
  };
}

// Resume hosted sessions after returning from Didit/Mobbex tabs (same
// browser): the in-flight KYC/card session is stored under the invite token.
function readSession<T>(token: string, kind: "kyc" | "card"): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(`lazo.fiador.real.${token}.${kind}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Session storage blocked: the flow still works, without resume.
    return null;
  }
}

function RealAlta({ token, student, expiresAt }: { token: string; student: string; expiresAt: number }) {
  const t = useT(garanteCuenta);
  const l = useT(tReal);
  const { locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [paso, setPaso] = useState<Paso>(0);
  const [tope, setTope] = useState<Micro | null>(null);
  const [nombre, setNombre] = useState("");
  const [kyc, setKyc] = useState<KycStart | null>(() => readSession<KycStart>(token, "kyc"));
  const [card, setCard] = useState<CardStart | null>(() => readSession<CardStart>(token, "card"));
  const [busy, setBusy] = useState<"kyc" | "card" | "accept" | "register" | null>(null);
  const [kycError, setKycError] = useState("");
  const [cardError, setCardError] = useState("");
  const [acceptError, setAcceptError] = useState("");
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState<Acceptance | null>(null);
  const [registered, setRegistered] = useState<string | null>(null);
  const [registerNote, setRegisterNote] = useState("");
  const [signature, setSignature] = useState("");

  const configQ = useSWR("fiador-config-real", () => getAccountCuotas().getAccountConfig());

  const topes = useMemo(() => {
    const c = configQ.data?.protocol;
    if (!c) return [];
    return [...new Set(c.guaranteedTiers.map((x) => x.maxPurchase))].sort((a, b) => Number(a - b));
  }, [configQ.data]);

  const topeElegido = tope ?? (topes.length ? topes[topes.length - 1] : null);

  // Server-side quote: chain config + the explicitly configured coverage
  // policy. The UI never computes or chooses coverage numbers.
  const cotizarQ = useSWR(
    topeElegido != null ? ["fiador-cotizar", token, topeElegido] : null,
    ([, tk, m]) => apiGet<Cotizar>(`/api/fiador/fianza/cotizar?token=${encodeURIComponent(tk)}&maxPurchase=${m}`),
  );
  const coverageMax = cotizarQ.data?.coverageMax ?? null;
  // Cobertura sobre el capital pendiente (bps), derivada de la cotización
  // del servidor (requiredCoverage / financed). `null` si no se puede saber.
  const coverageBps =
    cotizarQ.data && cotizarQ.data.financed > 0
      ? Math.round((cotizarQ.data.requiredCoverage / cotizarQ.data.financed) * 10_000)
      : null;

  const docQ = useSWR(
    nombre.trim() && topeElegido != null && coverageMax != null
      ? ["fiador-doc-real", student, nombre.trim(), topeElegido, coverageMax, coverageBps ?? -1, locale]
      : null,
    async ([, s, name, maxPurchase, coverageMax, covBps, lang]) => {
      const texto = textoMandato({
        student: s,
        guarantorName: name,
        maxPurchase,
        coverageMax,
        coverageBps: covBps < 0 ? null : covBps,
        issuedAt: Math.floor(Date.now() / 1000),
        locale: lang === "en" ? "en" : "es",
      });
      return { texto, hash: await hashMandato(texto) };
    },
  );

  const kycQ = useSWR(
    kyc ? ["kyc-status", kyc.sessionId] : null,
    () => apiGet<KycStatus>(`/api/fiador/kyc/sesiones/${kyc!.sessionId}?token=${encodeURIComponent(token)}`),
    { refreshInterval: (latest) => (latest?.approved ? 0 : 5000), dedupingInterval: 4000 },
  );
  const cardQ = useSWR(
    card ? ["card-status", card.subscriberId] : null,
    () => apiGet<CardStatus>(`/api/fiador/tarjetas/estado?token=${encodeURIComponent(token)}`),
    { refreshInterval: (latest) => (latest?.linked ? 0 : 5000), dedupingInterval: 4000 },
  );

  if (configQ.isLoading || !configQ.data) {
    if (configQ.error) {
      return (
        <Estado testId="fiador-pendiente" title={t.pending.title} body={t.pending.body}>
          <button type="button" onClick={() => void configQ.mutate()} className={`mt-5 ${buttonClasses("secondary", "sm")}`}>
            {t.pending.retry}
          </button>
        </Estado>
      );
    }
    return (
      <GlassPanel className="animate-pulse p-6" role="status" aria-busy="true">
        <div className="h-3 w-32 rounded bg-beam/10" />
        <div className="mt-4 h-6 w-64 rounded bg-beam/10" />
      </GlassPanel>
    );
  }

  const cfg = configQ.data.protocol;
  const fmt = (v: Micro) => `US$${formatUsdc(v, locale)}`;
  const kycApproved = kycQ.data?.approved === true;
  const cardLinked = cardQ.data?.linked === true;
  const puedeAvanzar =
    paso === 0
      ? topeElegido != null && coverageMax != null
      : paso === 1
        ? nombre.trim().length > 0 && kycApproved
        : paso === 2
          ? docQ.data != null
          : paso === 3
            ? cardLinked
            : checked && done == null;

  const startKyc = async () => {
    setBusy("kyc");
    setKycError("");
    try {
      const s = await apiPost<KycStart>("/api/fiador/kyc/sesiones", { token });
      setKyc(s);
      try {
        window.sessionStorage.setItem(`lazo.fiador.real.${token}.kyc`, JSON.stringify(s));
      } catch {
        // Resume is best-effort.
      }
      window.open(s.url, "_blank", "noopener");
    } catch (e) {
      setKycError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const startCard = async () => {
    setBusy("card");
    setCardError("");
    try {
      const s = await apiPost<CardStart>("/api/fiador/tarjetas/sesiones", { token, name: nombre.trim() });
      setCard(s);
      try {
        window.sessionStorage.setItem(`lazo.fiador.real.${token}.card`, JSON.stringify(s));
      } catch {
        // Resume is best-effort.
      }
      window.open(s.sourceUrl, "_blank", "noopener");
    } catch (e) {
      setCardError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const accept = async () => {
    if (!checked || topeElegido == null || coverageMax == null || !kyc || !card) return;
    setBusy("accept");
    setAcceptError("");
    try {
      const a = await apiPost<Acceptance>("/api/fiador/fianza/aceptar", {
        token,
        maxPurchase: topeElegido,
        guarantorName: nombre.trim(),
        kycSessionId: kyc.sessionId,
        subscriberId: card.subscriberId,
      });
      setDone(a);
      try {
        window.sessionStorage.removeItem(`lazo.fiador.real.${token}.kyc`);
        window.sessionStorage.removeItem(`lazo.fiador.real.${token}.card`);
      } catch {
        // Cleanup is best-effort.
      }
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const register = async () => {
    if (!done || !signature.trim()) return;
    setBusy("register");
    setRegisterNote("");
    try {
      const r = await apiPost<{ signature: string; verified?: boolean; deduped?: boolean }>("/api/fiador/fianza/registrar", {
        acceptanceId: done.acceptanceId,
        signature: signature.trim(),
      });
      setRegistered(r.signature);
    } catch (e) {
      setRegisterNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const etiquetas = [l.steps.resumen, l.steps.identidad, l.steps.documento, l.steps.tarjeta, l.steps.confirmar];
  const vence = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-AR", { dateStyle: "medium" }).format(
    expiresAt * 1000,
  );

  if (done) {
    return (
      <GlassPanel data-testid="fiador-aceptada" className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-ink">{registered ? l.registeredTitle : l.acceptedTitle}</p>
            <p className="mt-1 max-w-prose text-sm text-ink-2">{l.acceptedBody}</p>
          </div>
          <ReferenceTag>{l.sandboxTag}</ReferenceTag>
        </div>
        <p className="mt-4 break-all font-mono text-xs text-ink-2">
          {l.docHash}: <span className="text-ink">{done.mandateHash}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => descargarMandato(done.mandateText, "fianza-lazo.txt")} className={buttonClasses("secondary", "sm")}>
            {t.alta.docDownload}
          </button>
          <button type="button" onClick={() => window.location.reload()} className={buttonClasses("secondary", "sm")}>
            {l.retry}
          </button>
        </div>
        <GlassSlab className="mt-5">
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-ink-2">{l.proposalTitle}</p>
            <dl className="mt-2 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
              <div><dt className="text-xs">{done.proposal.instruction}</dt><dd className="font-mono text-xs text-ink">{done.proposal.program}</dd></div>
              <div><dt className="text-xs">devnet</dt><dd className="text-ink">{done.proposal.network}</dd></div>
              <div><dt className="text-xs">max_purchase</dt><dd className="text-ink">{fmt(done.proposal.args.max_purchase)}</dd></div>
              <div><dt className="text-xs">coverage_max</dt><dd className="text-ink">{fmt(done.proposal.args.coverage_max)}</dd></div>
            </dl>
          </div>
        </GlassSlab>
        {registered ? (
          <div className="mt-4" role="status">
            <ExplorerLink signature={registered} />
          </div>
        ) : (
          <div className="mt-5">
            <p className="font-medium text-ink">{l.verifyLabel}</p>
            <p className="mt-1 max-w-prose text-sm text-ink-2">{l.verifyHint}</p>
            <label className="mt-3 block max-w-md">
              <span className="text-sm text-ink-2">{l.verifySig}</span>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="5…"
                spellCheck={false}
                className="mt-1 w-full rounded-2xl border border-hairline bg-transparent px-4 py-2.5 font-mono text-sm text-ink placeholder:text-ink-2/50 focus:border-beam focus:outline-none"
              />
            </label>
            <button
              type="button"
              disabled={!signature.trim() || busy === "register"}
              onClick={() => void register()}
              className={`${buttonClasses("primary", "md")} mt-4 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {busy === "register" ? l.verifyWorking : l.verifyCta}
            </button>
            {registerNote && (
              <p role="status" className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">
                {registerNote}
              </p>
            )}
          </div>
        )}
      </GlassPanel>
    );
  }

  return (
    <GlassPanel data-testid="fiador-alta-real" className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{l.altaTitle}</p>
          <p className="mt-1 max-w-prose text-sm text-ink-2">{l.altaSubtitle}</p>
          <p className="mt-1 font-mono text-xs text-ink-2" title={student}>
            {short(student)} · {vence}
          </p>
        </div>
        <ReferenceTag>{l.sandboxTag}</ReferenceTag>
      </div>

      <ol className="mt-5 flex flex-wrap gap-2" aria-label={l.altaTitle}>
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
          <section aria-label={l.steps.resumen}>
            <p className="font-medium text-ink">{t.alta.resumenTitle}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{t.alta.resumenBody}</p>
            <fieldset className="mt-5">
              <legend className="text-xs uppercase tracking-wide text-ink-2">{l.topeLabel}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {topes.map((m) => (
                  <label
                    key={String(m)}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-sm has-checked:border-beam has-checked:bg-beam/10 has-checked:text-beam max-sm:min-h-10"
                  >
                    <input
                      type="radio"
                      name="tope-real"
                      className="accent-cyan"
                      checked={topeElegido === m}
                      onChange={() => setTope(m)}
                    />
                    {l.topeOption} {fmt(m)}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-2">{t.alta.topeHint}</p>
            </fieldset>
            <GlassSlab className="mt-5">
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-ink-2">{t.alta.coberturaTitle}</p>
                {cotizarQ.data ? (
                  <>
                  <ul className="mt-2 space-y-2 text-sm text-ink-2">
                    <li className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="max-w-prose">{l.requiredCoverage}</span>
                      <strong className="text-ink">{fmt(cotizarQ.data.requiredCoverage)}</strong>
                    </li>
                    {coverageBps != null && (
                      <li className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="max-w-prose">{l.coveragePctLabel}</span>
                        <strong className="text-ink">{fmtPct(coverageBps / 10_000, locale)}</strong>
                      </li>
                    )}
                    <li className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="max-w-prose">{l.acceptedCap}</span>
                      <strong className="text-beam">{fmt(cotizarQ.data.coverageMax)}</strong>
                    </li>
                    <li className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="max-w-prose">{l.capTier}</span>
                      <span className="text-ink">{tierLabel(cotizarQ.data.tier)}</span>
                    </li>
                    <li className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="max-w-prose">{l.capPolicy}</span>
                      <span className="font-mono text-xs text-ink">{cotizarQ.data.policy}</span>
                    </li>
                  </ul>
                  <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">{l.coverageScope}</p>
                  </>
                ) : cotizarQ.error ? (
                  <div role="status" className="mt-2">
                    <p className="text-sm font-medium text-ink">
                      {codeOf(cotizarQ.error) === "coverage_policy_pending" ? l.policyPendingTitle : l.quotePendingTitle}
                    </p>
                    <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-2">
                      {codeOf(cotizarQ.error) === "coverage_policy_pending" ? l.policyPendingBody : l.quotePendingBody}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 h-16 animate-pulse rounded-2xl bg-beam/5" aria-hidden="true" />
                )}
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
          <section aria-label={l.steps.identidad}>
            <p className="font-medium text-ink">{l.kycTitle}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{l.kycBody}</p>
            <label className="mt-4 block max-w-md">
              <span className="text-sm text-ink-2">{l.kycNameLabel}</span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={t.alta.kycNamePlaceholder}
                className="mt-1 w-full rounded-2xl border border-hairline bg-transparent px-4 py-2.5 text-ink placeholder:text-ink-2/50 focus:border-beam focus:outline-none"
                autoComplete="name"
              />
            </label>
            <div className="mt-4">
              {!kyc ? (
                <button
                  type="button"
                  disabled={!nombre.trim() || busy === "kyc"}
                  onClick={() => void startKyc()}
                  className={`${buttonClasses("primary", "md")} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {busy === "kyc" ? l.kycWaiting : l.kycStart}
                </button>
              ) : kycApproved ? (
                <p role="status" className="text-sm font-medium text-beam">{l.kycApproved}</p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <a href={kyc.url} target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm")}>
                    {l.kycOpen}
                  </a>
                  <p role="status" className="text-sm text-ink-2">
                    {kycQ.data ? `${l.kycWaiting} (${kycQ.data.status})` : l.kycWaiting}
                  </p>
                </div>
              )}
              {kycError && (
                <p role="alert" className="mt-3 max-w-prose text-sm text-bad">
                  {kycError.includes("didit_not_configured") ? l.kycMissing : kycError}
                </p>
              )}
              {kyc && !kycApproved && kycQ.data && ["Declined", "Expired", "Abandoned"].includes(kycQ.data.status) && (
                <p role="alert" className="mt-3 text-sm text-bad">{l.kycNotApproved}</p>
              )}
            </div>
          </section>
        )}

        {paso === 2 && (
          <section aria-label={l.steps.documento}>
            <p className="font-medium text-ink">{l.docTitle}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{l.docBody}</p>
            {docQ.data ? (
              <>
                <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-hairline bg-beam/5 p-4 font-mono text-xs text-ink-2">
                  {docQ.data.texto}
                </pre>
                <p className="mt-3 break-all font-mono text-xs text-ink-2">
                  {t.alta.docHashLabel}: <span className="text-ink">{docQ.data.hash}</span>
                </p>
              </>
            ) : (
              <div className="mt-4 h-40 animate-pulse rounded-2xl bg-beam/5" />
            )}
          </section>
        )}

        {paso === 3 && (
          <section aria-label={l.steps.tarjeta}>
            <p className="font-medium text-ink">{l.cardTitle}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{l.cardBody}</p>
            <div className="mt-4">
              {!card ? (
                <button
                  type="button"
                  disabled={busy === "card"}
                  onClick={() => void startCard()}
                  className={`${buttonClasses("primary", "md")} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {busy === "card" ? l.cardWaiting : l.cardStart}
                </button>
              ) : cardLinked ? (
                <p role="status" className="text-sm font-medium text-beam">
                  {l.cardLinked}{cardQ.data?.cardLabel ? ` · ${cardQ.data.cardLabel}` : ""}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <a href={card.sourceUrl} target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm")}>
                    {l.cardOpen}
                  </a>
                  <p role="status" className="text-sm text-ink-2">{l.cardWaiting}</p>
                </div>
              )}
              {cardError && (
                <p role="alert" className="mt-3 max-w-prose text-sm text-bad">
                  {cardError.includes("mobbex_not_configured") ? l.cardMissing : cardError}
                </p>
              )}
            </div>
            <p className="mt-3 text-xs text-ink-2">{t.alta.cardSimulated}</p>
          </section>
        )}

        {paso === 4 && (
          <section aria-label={l.steps.confirmar}>
            <p className="font-medium text-ink">{l.reviewTitle}</p>
            <dl className="mt-4 grid gap-3 rounded-2xl border border-hairline p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-2">{t.alta.confirmStudent}</dt>
                <dd className="font-mono text-xs text-ink" title={student}>{short(student)}</dd>
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
                <dd className="text-ink">{coverageMax != null ? fmt(coverageMax) : "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.alta.confirmCard}</dt>
                <dd className="text-ink">{cardQ.data?.cardLabel ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-2">{t.alta.confirmDoc}</dt>
                <dd className="break-all font-mono text-xs text-ink-2">
                  {docQ.data ? `${docQ.data.hash.slice(0, 16)}…` : "—"}
                </dd>
              </div>
            </dl>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-hairline p-4">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 accent-cyan"
              />
              <span className="max-w-prose text-sm leading-relaxed text-ink-2">{l.reviewCheck}</span>
            </label>
            {acceptError && <p role="alert" className="mt-3 text-sm text-bad">{l.reviewError} {acceptError}</p>}
          </section>
        )}
        </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={paso === 0}
          onClick={() => { setKycError(""); setCardError(""); setAcceptError(""); setPaso((paso - 1) as Paso); }}
          className={`${buttonClasses("secondary", "sm")} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {l.back}
        </button>
        {paso < 4 ? (
          <button
            type="button"
            disabled={!puedeAvanzar}
            onClick={() => { setKycError(""); setCardError(""); setAcceptError(""); setPaso((paso + 1) as Paso); }}
            className={`${buttonClasses("primary", "md")} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {l.next}
          </button>
        ) : (
          <button
            type="button"
            disabled={!puedeAvanzar || busy === "accept"}
            onClick={() => void accept()}
            className={`${buttonClasses("primary", "md")} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {busy === "accept" ? l.reviewWorking : l.reviewCta}
          </button>
        )}
      </div>
    </GlassPanel>
  );
}
