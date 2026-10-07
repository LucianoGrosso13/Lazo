"use client";

// /comercio — marketplace de comercios demo: buscador (nombre, producto o
// categoría, sin tildes ni mayúsculas), chips de categoría con scroll
// contenido, grilla de tarjetas, estado vacío y aviso "comercios de
// ejemplo". Filtros espejados en la URL (?q=&cat=) para compartir; el
// resultado se anuncia con aria-live. Si la búsqueda es una dirección
// base58, ofrece abrir la vista pública del comercio por dirección.
import { isAddress } from "@solana/kit";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/glass";
import { StateMark } from "@/components/ui/state-mark";
import { ChipButton } from "@/components/ui/chip";
import { buttonClasses } from "@/components/ui/button";
import { marketplace } from "@/i18n/dictionaries/marketplace";
import { useLocale, useT } from "@/i18n/locale";
import {
  CATEGORIES,
  getCategory,
  searchMerchants,
  type CategoryId,
} from "@/lib/merchants";
import { MerchantCard } from "./merchant-card";
import styles from "./marketplace.module.css";

const toCategory = (v: string | null): CategoryId | null =>
  v && getCategory(v) ? (v as CategoryId) : null;

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={styles.searchIcon}
    >
      <circle cx="7" cy="7" r="4.8" />
      <path d="M10.6 10.6 14 14" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      className="h-3 w-3"
    >
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  );
}

export function MarketplacePage() {
  const t = useT(marketplace);
  const { locale } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // La URL manda: ?q=&cat= son la fuente compartible. El estado local copia
  // lo que traiga la URL (primera carga, atrás/adelante, link pegado) con el
  // patrón de ajuste durante el render — no con un efecto.
  const urlQ = searchParams.get("q") ?? "";
  const urlCat = toCategory(searchParams.get("cat"));
  const [q, setQ] = useState(urlQ);
  const [cat, setCat] = useState<CategoryId | null>(urlCat);
  const [prevUrl, setPrevUrl] = useState({ q: urlQ, cat: urlCat });

  if (urlQ !== prevUrl.q || urlCat !== prevUrl.cat) {
    setPrevUrl({ q: urlQ, cat: urlCat });
    // No pisar lo que se está escribiendo si solo cambia el espacio final.
    setQ((prev) => (prev.trim() === urlQ ? prev : urlQ));
    setCat(urlCat);
  }

  // Estado → URL, con un debounce corto y sin recargar (history nativo se
  // integra con useSearchParams; replaceState no ensucia el historial).
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      const trimmed = q.trim();
      if (trimmed) params.set("q", trimmed);
      if (cat) params.set("cat", cat);
      const next = params.toString();
      if (next !== searchParams.toString()) {
        window.history.replaceState(
          null,
          "",
          next ? `${pathname}?${next}` : pathname,
        );
      }
    }, 220);
    return () => clearTimeout(timeout);
  }, [q, cat, pathname, searchParams]);

  const results = useMemo(
    () => searchMerchants({ q, categoryId: cat }),
    [q, cat],
  );
  const addressQuery = isAddress(q.trim()) ? q.trim() : null;
  const filtering = q.trim() !== "" || cat !== null;
  const clearFilters = () => {
    setQ("");
    setCat(null);
  };

  return (
    <div className={styles.page} data-testid="marketplace">
      <header>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lede}>{t.lede}</p>
      </header>

      <search aria-label={t.searchLabel} className={styles.search}>
        <label htmlFor="marketplace-q" className={styles.searchLabel}>
          {t.searchLabel}
        </label>
        <div className={styles.searchBox}>
          <SearchIcon />
          <input
            id="marketplace-q"
            data-testid="marketplace-q"
            type="search"
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={styles.searchInput}
          />
          {q !== "" ? (
            <button
              type="button"
              className={styles.searchClear}
              aria-label={t.searchClear}
              onClick={() => setQ("")}
            >
              <ClearIcon />
            </button>
          ) : null}
        </div>
      </search>

      <div
        role="group"
        aria-label={t.categoriesLabel}
        className={styles.rail}
      >
        <ChipButton on={cat === null} onClick={() => setCat(null)}>
          {t.allCategories}
        </ChipButton>
        {CATEGORIES.map((c) => (
          <ChipButton
            key={c.id}
            on={cat === c.id}
            onClick={() => setCat(cat === c.id ? null : c.id)}
          >
            {c.label[locale]}
          </ChipButton>
        ))}
      </div>

      <p className={styles.count} role="status" aria-live="polite">
        <b>{results.length}</b> {t.resultsWord(results.length)}
      </p>

      {addressQuery ? (
        <div className={styles.addrRow}>
          <span>{t.addressDetected}</span>
          <Link
            href={`/comercio/${addressQuery}`}
            className={buttonClasses("secondary", "sm")}
          >
            {t.addressDetectedCta}
          </Link>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className={styles.grid}>
          {results.map((m) => (
            <MerchantCard key={m.address} merchant={m} />
          ))}
        </div>
      ) : addressQuery ? null : (
        <GlassPanel className={styles.empty} data-testid="marketplace-empty">
          <StateMark state="dim" />
          <p className={styles.emptyTitle}>{t.emptyTitle}</p>
          <p className={styles.emptyBody}>{t.emptyBody}</p>
          {filtering ? (
            <button
              type="button"
              onClick={clearFilters}
              className={`${buttonClasses("secondary", "sm")} mt-2`}
            >
              {t.clearFilters}
            </button>
          ) : null}
        </GlassPanel>
      )}

      <p className={styles.notice}>
        <span className="ref-tag">{t.demoTag}</span>
        {t.notice}
      </p>
      <p className={styles.foot}>{t.foot}</p>
    </div>
  );
}
