"use client";

// Entrada única de cuentas: detecta el rol por la wallet conectada (o por la
// cuenta de ejemplo elegida en mock) y redirige a la cuenta que corresponde.
// El fiador no tiene wallet: se queda acá y genera su invitación demo.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useStudentAddress } from "@/components/cuenta/account-context";
import { ModeBadge } from "@/components/cuenta/evidencia";
import { BigNumber } from "@/components/ui/big-number";
import { buttonClasses } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass";
import { WalletButton } from "@/components/wallet-button";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useT } from "@/i18n/locale";
import { getAccountCuotas, type AccountRole, type Invitation } from "@/lib/cuotas";
import { ACCOUNT_ROUTES, guarantorPath, PUBLIC_ROUTES } from "@/lib/roles";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

// Fallback visual mientras el router navega: si la ruta destino todavía no
// existe (owners 03/04 en curso) el usuario ve a dónde iba.
function RoleCard() {
  const t = useT(cuentas);
  const { account, balance } = useAccount();
  if (!account) return null;

  const detected: Record<AccountRole, string> = {
    admin: t.entry.roleDetectedAdmin,
    merchant: t.entry.roleDetectedMerchant,
    student: t.entry.roleDetectedStudent,
  };
  const route = ACCOUNT_ROUTES[account.role];

  return (
    <GlassPanel data-testid="role-card" className="p-6">
      <p className="text-sm text-ink-3">
        {detected[account.role]}
        {account.roleEvidence === "demo-fixture" && ` · ${t.entry.roleEvidenceFixture}`}
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-2xl font-semibold text-beam">{t.roles[account.role]}</h2>
        <span className="font-num text-sm text-ink-ghost" data-testid="role-address">
          {short(account.address)}
        </span>
      </div>

      {account.role === "student" && (
        <div className="mt-4 space-y-2 text-sm text-ink-2">
          <p data-testid="balance-line" className="flex flex-wrap items-baseline gap-x-2">
            {t.entry.balanceLabel}:
            {balance?.available != null ? (
              <>
                <BigNumber amount={balance.available} currency="none" size="md" />
                <span className="text-ink-3">devUSDC</span>
              </>
            ) : (
              t.entry.balanceUnavailable
            )}
          </p>
          {account.reputationStatus === "not_found" && (
            <p className="text-ink-3">{t.entry.reputationMissing}</p>
          )}
          {account.reputationStatus === "unavailable" && (
            <p className="text-ink-3">{t.entry.reputationUnavailable}</p>
          )}
          {account.reputation && (
            <p className="tabular-nums">
              {t.entry.tier} {account.reputation.tier} · {t.roles.student}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center gap-4">
        <Link href={route} data-testid="role-enter" className={buttonClasses("primary")}>
          {t.entry.enter}
        </Link>
        <ModeBadge />
      </div>
    </GlassPanel>
  );
}

function GuarantorCard() {
  const t = useT(cuentas).entry;
  const student = useStudentAddress();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!student) return;
    let live = true;
    getAccountCuotas()
      .createInvitation(student)
      .then((inv) => live && setInvitation(inv))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [student]);

  return (
    <GlassPanel className="p-6" data-testid="guarantor-card">
      <h2 className="text-xl font-semibold text-beam">{t.guarantorTitle}</h2>
      <p className="mt-2 max-w-prose text-sm text-ink-2">{t.guarantorBlurb}</p>
      {student && (
        <p className="mt-2 font-num text-xs text-ink-ghost">
          {t.guarantorStudent}: {short(student)}
        </p>
      )}
      <p className="mt-2 max-w-prose text-xs text-ink-3">{t.guarantorSameBrowser}</p>
      <div className="mt-4">
        {(failed || !student) && <p className="text-sm text-crack">{t.guarantorError}</p>}
        {!failed && student && !invitation && (
          <p className="text-sm text-ink-3" role="status">
            {t.guarantorCreating}
          </p>
        )}
        {invitation && (
          <Link
            href={guarantorPath(invitation.token)}
            data-testid="guarantor-invite"
            className={buttonClasses("secondary")}
          >
            {t.guarantorInvite}
          </Link>
        )}
      </div>
    </GlassPanel>
  );
}

export default function CuentaEntry() {
  const t = useT(cuentas).entry;
  const router = useRouter();
  const { mode, walletAddress, demoId, account, status, errorCode, refresh } = useAccount();

  const guarantorDemo = mode === "mock" && demoId === "guarantor";

  // Ruteo: apenas el rol resuelve, la entrada te deja en tu cuenta. El fiador
  // no tiene cuenta propia acá: entra por invitación y se queda en /app.
  useEffect(() => {
    if (status === "ready" && account) {
      router.replace(ACCOUNT_ROUTES[account.role]);
    }
  }, [status, account, router]);

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-beam sm:text-4xl">{t.title}</h1>
        <p className="mt-3 text-ink-2">{t.subtitle}</p>
      </header>

      <dl className="grid max-w-3xl gap-5 sm:grid-cols-2">
        <div data-testid="wallet-explainer">
          <dt className="text-sm font-medium text-ink">Wallet</dt>
          <dd className="mt-1 text-sm leading-relaxed text-ink-3">{t.walletExplainer}</dd>
        </div>
        <div data-testid="devnet-explainer">
          <dt className="text-sm font-medium text-ink">Devnet · devUSDC</dt>
          <dd className="mt-1 text-sm leading-relaxed text-ink-3">{t.devnetExplainer}</dd>
        </div>
      </dl>

      <div className="space-y-4">
        {status === "idle" && !guarantorDemo && (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-ink-2">{t.connectCta}</p>
            <WalletButton />
          </div>
        )}
        {status === "idle" && walletAddress && (
          <p className="text-sm text-ink-3">
            {t.walletConnected}: <span className="font-num">{short(walletAddress)}</span>
          </p>
        )}
        {status === "resolving" && (
          <p role="status" className="text-ink-2">
            {t.resolving}
          </p>
        )}
        {status === "error" && (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-crack">
              {t.errorTitle}
              {errorCode ? ` (${errorCode})` : ""}
            </p>
            <button
              type="button"
              onClick={refresh}
              className={buttonClasses("secondary", "sm")}
            >
              {t.errorRetry}
            </button>
          </div>
        )}
        {status === "ready" && !guarantorDemo && (
          <div className="space-y-3">
            <p role="status" className="text-sm text-ink-3" data-testid="redirecting">
              {t.redirecting}
            </p>
            <RoleCard />
          </div>
        )}
        {guarantorDemo && <GuarantorCard />}
      </div>

      {mode === "mock" && (
        <section>
          <h2 className="text-lg font-semibold text-beam">{t.demoTitle}</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-3">{t.demoBlurb}</p>
        </section>
      )}

      <section className="border-t border-beam/10 pt-6">
        <h2 className="text-lg font-semibold text-beam">{t.publicTitle}</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-3">{t.publicBlurb}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={PUBLIC_ROUTES.pool}
            data-testid="public-pool"
            className={buttonClasses("secondary")}
          >
            {t.publicPool}
          </Link>
          <Link
            href={PUBLIC_ROUTES.comercio}
            data-testid="public-comercio"
            className={buttonClasses("secondary")}
          >
            {t.publicComercio}
          </Link>
        </div>
      </section>
    </div>
  );
}
