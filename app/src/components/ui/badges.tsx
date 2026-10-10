"use client";

import { useId, type ReactNode } from "react";
import { getCuotas } from "@/lib/cuotas";
import { common } from "@/i18n/dictionaries/common";
import { design } from "@/i18n/dictionaries/design";
import { useT } from "@/i18n/locale";

/**
 * Badge devnet siempre visible: corre en la red de prueba de Solana, la
 * plata es de mentira. El tooltip explica qué es devnet. Con `live` declara
 * el modo real (transacciones firmadas de verdad en devnet), no la demo.
 */
export function DevnetBadge({ className = "", live = false }: { className?: string; live?: boolean }) {
  const t = useT(common);
  const d = useT(design);
  const tipId = useId();
  return (
    <span className={`tip inline-flex ${className}`} tabIndex={0} aria-describedby={tipId}>
      <span className="chip" data-on="true">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-violet shadow-[0_0_6px_var(--color-violet)]"
        />
        <span className="sm:hidden">{d.chrome.devnetShort}</span>
        <span className="hidden sm:inline">{live ? t.devnetLive : t.devnet}</span>
      </span>
      <span role="tooltip" id={tipId} className="tip-panel glass glass-deep font-sans">
        {live ? t.devnetLiveHint : t.devnetHint}
      </span>
    </span>
  );
}

/** "referencia": etiqueta para cifras de terceros no verificadas. */
export function ReferenceTag({ children }: { children?: ReactNode }) {
  return <span className="ref-tag">{children ?? "referencia"}</span>;
}

/** Icono de enlace externo (comprobante onchain), dibujado en un trazo. */
export function ExplorerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4.5 1.5h6v6" />
      <path d="M10.5 1.5 5.5 6.5" />
      <path d="M8.5 7.5v3h-7v-7h3" />
    </svg>
  );
}

const short = (sig: string) => `${sig.slice(0, 6)}…${sig.slice(-4)}`;

/**
 * Firma/hash onchain. En modo real linkea al Explorer de devnet; en mock la
 * firma es simulada y se declara (no hay transacción real que mostrar).
 */
export function ExplorerLink({
  signature,
  className = "",
}: {
  signature: string;
  className?: string;
}) {
  const mode = getCuotas().mode;
  const label = short(signature);
  if (mode === "mock") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-num text-[0.8125rem] text-ink-2 ${className}`}
      >
        <ExplorerIcon className="h-3 w-3 text-ink-ghost" />
        {label}
      </span>
    );
  }
  return (
    <a
      href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 font-num text-[0.8125rem] text-cyan underline decoration-cyan/40 hover:text-beam ${className}`}
    >
      <ExplorerIcon className="h-3 w-3" />
      {label}
    </a>
  );
}
