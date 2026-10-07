"use client";

// Tira de contexto de las cuentas bajo /app: qué identidad está activa
// (rol + dirección + saldo) y la declaración devnet siempre visible. A la
// derecha, el selector de identidades de ejemplo (persistido, solo mock —
// nunca autoriza nada). La navegación del sitio vive en el header global:
// acá no hay menú, es una tira de estado, no una barra de navegación.
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
  return (
    <div
      className="flex min-w-0 max-w-full items-center gap-2"
      role="group"
      aria-label={t.demoSelectorLabel}
      data-testid="demo-selector"
      title={t.demoHint}
    >
      <span className="hidden font-num text-[0.6875rem] uppercase tracking-[0.14em] text-ink-ghost sm:inline">
        {t.demoSelectorLabel}
      </span>
      <span className="segtrack min-w-0 max-w-full overflow-x-auto">
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
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-num text-[0.6875rem] uppercase tracking-[0.18em] text-ink-ghost">
                {t.shell.title}
              </span>
              {roleLabel && (
                <Chip on data-testid="role-chip">
                  {roleLabel}
                  {address && <span className="font-num normal-case">{short(address)}</span>}
                </Chip>
              )}
              {balance !== null && (
                <Chip data-testid="balance-chip">
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
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2.5 sm:ml-auto">
              <span data-testid="devnet-badge">
                <DevnetBadge />
              </span>
              {mode === "mock" && <DemoSelector />}
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
