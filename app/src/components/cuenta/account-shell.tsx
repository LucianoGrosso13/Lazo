"use client";

// Chrome de las cuentas bajo /app: rol detectado, saldo, navegación a las
// cuatro cuentas + consulta pública, y el selector de cuentas de ejemplo
// (persistido, solo mock — nunca autoriza nada). Usa el sistema Prisma.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DevnetBadge } from "@/components/ui/badges";
import { Chip, ChipButton } from "@/components/ui/chip";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useT } from "@/i18n/locale";
import { formatUsdc } from "@/lib/cuotas";
import { useLocale } from "@/i18n/locale";
import { ACCOUNT_ROUTES, DEMO_ACCOUNT_IDS, DEMO_ROUTES, PUBLIC_ROUTES } from "@/lib/roles";
import { useAccount } from "./account-context";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

function DemoSelector() {
  const t = useT(cuentas).shell;
  const router = useRouter();
  const { demoId, selectDemo } = useAccount();
  return (
    <div
      className="flex items-center gap-2 pl-1"
      role="group"
      aria-label={t.demoSelectorLabel}
      data-testid="demo-selector"
      title={t.demoHint}
    >
      <span className="hidden font-num text-[0.6875rem] uppercase tracking-[0.14em] text-ink-ghost lg:inline">
        {t.demoSelectorLabel}
      </span>
      <span className="segtrack max-w-full overflow-x-auto">
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
  const pathname = usePathname();
  const { mode, account, address, balance, demoId } = useAccount();

  const roleLabel =
    demoId === "guarantor" && !account
      ? t.roles.guarantor
      : account
        ? t.roles[account.role]
        : null;

  const nav = [
    { href: ACCOUNT_ROUTES.student, label: t.shell.nav.student },
    { href: ACCOUNT_ROUTES.merchant, label: t.shell.nav.merchant },
    { href: ACCOUNT_ROUTES.admin, label: t.shell.nav.admin },
    { href: PUBLIC_ROUTES.pool, label: t.shell.nav.pool },
    { href: PUBLIC_ROUTES.comercio, label: t.shell.nav.comercioPublico },
  ];

  return (
    <>
      <section className="glass-deep border-b border-beam/5" aria-label={t.shell.title}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
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
            <span className="ml-auto" data-testid="devnet-badge">
              <DevnetBadge />
            </span>
          </div>
          <nav
            className="flex flex-wrap items-center gap-x-1 gap-y-2 pb-3"
            aria-label={t.shell.title}
          >
            {nav.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 font-num text-measure uppercase transition-colors ${
                    active ? "bg-beam/10 text-beam" : "text-ink-2 hover:text-beam"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {mode === "mock" && (
              <div className="ml-auto max-w-full">
                <DemoSelector />
              </div>
            )}
          </nav>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
