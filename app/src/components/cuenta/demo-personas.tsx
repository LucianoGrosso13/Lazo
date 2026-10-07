"use client";

// Selector de identidades de la demo con descripción por rol: la misma lista
// sirve a la entrada /app (elegir con qué recorrer) y al fallback de las
// cuentas cuando no hay identidad resuelta. Cada persona lleva la banda del
// espectro de su rol — el garante va en backlight, la luz de atrás que
// rellena. Es solo recorrido: nunca autoriza operaciones reales.
import { useRouter } from "next/navigation";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useT } from "@/i18n/locale";
import { DEMO_ACCOUNT_IDS, DEMO_ROUTES, type DemoAccountId } from "@/lib/roles";
import { useAccount } from "./account-context";

const PERSONA_BAND: Record<DemoAccountId, string> = {
  "student-new": "#00C2FF",
  "student-tier3": "#19FB9B",
  merchant: "#9945FF",
  admin: "#F4F1FF",
  guarantor: "#C4A3FF",
};

export function DemoPersonaList({
  testIdPrefix = "demo-persona",
}: {
  testIdPrefix?: string;
}) {
  const t = useT(cuentas);
  const router = useRouter();
  const { demoId, selectDemo } = useAccount();

  const elegir = (id: DemoAccountId) => {
    const next = demoId === id ? null : id;
    selectDemo(next);
    if (next) router.push(DEMO_ROUTES[next]);
  };

  return (
    <ul aria-label={t.student.pickDemo}>
      {DEMO_ACCOUNT_IDS.map((id) => {
        const active = demoId === id;
        return (
          <li key={id} className="border-t border-hairline last:border-b">
            <button
              type="button"
              data-testid={`${testIdPrefix}-${id}`}
              data-active={active || undefined}
              aria-pressed={active}
              onClick={() => elegir(id)}
              style={{ ["--band" as string]: PERSONA_BAND[id] }}
              className="group flex w-full items-center gap-4 px-1 py-4 text-left transition-colors hover:bg-beam/[0.03]"
            >
            <span
              aria-hidden
              className="app-band-dot transition-opacity group-hover:opacity-100"
              style={{ opacity: active ? 1 : 0.35 }}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink transition-colors group-hover:text-beam">
                {t.shell.demoOptions[id]}
              </span>
              <span className="mt-0.5 block text-sm text-ink-2">
                {t.student.personas[id]}
              </span>
            </span>
            <span
              aria-hidden
              className="shrink-0 text-ink-ghost transition-all group-hover:translate-x-0.5 group-hover:text-beam"
            >
              <svg viewBox="0 0 20 20" width="18" height="18">
                <path
                  d="M7 4l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
