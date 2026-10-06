"use client";

// InviteGuarantor: el estudiante genera el enlace de invitación para su
// garante y lo copia o manda por WhatsApp. En mock el enlace es de la demo y
// vale solo en este navegador (localStorage, sin backend compartido). En real
// el token lo firma el servidor (POST /api/fiador/invitaciones, HMAC): el
// enlace es cross-browser y la URL a compartir es origin + guarantorPath, el
// mismo path que devuelve la API. Si el backend falla se declara el error:
// nunca se simula una invitación que no existe.
import { useState } from "react";
import useSWR from "swr";
import { ReferenceTag } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass";
import { invitacionCuenta } from "@/i18n/dictionaries/invitacion-cuenta";
import { useT } from "@/i18n/locale";
import { getAccountCuotas, type Invitation } from "@/lib/cuotas";
import { guarantorPath } from "@/lib/roles";

export function InviteGuarantor({ student }: { student: string }) {
  const t = useT(invitacionCuenta);
  const [copied, setCopied] = useState(false);
  // El modo lo fija el cliente de cuentas (NEXT_PUBLIC_CUOTAS_MODE), la misma
  // fuente que decide si createInvitation va al backend o al store local.
  const mode = getAccountCuotas().mode;

  // Sin revalidación por foco/reconexión: en real cada POST firma un token
  // nuevo y el enlace compartido cambiaría debajo del usuario.
  const query = useSWR(
    ["invitacion", student],
    () => getAccountCuotas().createInvitation(student),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  const invitation: Invitation | undefined = query.data;
  // URL absoluta para compartir; el path lo define roles.ts. La invitación
  // solo existe tras fetch en cliente, así `window` siempre está disponible.
  const url =
    invitation && typeof window !== "undefined"
      ? `${window.location.origin}${guarantorPath(invitation.token)}`
      : null;

  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API bloqueada: el enlace queda visible para copiar a mano.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (query.isLoading || (invitation === undefined && !query.error)) {
    return (
      <GlassPanel className="animate-pulse p-6" role="status" aria-busy="true">
        <div className="h-3 w-40 rounded bg-beam/10" />
        <div className="mt-4 h-10 rounded-2xl bg-beam/5" />
      </GlassPanel>
    );
  }

  if (query.error) {
    const code =
      query.error && typeof query.error === "object" && "code" in query.error
        ? String((query.error as { code: unknown }).code)
        : "";
    const pendiente = code === "not_implemented" || code === "demo_only";
    return (
      <GlassPanel className="p-6" role="status">
        <p className="font-medium text-ink">
          {pendiente ? t.pendingTitle : t.error}
        </p>
        {pendiente && (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{t.pendingBody}</p>
        )}
        {!pendiente && (
          <button
            type="button"
            onClick={() => void query.mutate()}
            className={`mt-4 ${buttonClasses("secondary", "sm")}`}
          >
            {t.retry}
          </button>
        )}
      </GlassPanel>
    );
  }

  const waMessage = mode === "mock" ? t.whatsappMessage : t.whatsappMessageReal;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${waMessage} ${url}`)}`;

  return (
    <GlassPanel className="p-6" data-testid="invite-guarantor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{t.title}</p>
          <p className="mt-1 max-w-prose text-sm text-ink-2">{t.body}</p>
        </div>
        <ReferenceTag>{mode === "mock" ? "demo" : "devnet"}</ReferenceTag>
      </div>

      <label className="mt-4 block">
        <span className="text-xs uppercase tracking-wide text-ink-2">{t.linkLabel}</span>
        <input
          readOnly
          value={url ?? ""}
          onFocus={(e) => e.target.select()}
          className="mt-1 w-full rounded-2xl border border-hairline bg-transparent px-4 py-2.5 font-mono text-xs text-ink focus:border-beam focus:outline-none"
          data-testid="invite-link"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void copiar()}
          className={buttonClasses("primary", "sm")}
          data-testid="invite-copy"
        >
          {copied ? t.copied : t.copy}
        </button>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses("secondary", "sm")}
          data-testid="invite-whatsapp"
        >
          {t.whatsapp}
        </a>
      </div>

      <p className="mt-4 max-w-prose text-xs leading-relaxed text-ink-2">
        {mode === "mock" ? t.demoNote : t.realNote}
      </p>
    </GlassPanel>
  );
}
