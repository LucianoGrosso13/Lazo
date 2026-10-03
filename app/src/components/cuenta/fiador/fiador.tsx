"use client";

// Entrada del fiador por token de invitación: sin wallet, el enlace ES la
// credencial. Token inválido → estado honesto sin exponer datos; real sin
// backend HMAC → pendiente explícito; válida sin usar → alta; usada → panel.
import Link from "next/link";
import useSWR from "swr";
import { buttonClasses } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass";
import { garanteCuenta } from "@/i18n/dictionaries/fiador-cuenta";
import { useT } from "@/i18n/locale";
import { AccountCuotasError, getAccountCuotas, type Invitation } from "@/lib/cuotas";
import { AltaFiador } from "./alta";
import { PanelFiador } from "./panel";

const codeOf = (e: unknown): string | null =>
  e instanceof AccountCuotasError
    ? e.code
    : e && typeof e === "object" && "code" in e
      ? String((e as { code: unknown }).code)
      : null;

function Estado({ testId, title, body, children }: {
  testId: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <GlassPanel data-testid={testId} className="p-6" role="status">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{body}</p>
      {children}
    </GlassPanel>
  );
}

export function FiadorEntry({ token }: { token: string }) {
  const t = useT(garanteCuenta);
  const query = useSWR(["fiador-invitation", token], () =>
    getAccountCuotas().resolveInvitation(token),
  );
  const { mutate } = query;

  if (query.isLoading || (query.data === undefined && !query.error)) {
    return (
      <GlassPanel className="animate-pulse p-6" role="status" aria-busy="true">
        <div className="h-3 w-32 rounded bg-beam/10" />
        <div className="mt-4 h-6 w-56 rounded bg-beam/10" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-beam/5" />
          <div className="h-3 w-2/3 rounded bg-beam/5" />
        </div>
      </GlassPanel>
    );
  }

  if (query.error) {
    const code = codeOf(query.error);
    if (code === "invalid_token") {
      return (
        <Estado testId="fiador-invalido" title={t.invalid.title} body={t.invalid.body}>
          <Link href="/app" className={`mt-5 inline-flex ${buttonClasses("secondary", "sm")}`}>
            {t.invalid.cta}
          </Link>
        </Estado>
      );
    }
    if (code === "not_implemented" || code === "demo_only") {
      return (
        <Estado testId="fiador-pendiente" title={t.pending.title} body={t.pending.body}>
          <button
            type="button"
            onClick={() => void mutate()}
            className={`mt-5 ${buttonClasses("secondary", "sm")}`}
          >
            {t.pending.retry}
          </button>
        </Estado>
      );
    }
    return (
      <Estado testId="fiador-error" title={t.error.title} body={t.error.body}>
        <button
          type="button"
          onClick={() => void mutate()}
          className={`mt-5 ${buttonClasses("secondary", "sm")}`}
        >
          {t.error.retry}
        </button>
      </Estado>
    );
  }

  const invitation = query.data as Invitation;
  if (invitation.completedAt) {
    return <PanelFiador invitation={invitation} />;
  }
  return <AltaFiador invitation={invitation} />;
}
