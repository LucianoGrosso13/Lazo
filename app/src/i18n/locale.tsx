"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

export type Locale = "es" | "en";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void };
const LocaleContext = createContext<Ctx>({ locale: "es", setLocale: () => {} });
const STORAGE_KEY = "lazo.locale";

const localeListeners = new Set<() => void>();
function subscribeLocale(cb: () => void) {
  localeListeners.add(cb);
  return () => localeListeners.delete(cb);
}
function readLocale(): Locale {
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => "es" as Locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, l);
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
