"use client";

// Estado compartido de la cuenta activa: wallet conectada o identidad de
// ejemplo persistida (solo mock). La detección de rol delega en
// `getAccountCuotas().resolveAccount` vía SWR y se revalida con `subscribe`;
// el selector nunca concede permisos.
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import useSWR from "swr";
import { useWalletAddress } from "@/components/wallet-button";
import {
  DEMO_STUDENT_NEW,
  getAccountCuotas,
  getCuotas,
  type ResolvedAccount,
  type StudentBalance,
  type WalletAddress,
} from "@/lib/cuotas";
import {
  DEMO_ACCOUNT_ADDRESSES,
  readDemoSelection,
  readLastStudent,
  resetDemoUiState,
  subscribeDemoSelection,
  subscribeLastStudent,
  writeDemoSelection,
  writeLastStudent,
  type DemoAccountId,
} from "@/lib/roles";

export type AccountStatus = "idle" | "resolving" | "ready" | "error";

export interface AccountContextValue {
  mode: "mock" | "real";
  /** Wallet realmente conectada (Kit/Wallet Standard). */
  walletAddress: WalletAddress | null;
  /** Identidad de ejemplo elegida en el selector (persistida, solo mock). */
  demoId: DemoAccountId | null;
  /** Dirección efectiva a la que se le detecta el rol. */
  address: WalletAddress | null;
  account: ResolvedAccount | null;
  balance: StudentBalance | null;
  status: AccountStatus;
  /** Código de error de `AccountCuotasError` cuando `status === "error"`. */
  errorCode: string | null;
  selectDemo: (id: DemoAccountId | null) => void;
  /** Reinicia la demo: estado financiero (base), invitaciones y selección. */
  resetDemo: () => Promise<void>;
  refresh: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

/**
 * Puente público de identidad de estudiante: lo puede importar el checkout
 * (u otra pantalla) sin `<AccountProvider>`. En real gana la wallet conectada;
 * en mock manda la selección demo estudiante, después la wallet, después el
 * último estudiante del recorrido y por último el estudiante nuevo explícito.
 * Devuelve `null` solo en real sin wallet: ahí no hay estudiante que fingir.
 */
export function useStudentAddress(): WalletAddress | null {
  const mode = getCuotas().mode;
  const wallet = useWalletAddress();
  const storedDemo = useSyncExternalStore(subscribeDemoSelection, readDemoSelection, () => null);
  const lastStudent = useSyncExternalStore(subscribeLastStudent, readLastStudent, () => null);

  if (mode === "real") return wallet;
  const demo = storedDemo;
  if (demo === "student-new" || demo === "student-tier3") {
    return DEMO_ACCOUNT_ADDRESSES[demo];
  }
  return wallet ?? lastStudent ?? DEMO_STUDENT_NEW;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const mode = getCuotas().mode;
  const walletAddress = useWalletAddress();
  const storedDemo = useSyncExternalStore(subscribeDemoSelection, readDemoSelection, () => null);
  const demoId = mode === "mock" ? storedDemo : null;

  const selectDemo = useCallback(
    (id: DemoAccountId | null) => {
      if (mode === "mock") writeDemoSelection(id);
    },
    [mode],
  );

  const resetDemo = useCallback(async () => {
    // El cliente limpia metadata financiera + invitaciones; la UI la suya.
    await getAccountCuotas().resetDemo();
    resetDemoUiState();
  }, []);

  const address: WalletAddress | null =
    demoId && demoId !== "guarantor" ? DEMO_ACCOUNT_ADDRESSES[demoId] : walletAddress;

  const accountQuery = useSWR(
    address ? ["account", address] : null,
    ([, addr]: [string, WalletAddress]) => getAccountCuotas().resolveAccount(addr),
  );
  const { mutate: revalidate } = accountQuery;
  useEffect(() => getAccountCuotas().subscribe(() => void revalidate()), [revalidate]);

  const account = accountQuery.data ?? null;
  const balanceQuery = useSWR(
    account?.role === "student" ? ["balance", account.address] : null,
    ([, addr]: [string, WalletAddress]) => getAccountCuotas().getBalance(addr),
  );

  // El estudiante del recorrido se recuerda para fiador/checkout: cuando la
  // identidad efectiva resuelve como estudiante queda como "último visto".
  useEffect(() => {
    if (account?.role === "student") writeLastStudent(account.address);
  }, [account]);

  const status: AccountStatus = !address
    ? "idle"
    : accountQuery.error
      ? "error"
      : account
        ? "ready"
        : "resolving";

  const errorCode =
    accountQuery.error && typeof accountQuery.error === "object" && "code" in accountQuery.error
      ? String((accountQuery.error as { code: unknown }).code)
      : accountQuery.error
        ? "unavailable"
        : null;

  const value = useMemo<AccountContextValue>(
    () => ({
      mode,
      walletAddress,
      demoId,
      address,
      account,
      balance: balanceQuery.data ?? null,
      status,
      errorCode,
      selectDemo,
      resetDemo,
      refresh: () => void revalidate(),
    }),
    [
      mode,
      walletAddress,
      demoId,
      address,
      account,
      balanceQuery.data,
      status,
      errorCode,
      selectDemo,
      resetDemo,
      revalidate,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount requiere <AccountProvider>");
  return ctx;
}
