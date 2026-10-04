"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

export type Locale = "es" | "en";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void };
const DEFAULT_LOCALE: Locale = "en";
const LocaleContext = createContext<Ctx>({ locale: DEFAULT_LOCALE, setLocale: () => {} });
const STORAGE_KEY = "lazo.locale";

const localeListeners = new Set<() => void>();
function subscribeLocale(cb: () => void) {
  localeListeners.add(cb);
  return () => localeListeners.delete(cb);
}
function readLocale(): Locale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "es" ? "es" : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Storage bloqueado: la preferencia vive solo en memoria.
    }
    localeListeners.forEach((cb) => cb());
  }, []);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

/** Diccionario por pantalla: un archivo por ruta en `dictionaries/` para no pisarse entre ramas. */
export type Dict<T> = { es: T; en: T };
export const defineDict = <T,>(d: Dict<T>) => d;

export function useT<T>(dict: Dict<T>): T {
  return dict[useLocale().locale];
}
