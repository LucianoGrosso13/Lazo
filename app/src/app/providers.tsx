"use client";

import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { ClientProvider, useClient } from "@solana/react";
import { useEffect } from "react";
import { LocaleProvider } from "@/i18n/locale";
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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider client={client}>
      <RealTransportBinder />
      <MotionConfig reducedMotion="user">
        <LocaleProvider>{children}</LocaleProvider>
      </MotionConfig>
    </ClientProvider>
  );
}
