"use client";

import { GlassPanel } from "@/components/ui/glass";
import { useT } from "@/i18n/locale";
import { mostrador } from "@/i18n/dictionaries/mostrador";

export function FlujoPasos() {
  const t = useT(mostrador);

  const pasos = [
    {
      numero: t.paso1Numero,
      titulo: t.paso1Titulo,
      desc: t.paso1Desc,
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 text-cyan"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M7 15h0M2 10h20" />
        </svg>
      ),
    },
    {
      numero: t.paso2Numero,
      titulo: t.paso2Titulo,
      desc: t.paso2Desc,
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 text-green"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v6M14 20h6" />
        </svg>
      ),
    },
    {
      numero: t.paso3Numero,
      titulo: t.paso3Titulo,
      desc: t.paso3Desc,
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 text-violet"
        >
          <rect x="6" y="2" width="12" height="20" rx="3" />
          <path d="M11 18h2" />
          <path d="m9 10 2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <GlassPanel className="p-5 sm:p-6" data-testid="mostrador-flujo">
      <h2 className="text-sm font-semibold tracking-wide text-beam uppercase font-num">
        {t.flujoTitulo}
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {pasos.map((p) => (
          <div
            key={p.numero}
            className="relative flex flex-col rounded-xl border border-beam/8 bg-beam/[0.02] p-4 transition-colors hover:border-beam/15"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg border border-beam/10 bg-beam/[0.04]">
                {p.icon}
              </span>
              <span className="font-num text-xs font-semibold text-ink-ghost">
                {t.pasoEtiqueta(p.numero)}
              </span>
            </div>
            <h3 className="mt-3 text-base font-medium text-beam">{p.titulo}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{p.desc}</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
