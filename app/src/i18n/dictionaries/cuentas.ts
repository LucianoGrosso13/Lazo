import { defineDict } from "../locale";

// Textos de la entrada `/app`, el shell de cuentas y la evidencia.
export const cuentas = defineDict({
  es: {
    shell: {
      title: "Cuentas",
      nav: {
        student: "Estudiante",
        merchant: "Comercio",
        admin: "Admin",
        pool: "Pool",
        comercioPublico: "Comercio público",
      },
      balance: "Saldo",
      balanceSimulated: "simulado",
      balanceUnavailable: "Saldo no disponible todavía",
      demoSelectorLabel: "Ver como (demo)",
      demoClear: "Salir de la demo",
      demoHint: "Selector de ejemplo: solo recorre, no autoriza operaciones reales.",
      demoOptions: {
        "student-new": "Estudiante nuevo",
        "student-tier3": "Estudiante escalón 3",
        merchant: "Comercio",
        admin: "Admin",
        guarantor: "Garante (por invitación)",
      },
    },
    roles: {
      student: "Estudiante",
      merchant: "Comercio",
      admin: "Administrador",
      guarantor: "Garante",
    },
    entry: {
      title: "Entrá a tu cuenta",
      subtitle:
        "Una sola entrada detecta si sos estudiante, comercio o administrador por tu wallet. El fiador entra por su enlace, sin wallet.",
      walletExplainer:
        "Una wallet es tu identidad en Solana: conectás Phantom y listo, sin contraseña ni datos personales.",
      devnetExplainer:
        "Todo corre en devnet, la red de prueba de Solana: el USDC es de mentira (devUSDC), sale de un faucet y no vale nada.",
      connectCta: "Conectá tu wallet para entrar",
      resolving: "Detectando tu cuenta…",
      errorTitle: "No se pudo detectar tu cuenta",
      errorRetry: "Reintentar",
      roleDetectedAdmin: "Sos la autoridad administradora configurada",
      roleDetectedMerchant: "Tenés una cuenta de comercio registrada",
      roleDetectedStudent: "Entrás como estudiante",
      roleEvidenceFixture: "cuenta de ejemplo simulada",
      enter: "Ir a mi cuenta",
      reputationMissing:
        "Todavía no tenés reputación: se crea con tu primera acción, con revisión y confirmación.",
      reputationUnavailable: "No se pudo leer tu reputación; se muestra apenas esté disponible.",
      balanceLabel: "Saldo devUSDC",
      balanceUnavailable: "Saldo no disponible todavía.",
      tier: "Escalón",
      publicTitle: "Consulta pública",
      publicBlurb:
        "El pool y el comercio se pueden mirar sin conectar wallet: cada adelanto, pago y recupero queda a la vista.",
      publicPool: "Ver el pool",
      publicComercio: "Ver el comercio",
      demoTitle: "Recorré las cuentas de ejemplo",
      demoBlurb:
        "Elegí una cuenta simulada para ver cada rol. Los datos son de prueba: no son direcciones devnet reales ni autorizan operaciones.",
      guarantorTitle: "Garante",
      guarantorBlurb:
        "El fiador no usa wallet: entra por un enlace que le manda el estudiante. Este botón genera una invitación simulada para el estudiante que venís recorriendo.",
      guarantorSameBrowser:
        "La invitación vive en este navegador: abrila acá mismo. Es demo, sin backend entre dispositivos.",
      guarantorStudent: "Para el estudiante",
      guarantorInvite: "Abrir invitación de prueba",
      guarantorCreating: "Generando invitación…",
      guarantorError: "No se pudo generar la invitación simulada.",
      walletConnected: "Wallet conectada",
      redirecting: "Llevándote a tu cuenta…",
    },
    evidence: {
      simulated: "Simulada · modo demo",
      explorer: "Ver en Explorer (devnet)",
      noEvidence: "Sin comprobante",
      receipt: "Comprobante del keeper (simulado)",
      modeMock: "Mock",
      modeReal: "Devnet",
    },
  },
  en: {
    shell: {
      title: "Accounts",
      nav: {
        student: "Student",
        merchant: "Merchant",
        admin: "Admin",
        pool: "Pool",
        comercioPublico: "Public merchant",
      },
      balance: "Balance",
      balanceSimulated: "simulated",
      balanceUnavailable: "Balance unavailable for now",
      demoSelectorLabel: "View as (demo)",
      demoClear: "Exit demo",
      demoHint: "Example selector: browse only, it does not grant real permissions.",
      demoOptions: {
        "student-new": "New student",
        "student-tier3": "Tier-3 student",
        merchant: "Merchant",
        admin: "Admin",
        guarantor: "Guarantor (by invitation)",
      },
    },
    roles: {
      student: "Student",
      merchant: "Merchant",
      admin: "Admin",
      guarantor: "Guarantor",
    },
    entry: {
      title: "Sign in to your account",
      subtitle:
        "One entry detects whether you are a student, merchant or admin from your wallet. The guarantor comes in through their link, no wallet needed.",
      walletExplainer:
        "A wallet is your Solana identity: connect Phantom and you are in — no password, no personal data.",
      devnetExplainer:
        "Everything runs on devnet, Solana's test network: the USDC is fake (devUSDC), comes from a faucet and is worth nothing.",
      connectCta: "Connect your wallet to enter",
      resolving: "Detecting your account…",
      errorTitle: "Could not detect your account",
      errorRetry: "Try again",
      roleDetectedAdmin: "You are the configured admin authority",
      roleDetectedMerchant: "You have a registered merchant account",
      roleDetectedStudent: "You are entering as a student",
      roleEvidenceFixture: "simulated example account",
      enter: "Go to my account",
      reputationMissing:
        "No reputation yet: it is created with your first action, with review and confirmation.",
      reputationUnavailable: "Your reputation could not be read; it shows as soon as it is available.",
      balanceLabel: "devUSDC balance",
      balanceUnavailable: "Balance unavailable for now.",
      tier: "Tier",
      publicTitle: "Public view",
      publicBlurb:
        "The pool and the merchant can be browsed without connecting a wallet: every advance, payment and recovery is out in the open.",
      publicPool: "View the pool",
      publicComercio: "View the merchant",
      demoTitle: "Browse the example accounts",
      demoBlurb:
        "Pick a simulated account to see each role. These are test fixtures: not real devnet addresses, and they grant no real permissions.",
      guarantorTitle: "Guarantor",
      guarantorBlurb:
        "The guarantor uses no wallet: they enter through a link the student sends them. This button generates a simulated invitation for the student you were browsing as.",
      guarantorSameBrowser:
        "The invitation lives in this browser: open it right here. It's a demo, with no backend across devices.",
      guarantorStudent: "For the student",
      guarantorInvite: "Open test invitation",
      guarantorCreating: "Creating invitation…",
      guarantorError: "Could not create the simulated invitation.",
      walletConnected: "Wallet connected",
      redirecting: "Taking you to your account…",
    },
    evidence: {
      simulated: "Simulated · demo mode",
      explorer: "View on Explorer (devnet)",
      noEvidence: "No receipt",
      receipt: "Keeper receipt (simulated)",
      modeMock: "Mock",
      modeReal: "Devnet",
    },
  },
});
