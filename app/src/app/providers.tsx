"use client";

import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { ClientProvider, useClient } from "@solana/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { SWRConfig } from "swr";
import { LocaleProvider } from "@/i18n/locale";
import {
  DEFAULT_MODE,
  isRealAvailable,
  readStoredMode,
  setActiveMode,
  subscribeCuotasMode,
  switchCuotasMode,
  type CuotasMode,
} from "@/lib/cuotas/mode";
import { bindRealTransport } from "@/lib/cuotas/real";
import { MotionConfig } from "motion/react";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// Un solo cliente para toda la app. Solo devnet.
export const client = createClient()
  .use(walletSigner({ chain: "solana:devnet" }))
  .use(solanaRpc({ rpcUrl, transactionConfig: { version: 1 } }));

export type AppClient = Awaited<typeof client>;

/**
 * Conecta el cliente Kit como transporte del modo real (`real.ts`): el RPC
 * para lecturas y la wallet conectada para firmar. Solo corre en el
 * navegador (efecto); en el servidor no hay transporte y las escrituras
 * reales piden conectar wallet.
 */
function RealTransportBinder() {
  const bound = useClient<AppClient>();
  useEffect(() => bindRealTransport(bound.rpc, bound.wallet), [bound]);
  return null;
}

export interface CuotasModeState {
  /** Modo activo del cliente de cuotas ("mock" demo | "real" devnet). */
  mode: CuotasMode;
  /** El modo real existe en este despliegue (ver `isRealAvailable`). */
  realAvailable: boolean;
  /** Persiste la elección y recarga la app en el modo nuevo. */
  switchMode: (mode: CuotasMode) => void;
}

const CuotasModeContext = createContext<CuotasModeState>({
  mode: DEFAULT_MODE,
  realAvailable: false,
  switchMode: () => {},
});

/** Modo demo/real activo y el switch de runtime (header). */
export function useCuotasMode(): CuotasModeState {
  return useContext(CuotasModeContext);
}

/**
 * Fija el modo activo de `getCuotas()` según la elección persistida. El
 * servidor siempre renderiza el default (snapshot de servidor): la
 * hidratación coincide y el modo guardado toma el mando en el primer render
 * del cliente. `setActiveMode` corre acá, antes de que los hijos llamen
 * `getCuotas()` en su propio render. La `key` remonta el árbol con un cache
 * SWR nuevo por modo: las keys de `useCuotasQuery` no incluyen el modo, así
 * que un cache compartido serviría datos mock en modo real.
 */
function CuotasModeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribeCuotasMode, readStoredMode, () => DEFAULT_MODE);
  setActiveMode(mode);
  const state = useMemo<CuotasModeState>(
    () => ({ mode, realAvailable: isRealAvailable(), switchMode: switchCuotasMode }),
    [mode],
  );
  return (
    <CuotasModeContext.Provider value={state}>
      <SWRConfig key={mode} value={{ provider: () => new Map() }}>
        {children}
      </SWRConfig>
    </CuotasModeContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider client={client}>
      <RealTransportBinder />
      <MotionConfig reducedMotion="user">
        <LocaleProvider>
          <CuotasModeProvider>{children}</CuotasModeProvider>
        </LocaleProvider>
      </MotionConfig>
    </ClientProvider>
  );
}
