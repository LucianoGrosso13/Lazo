"use client";

// Evidencia honesta de cuentas: en mock todo lo onchain es SIMULADO y se
// etiqueta como tal; un enlace al Explorer de devnet solo aparece en modo
// real con una firma verdadera. Recibos locales nunca linkean.
import { ExplorerIcon, ExplorerLink } from "@/components/ui/badges";
import { Chip } from "@/components/ui/chip";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { design } from "@/i18n/dictionaries/design";
import { useT } from "@/i18n/locale";
import { getCuotas } from "@/lib/cuotas";

export type Evidence =
  | { kind: "none" }
  | { kind: "signature"; signature: string }
  | { kind: "receipt"; hash: string };

const short = (v: string) => `${v.slice(0, 6)}…${v.slice(-4)}`;

/**
 * Una pieza de evidencia. Firma real → Explorer devnet (vía ExplorerLink,
 * que ya distingue modos); firma ausente → chip "sin evidencia"; hash de
 * recibo local → siempre etiquetado, nunca enlazado.
 */
export function EvidenceMark({ evidence }: { evidence: Evidence }) {
  const t = useT(cuentas).evidence;
  const d = useT(design).chrome;
  switch (evidence.kind) {
    case "none":
      return <Chip data-testid="evidence-none">{t.noEvidence}</Chip>;
    case "signature":
      return <ExplorerLink signature={evidence.signature} />;
    case "receipt":
      return (
        <span className="inline-flex items-center gap-1.5 font-num text-[0.8125rem] text-ink-2">
          <ExplorerIcon className="h-3 w-3 text-ink-ghost" />
          {short(evidence.hash)}
          <span className="ref-tag">{t.receipt}</span>
          {getCuotas().mode === "mock" && <span className="ref-tag">{d.simulated}</span>}
        </span>
      );
  }
}

/**
 * Chip de modo para las pantallas de cuenta: "Mock" en demo o "Devnet" en
 * real. El texto real no es evidencia — es contexto.
 */
export function ModeBadge() {
  const t = useT(cuentas).evidence;
  const mode = getCuotas().mode;
  return <Chip data-testid="mode-badge">{mode === "mock" ? t.modeMock : t.modeReal}</Chip>;
}
