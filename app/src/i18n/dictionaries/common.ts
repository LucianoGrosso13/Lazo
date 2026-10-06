import { defineDict } from "../locale";

export const common = defineDict({
  es: {
    tagline: "Crédito para el comercio. Sin interés. Con respaldo familiar.",
    skipToContent: "Saltar al contenido",
    nav: { tienda: "Tienda", cuenta: "Cuenta", comercio: "Comercio", pool: "Pool" },
    devnet: "Demo · devnet previsto",
    devnetHint: "Esta interfaz usa datos simulados. Solana devnet es la red de prueba prevista; sus fondos no tienen valor monetario.",
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
    tagline: "Credit for commerce. Zero interest. Family backed.",
    skipToContent: "Skip to content",
    nav: { tienda: "Store", cuenta: "Account", comercio: "Merchant", pool: "Pool" },
    devnet: "Demo · devnet planned",
    devnetHint: "This interface uses simulated data. Solana devnet is the planned test network; its funds have no monetary value.",
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
