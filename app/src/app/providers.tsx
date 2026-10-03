"use client";

import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { ClientProvider } from "@solana/react";
import { LocaleProvider } from "@/i18n/locale";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// Un solo cliente para toda la app. Solo devnet.
export const client = createClient()
  .use(walletSigner({ chain: "solana:devnet" }))
  .use(solanaRpc({ rpcUrl, transactionConfig: { version: 1 } }));

export type AppClient = Awaited<typeof client>;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider client={client}>
      <LocaleProvider>{children}</LocaleProvider>
    </ClientProvider>
  );
}
