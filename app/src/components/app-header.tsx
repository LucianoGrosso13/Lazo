"use client";

import Link from "next/link";
import { common } from "@/i18n/dictionaries/common";
import { useLocale, useT } from "@/i18n/locale";
import { WalletButton } from "./wallet-button";

// Shell provisorio: el ticket del sistema de diseño lo rediseña.
export function AppHeader() {
  const t = useT(common);
  const { locale, setLocale } = useLocale();
  return (
    <header className="flex items-center gap-6 px-6 py-4">
      <Link href="/" className="text-xl font-semibold tracking-tight">Lazo</Link>
      <nav className="flex gap-4 text-sm">
        <Link href="/tienda">{t.nav.tienda}</Link>
        <Link href="/panel">{t.nav.panel}</Link>
        <Link href="/comercio">{t.nav.comercio}</Link>
        <Link href="/pool">{t.nav.pool}</Link>
      </nav>
      <div className="ml-auto flex items-center gap-3 text-sm">
        <span title={t.devnetHint} className="rounded-full border px-3 py-1">{t.devnet}</span>
        <button type="button" onClick={() => setLocale(locale === "es" ? "en" : "es")} aria-label="ES / EN">
          {locale === "es" ? "EN" : "ES"}
        </button>
        <WalletButton />
      </div>
    </header>
  );
}
