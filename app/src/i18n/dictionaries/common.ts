import { defineDict } from "../locale";

export const common = defineDict({
  es: {
    tagline: "Cuotas sin interés, respaldadas por tu familia.",
    nav: { tienda: "Tienda", panel: "Mi plan", comercio: "Comercio", pool: "Pool" },
    devnet: "Devnet · plata de prueba",
    devnetHint: "Corre en devnet, la red de prueba de Solana: el USDC es de mentira y no vale nada.",
    wallet: {
      connect: "Conectar wallet",
      connectWith: "Conectar con",
      disconnect: "Desconectar",
      loading: "Buscando wallets…",
      none: "Instalá Phantom para seguir",
      v1Warning: "Actualizá tu wallet para firmar transacciones v1.",
    },
  },
  en: {
    tagline: "Zero-interest installments, backed by family.",
    nav: { tienda: "Store", panel: "My plan", comercio: "Merchant", pool: "Pool" },
    devnet: "Devnet · test money",
    devnetHint: "Runs on devnet, Solana's test network: the USDC is fake and worth nothing.",
    wallet: {
      connect: "Connect wallet",
      connectWith: "Connect with",
      disconnect: "Disconnect",
      loading: "Looking for wallets…",
      none: "Install Phantom to continue",
      v1Warning: "Update your wallet to sign v1 transactions.",
    },
  },
});
