"use client";

import { useState } from "react";
import Link from "next/link";
import { common } from "@/i18n/dictionaries/common";
import { design } from "@/i18n/dictionaries/design";
import { useLocale, useT } from "@/i18n/locale";
import { ChipButton, SegmentedControl } from "@/components/ui/chip";
import { DevnetBadge } from "@/components/ui/badges";
import { WalletButton } from "./wallet-button";

/** Marca: un haz blanco entra al prisma y sale como espectro. */
function PrismaGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 30 20"
      fill="none"
      strokeLinecap="round"
      className={className}
    >
      <path d="M0.5 10H7.5" stroke="var(--color-beam)" strokeWidth="1.4" />
      <path
        d="M12.5 2.5 20 16.5H5L12.5 2.5Z"
        stroke="var(--color-beam)"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M15.5 9.5 29 5.5" stroke="var(--color-violet)" strokeWidth="1.4" />
      <path d="M15.8 11.5 29 10.5" stroke="var(--color-cyan)" strokeWidth="1.4" />
      <path d="M15.5 13.5 29 15.5" stroke="var(--color-green)" strokeWidth="1.4" />
    </svg>
  );
}

function LocaleSwitch() {
  // useLocale ya devuelve "es" en el servidor y en la hidratación.
  const { locale: active, setLocale } = useLocale();
  return (
    <SegmentedControl
      label="ES / EN"
      value={active}
      onChange={setLocale}
      options={[
        { value: "es", label: "ES" },
        { value: "en", label: "EN" },
      ]}
    />
  );
}

export function AppHeader() {
  const t = useT(common);
  const d = useT(design);
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/tienda", label: t.nav.tienda },
    { href: "/panel", label: t.nav.panel },
    { href: "/comercio", label: t.nav.comercio },
    { href: "/pool", label: t.nav.pool },
    { href: "/design", label: d.chrome.designLink },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="glass-deep">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[1.375rem] font-medium tracking-[-0.01em] text-beam"
            onClick={() => setOpen(false)}
          >
            <PrismaGlyph className="h-5 w-[1.875rem]" />
            Lazo
          </Link>
          <nav aria-label={d.chrome.navLabel} className="hidden items-center gap-5 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-num text-measure uppercase text-ink-2 transition-colors hover:text-beam"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <DevnetBadge />
            <span className="hidden sm:block">
              <LocaleSwitch />
            </span>
            <span className="hidden md:block">
              <WalletButton />
            </span>
            <ChipButton
              className="md:hidden"
              aria-expanded={open}
              aria-label={open ? d.chrome.menuClose : d.chrome.menuOpen}
              onClick={() => setOpen((v) => !v)}
            >
              <svg
                aria-hidden
                viewBox="0 0 16 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                className="h-3 w-4"
              >
                {open ? (
                  <>
                    <path d="M2.5 1.5 13.5 10.5" />
                    <path d="M13.5 1.5 2.5 10.5" />
                  </>
                ) : (
                  <>
                    <path d="M1 2h14" />
                    <path d="M1 6h14" />
                    <path d="M1 10h14" />
                  </>
                )}
              </svg>
            </ChipButton>
          </div>
        </div>
        <hr className="beam-line" />
      </div>
      {open && (
        <div className="glass glass-deep mx-4 mt-2 p-4 md:hidden">
          <nav aria-label={d.chrome.navLabel} className="flex flex-col">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-beam/5 py-3 font-num text-sm uppercase tracking-[0.14em] text-ink-2 last:border-0 hover:text-beam"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between gap-3">
            <LocaleSwitch />
            <WalletButton />
          </div>
        </div>
      )}
    </header>
  );
}
