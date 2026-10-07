"use client";

import Link from "next/link";
import { common } from "@/i18n/dictionaries/common";
import { audienceCommon } from "@/i18n/dictionaries/audience-common";
import { useT } from "@/i18n/locale";
import { PrismaGlyph } from "./app-header";

/**
 * Footer global: mapa del sitio y la leyenda de que todo es demo en devnet.
 * Apilado en móvil, tres columnas desde sm.
 */
export function SiteFooter() {
  const t = useT(common);
  const a = useT(audienceCommon);

  const explore = [
    { href: "/", label: t.nav.inicio },
    { href: "/comercio", label: t.nav.comercios },
    { href: "/pool", label: t.nav.pool },
    { href: "/app", label: t.nav.cuenta },
  ];
  const how = [
    { href: "/para-estudiantes", label: a.pages.estudiantes.nav },
    { href: "/para-comercios", label: a.pages.comercios.nav },
    { href: "/para-inversores", label: a.pages.inversores.nav },
  ];

  return (
    <footer className="mt-auto border-t border-hairline">
      <div className="page-shell grid gap-8 py-10 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-6">
        <div>
          <Link
            href="/"
            className="app-brand inline-flex items-center gap-2.5 text-lg font-medium tracking-[-0.01em] text-beam"
          >
            <PrismaGlyph className="h-7 w-[2.625rem]" />
            Lazo
          </Link>
          <p className="mt-3 font-num text-measure uppercase tracking-[0.14em] text-ink-3">
            {t.footer.legend}
          </p>
        </div>
        <nav
          aria-label={t.footer.navLabel}
          className="grid gap-8 sm:col-span-2 sm:grid-cols-2 sm:gap-6"
        >
          <div>
            <p className="app-sheet-label !pt-0">{t.footer.explore}</p>
            <ul>
              {explore.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="tap inline-flex items-center py-1 text-sm text-ink-2 transition-colors hover:text-beam"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="app-sheet-label !pt-0">{t.footer.how}</p>
            <ul>
              {how.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="tap inline-flex items-center py-1 text-sm text-ink-2 transition-colors hover:text-beam"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </footer>
  );
}
