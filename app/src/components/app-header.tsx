"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { common } from "@/i18n/dictionaries/common";
import { design } from "@/i18n/dictionaries/design";
import { audienceCommon } from "@/i18n/dictionaries/audience-common";
import { useLocale, useT } from "@/i18n/locale";
import { ChipButton, SegmentedControl } from "@/components/ui/chip";
import { WalletButton } from "./wallet-button";

/**
 * Marca 3D del prisma: render HyperFrames commiteado en /public/brand
 * (composición reproducible en .scratch/demo-polish/brand). PNG RGBA, el
 * header siempre va sobre fondo oscuro. Decorativa: el texto "Lazo" ya nombra.
 */
export function PrismaGlyph({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-prisma.png"
      alt=""
      aria-hidden
      width={480}
      height={320}
      priority
      className={className}
    />
  );
}

function LocaleSwitch() {
  // useLocale devuelve "en" en el servidor y en la hidratación.
  const { locale: active, setLocale } = useLocale();
  return (
    <SegmentedControl
      label="ES / EN"
      value={active}
      onChange={setLocale}
      className="flex-nowrap"
      options={[
        { value: "en", label: "EN" },
        { value: "es", label: "ES" },
      ]}
    />
  );
}

const MotionLink = motion.create(Link);

/**
 * La cinta de destinos: cada entrada tiene su banda del espectro y el
 * marcador activo es el prisma que la refracta (se desliza con layoutId).
 */
const DEMO_DESTINATIONS = [
  {
    key: "tienda",
    href: "/tienda",
    band: "#9945FF",
    match: (p: string) => p.startsWith("/tienda") || p.startsWith("/checkout"),
  },
  {
    key: "comercios",
    href: "/comercio",
    band: "#00C2FF",
    match: (p: string) => p.startsWith("/comercio"),
  },
  {
    key: "cuenta",
    href: "/app",
    band: "#6C63FF",
    match: (p: string) =>
      p.startsWith("/app") || p.startsWith("/panel") || p.startsWith("/fiador"),
  },
  {
    key: "pool",
    href: "/pool",
    band: "#19FB9B",
    match: (p: string) => p === "/pool",
  },
] as const;

/** "Cómo funciona ▾": una página por audiencia, en el dropdown y en la hoja. */
const HOW_DESTINATIONS = [
  {
    key: "estudiantes",
    href: "/para-estudiantes",
    band: "#00C2FF",
    match: (p: string) => p.startsWith("/para-estudiantes"),
  },
  {
    key: "comercios",
    href: "/para-comercios",
    band: "#19FB9B",
    match: (p: string) => p.startsWith("/para-comercios"),
  },
  {
    key: "inversores",
    href: "/para-inversores",
    band: "#c4a3ff",
    match: (p: string) => p.startsWith("/para-inversores"),
  },
] as const;

const MORE_DESTINATIONS = [
  { key: "how", href: "/#how", band: "#f4f1ff", match: () => false },
  { key: "design", href: "/design", band: "#c4a3ff", match: (p: string) => p === "/design" },
] as const;

type NavItem = {
  key: string;
  href: string;
  band: string;
  label: string;
  match: (p: string) => boolean;
};

function isActive(href: string, match: (p: string) => boolean, pathname: string) {
  return match(pathname) || (href === pathname && !href.includes("#"));
}

/** El prisma que refracta el destino activo: haz en su banda + faceta. */
function SpectralMarker({ layoutId, band }: { layoutId: string; band: string }) {
  const reduceMotion = useReducedMotion();
  const marker = <span aria-hidden className="app-nav-marker" style={{ ["--band" as string]: band }} />;
  return reduceMotion
    ? marker
    : (
        <motion.span
          aria-hidden
          className="app-nav-marker"
          style={{ ["--band" as string]: band }}
          layoutId={layoutId}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        />
      );
}

/** Entrada directa de la cinta de destinos (escritorio). */
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item.href, item.match, pathname);
  return (
    <Link
      href={item.href}
      className="app-nav-item"
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      style={{ ["--band" as string]: item.band }}
    >
      {active ? <SpectralMarker layoutId="nav-marker" band={item.band} /> : null}
      {item.label}
    </Link>
  );
}

/**
 * Dropdown de la cinta (Cómo funciona, Más): teclado (abre con ↓, cierra con
 * Escape devolviendo el foco), click afuera y blur fuera del menú. Cuando un
 * destino suyo está activo, el prisma lo marca igual que a los links.
 */
