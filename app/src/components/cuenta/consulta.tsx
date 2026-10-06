"use client";

// Estados de lectura compartidos por las pantallas de comercio y pool:
// carga, pendiente (not_implemented), no encontrado, error con reintento y
// vacío honesto. El vidrio y las marcas vienen del sistema Prisma.
import type { ReactNode } from "react";
import type { SWRResponse } from "swr";
import { buttonClasses } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass";
import { StateMark } from "@/components/ui/state-mark";
import { CuotasError, type UnixSeconds } from "@/lib/cuotas";

export const shortAddr = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export const fmtFecha = (at: UnixSeconds, locale: "es" | "en") =>
  new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at * 1000);

/** Fracción 0–1 como porcentaje con un decimal. */
export const fmtPct01 = (v: number, locale: "es" | "en") =>
  new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v);

interface EstadoTextos {
  pendienteTitle: string;
  pendienteBody: string;
  errorTitle: string;
  errorBody: string;
  reintentar: string;
}

/** Panel de estado honesto: pendiente, no encontrado o error, con reintento. */
export function EstadoConsulta({
  tono,
  title,
  body,
  onRetry,
  reintentar,
  testId,
}: {
  tono: "pendiente" | "error" | "vacio";
  title: string;
  body: string;
  onRetry?: () => void;
  reintentar: string;
  testId: string;
}) {
  return (
    <GlassPanel
      data-testid={testId}
      className="px-5 py-6"
      role={tono === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        <StateMark state={tono === "error" ? "cracked" : "dim"} className="mt-1" />
        <div className="min-w-0">
          <p className={`font-medium ${tono === "error" ? "text-crack" : "text-ink"}`}>{title}</p>
          {body ? <p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p> : null}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`mt-4 ${buttonClasses("secondary", "sm")}`}
            >
              {reintentar}
            </button>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

/** Vidrio en pulso mientras la consulta está en vuelo. */
export function ConsultaCargando() {
  return (
    <GlassPanel className="animate-pulse px-5 py-6" role="status" aria-busy="true">
      <div className="h-3 w-32 rounded bg-beam/10" />
      <div className="mt-4 h-8 w-48 rounded bg-beam/10" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-beam/5" />
        <div className="h-3 w-3/4 rounded bg-beam/5" />
      </div>
    </GlassPanel>
  );
}

/**
 * Resuelve una `useCuotasQuery` a su estado visual. `pendienteTestId` marca el
 * estado `not_implemented` para las pruebas de ruta pública; `noEncontrado`
 * da el copy específico de `not_found` cuando aplica.
 */
export function Consulta<T>({
  res,
  textos,
  pendienteTestId,
  noEncontrado,
  children,
}: {
  res: SWRResponse<T>;
  textos: EstadoTextos;
  pendienteTestId: string;
  noEncontrado?: { title: string; body: string };
  children: (data: T) => ReactNode;
}) {
  const { data, error, isLoading, mutate } = res;
  if (error) {
    const code = error instanceof CuotasError ? error.code : undefined;
    if (code === "not_implemented") {
      return (
        <EstadoConsulta
          testId={pendienteTestId}
          tono="pendiente"
          title={textos.pendienteTitle}
          body={textos.pendienteBody}
          onRetry={() => void mutate()}
          reintentar={textos.reintentar}
        />
      );
    }
    if (code === "not_found") {
      return (
        <EstadoConsulta
          testId={`${pendienteTestId}-404`}
          tono="vacio"
          title={noEncontrado?.title ?? textos.pendienteTitle}
          body={noEncontrado?.body ?? textos.pendienteBody}
          reintentar={textos.reintentar}
        />
      );
    }
    return (
      <EstadoConsulta
        testId={`${pendienteTestId}-error`}
        tono="error"
        title={textos.errorTitle}
        body={textos.errorBody}
        onRetry={() => void mutate()}
        reintentar={textos.reintentar}
      />
    );
  }
  if (isLoading || data === undefined) return <ConsultaCargando />;
  return children(data);
}
