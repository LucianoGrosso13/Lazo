"use client";

import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useWallets,
  WalletReadyGate,
} from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { useSyncExternalStore } from "react";
import type { AppClient } from "@/app/providers";
import { common } from "@/i18n/dictionaries/common";
import { useT } from "@/i18n/locale";
import { buttonClasses } from "@/components/ui/button";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

function WalletButtonInner() {
  const client = useClient<AppClient>();
  const t = useT(common).wallet;
  const wallets = useWallets(client);
  const connected = useConnectedWallet(client);
  const { dispatch: connect } = useConnect(client);
  const { dispatch: disconnect } = useDisconnect(client);

  if (connected) {
    return (
      <button
        type="button"
        className={buttonClasses("secondary", "sm")}
        onClick={() => disconnect()}
        title={t.disconnect}
      >
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_6px_var(--color-green)]"
        />
        <span className="font-num text-[0.8125rem]">{short(connected.account.address)}</span>
      </button>
    );
  }
  if (wallets.length === 0) {
    return (
      <a
        className={buttonClasses("secondary", "sm")}
        href="https://phantom.com/download"
        target="_blank"
        rel="noreferrer"
      >
        {t.none}
      </a>
    );
  }
  const preferred = wallets.find((w) => w.name === "Phantom") ?? wallets[0];
  return (
    <button
      type="button"
      className={buttonClasses("secondary", "sm")}
      onClick={() => connect(preferred)}
    >
      {t.connect}
    </button>
  );
}

const noopSubscribe = () => () => {};

export function WalletButton() {
  const client = useClient<AppClient>();
  const t = useT(common).wallet;
  // La detección de wallets solo existe en el navegador: en el servidor y en la
  // hidratación se muestra el estado de carga para que el HTML coincida.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <span className="wallet-btn opacity-60">{t.loading}</span>;
  return (
    <WalletReadyGate
      client={client}
      fallback={<span className={`${buttonClasses("ghost", "sm")} opacity-60`}>{t.loading}</span>}
    >
      <WalletButtonInner />
    </WalletReadyGate>
  );
}

/** Dirección de la wallet conectada, o null. Para las pantallas que la necesitan. */
export function useWalletAddress(): string | null {
  const client = useClient<AppClient>();
  return useConnectedWallet(client)?.account.address ?? null;
}