function NavMenu({
  label,
  band = "#f4f1ff",
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  band?: string;
  items: readonly NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const anyActive = items.some((i) => isActive(i.href, i.match, pathname));

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div
      ref={wrap}
      className="app-menu"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="app-menu-trigger"
        data-active={anyActive || undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        style={{ ["--band" as string]: band }}
      >
        {anyActive ? <SpectralMarker layoutId="nav-marker" band={band} /> : null}
        {label}
        <svg
          aria-hidden
          viewBox="0 0 10 6"
          className="app-menu-chev"
          data-open={open || undefined}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1.2 5 4.8 9 1.2" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            className="app-menu-panel glass glass-deep"
            initial={{ opacity: reduceMotion ? 1 : 0, filter: reduceMotion ? "none" : "blur(4px)", y: reduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: reduceMotion ? 1 : 0, filter: reduceMotion ? "none" : "blur(3px)", y: reduceMotion ? 0 : -3 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="app-menu-item"
                  data-active={isActive(item.href, item.match, pathname) || undefined}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  <span aria-hidden className="app-band-dot" style={{ ["--band" as string]: item.band }} />
                  {item.label}
                </Link>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AppHeader() {
  const t = useT(common);
  const d = useT(design);
  const a = useT(audienceCommon);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const demoLabels: Record<string, string> = {
    tienda: t.nav.tienda,
    comercios: t.nav.comercios,
    cuenta: t.nav.cuenta,
    pool: t.nav.pool,
  };
  const howLabels: Record<string, string> = {
    estudiantes: a.pages.estudiantes.nav,
    comercios: a.pages.comercios.nav,
    inversores: a.pages.inversores.nav,
  };
  const moreLabels: Record<string, string> = {
    how: d.chrome.howItWorks,
    design: d.chrome.designLink,
  };
  const demoNav: NavItem[] = DEMO_DESTINATIONS.map((i) => ({ ...i, label: demoLabels[i.key] }));
  const howNav: NavItem[] = HOW_DESTINATIONS.map((i) => ({ ...i, label: howLabels[i.key] }));
  const moreNav: NavItem[] = MORE_DESTINATIONS.map((i) => ({ ...i, label: moreLabels[i.key] }));

  // La hoja se cierra al navegar (cualquier cambio de ruta) y con Escape.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sheetGroups = [
    { key: "demo", label: d.chrome.groupDemo, items: demoNav },
    { key: "how", label: d.chrome.groupHow, items: howNav },
    { key: "more", label: d.chrome.groupMore, items: moreNav },
  ];
  let sheetIndex = 0;

  return (
    <header className="sticky top-0 z-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-beam focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-abyss"
      >
        {t.skipToContent}
      </a>
      <div className="glass-deep">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-5 sm:px-6">
          <Link
            href="/"
            className="app-brand flex items-center gap-2.5 text-[1.375rem] font-medium tracking-[-0.01em] text-beam"
            onClick={() => setOpen(false)}
          >
            <PrismaGlyph className="h-9 w-[3.375rem]" />
            Lazo
          </Link>

          <nav aria-label={d.chrome.navLabel} className="app-nav hidden lg:inline-flex">
            {demoNav.slice(0, 2).map((item) => (
              <NavLink key={item.key} item={item} pathname={pathname} />
            ))}
            <NavMenu
              label={a.navLabel}
              items={howNav}
              pathname={pathname}
            />
            {demoNav.slice(2).map((item) => (
              <NavLink key={item.key} item={item} pathname={pathname} />
            ))}
            <NavMenu
              label={d.chrome.more}
              items={moreNav}
              pathname={pathname}
            />
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block">
              <LocaleSwitch />
            </span>
            <span className="hidden xl:block">
              <WalletButton />
            </span>
            <ChipButton
              className="tap justify-center xl:hidden"
              aria-expanded={open}
              aria-controls="app-nav-sheet"
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
        <div className="beam-line" aria-hidden>
          <span className="beam-scan" />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ opacity: reduceMotion ? 1 : 0, filter: reduceMotion ? "none" : "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: reduceMotion ? 1 : 0, filter: reduceMotion ? "none" : "blur(3px)" }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
            id="app-nav-sheet"
            className="glass glass-deep mx-4 mt-2 p-4 xl:hidden"
          >
            <nav aria-label={d.chrome.navLabel} className="flex flex-col">
              {sheetGroups.map((group) => (
                <div key={group.key}>
                  <p className="app-sheet-label">{group.label}</p>
                  {group.items.map((item) => {
                    const active = isActive(item.href, item.match, pathname);
                    const index = sheetIndex++;
                    return (
                      <MotionLink
                        key={item.key}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="app-sheet-link"
                        data-active={active || undefined}
                        aria-current={active ? "page" : undefined}
                        style={{ ["--band" as string]: item.band }}
                        initial={{ opacity: reduceMotion ? 1 : 0.55 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : index * 0.035 }}
                        whileTap={reduceMotion ? undefined : { color: item.band }}
                      >
                        <span aria-hidden className="app-band-dot" style={{ ["--band" as string]: item.band }} />
                        {item.label}
                      </MotionLink>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="mt-4 flex items-center justify-between gap-3">
              <LocaleSwitch />
              <WalletButton />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
