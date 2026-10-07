"use client";

import { audienceCommon } from "@/i18n/dictionaries/audience-common";
import { useT } from "@/i18n/locale";
import { AudienceHero } from "./primitives";

/**
 * Contenido de /para-estudiantes — PLACEHOLDER del ticket 03.
 * El ticket 09 reemplaza este archivo entero: compone las primitivas de
 * `./primitives` con los textos de su propio diccionario.
 */
export function ParaEstudiantes() {
  const t = useT(audienceCommon);
  const page = t.pages.estudiantes;
  return (
    <div className="page-shell py-12 sm:py-16">
      <AudienceHero eyebrow={page.eyebrow} title={page.title} lede={page.lede} />
      <p className="mt-10 max-w-xl rounded-xl border border-dashed border-hairline px-4 py-3 text-sm text-ink-3">
        {t.wip}
      </p>
    </div>
  );
}
