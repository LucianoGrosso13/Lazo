"use client";

// Tira de contexto de las cuentas bajo /app: qué identidad está activa
// (rol + dirección + saldo) y la declaración devnet siempre visible. A la
// derecha, el selector de identidades de ejemplo (persistido, solo mock —
// nunca autoriza nada). La navegación del sitio vive en el header global:
// acá no hay menú, es una tira de estado, no una barra de navegación.
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DevnetBadge } from "@/components/ui/badges";
import { Chip, ChipButton } from "@/components/ui/chip";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useT } from "@/i18n/locale";
import { formatUsdc } from "@/lib/cuotas";
import { useLocale } from "@/i18n/locale";
import { DEMO_ACCOUNT_IDS, DEMO_ROUTES } from "@/lib/roles";
import { useAccount } from "./account-context";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

function DemoSelector() {
  const t = useT(cuentas).shell;
  const router = useRouter();
  const { demoId, selectDemo } = useAccount();
  const track = useRef<HTMLSpanElement>(null);
  // En teléfono la pista se desliza: la identidad activa queda a la vista y
  // el borde izquierdo solo se desvanece cuando ya hay algo escondido ahí.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const mark = () => { el.dataset.scrolled = String(el.scrollLeft > 4); };
    el.addEventListener("scroll", mark, { passive: true });
    const on = el.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (on && el.scrollWidth > el.clientWidth) {
      const gap = on.getBoundingClientRect().left - el.getBoundingClientRect().left;
      el.scrollLeft += gap - (el.clientWidth - on.offsetWidth) / 2;
    }
    mark();
    return () => el.removeEventListener("scroll", mark);
  }, [demoId]);
  return (
    <div
      className="flex min-w-0 max-w-full items-center gap-2 max-sm:w-full max-sm:flex-col max-sm:items-start max-sm:gap-1.5"
      role="group"
      aria-label={t.demoSelectorLabel}
      data-testid="demo-selector"
      title={t.demoHint}
    >
      <span className="font-num text-[0.6875rem] uppercase tracking-[0.14em] text-ink-ghost">
        {t.demoSelectorLabel}
      </span>
      <span ref={track} className="segtrack segtrack-slide min-w-0 max-w-full">
        {DEMO_ACCOUNT_IDS.map((id) => (
          <ChipButton
            key={id}
            data-testid={`demo-option-${id}`}
            on={demoId === id}
            onClick={() => {
              // Un click: cambia la identidad y navega a su cuenta.
              const next = demoId === id ? null : id;
              selectDemo(next);
              if (next) router.push(DEMO_ROUTES[next]);
            }}
          >
            {t.demoOptions[id]}
          </ChipButton>
        ))}
      </span>
    </div>
  );
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const t = useT(cuentas);
  const { locale } = useLocale();
  const { mode, account, address, balance, demoId } = useAccount();

  const roleLabel =
    demoId === "guarantor" && !account
      ? t.roles.guarantor
      : account
        ? t.roles[account.role]
        : null;

  return (
    <>
      <section className="glass-deep border-b border-beam/5" aria-label={t.shell.title}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* En teléfono los dos grupos se disuelven (`contents`) y la tira se
              reordena: identidad + devnet, saldo, y el selector a lo ancho. */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 max-sm:py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:contents">
              <span className="font-num text-[0.6875rem] uppercase tracking-[0.18em] text-ink-ghost max-sm:hidden">
                {t.shell.title}
              </span>
              {roleLabel && (
                <Chip on data-testid="role-chip" className="max-sm:order-1">
                  {roleLabel}
                  {address && <span className="font-num normal-case">{short(address)}</span>}
                </Chip>
              )}
              {balance !== null && (
                <Chip data-testid="balance-chip" className="max-sm:order-3">
                  {balance.available !== null ? (
                    <>
                      {t.shell.balance}{" "}
                      <span className="tabular-nums normal-case">
                        {formatUsdc(balance.available, locale)} devUSDC
                      </span>
                    </>
                  ) : (
                    <span className="normal-case">{t.shell.balanceUnavailable}</span>
                  )}
                </Chip>
              )}
            </div>
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2.5 max-sm:contents sm:ml-auto">
              <span data-testid="devnet-badge" className="max-sm:order-2 max-sm:ml-auto">
                <DevnetBadge />
              </span>
              {mode === "mock" && (
                <div className="min-w-0 max-w-full max-sm:order-4 max-sm:w-full">
                  <DemoSelector />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
