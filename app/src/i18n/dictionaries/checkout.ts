import { defineDict } from "../locale";
import { tierLabel } from "./tiers";

export const checkout = defineDict({
  es: {
    back: "Volver a la tienda",
    price: "Precio",
    breakdownTitle: "Tu desglose",
    tierChip: (n: number) => tierLabel(n),
    previewNote: "Vista previa del Tier 1 · Starter: conectá tu wallet para ver el tuyo.",
    stageDown: "Anticipo",
    down: "Anticipo · hoy",
    installment: (i: number) => `Cuota ${i}`,
    dueOn: (date: string) => `vence ${date}`,
    total: "Total",
    interestFree: "0% de interés",
    plans: {
      label: "Elegí en cuántas cuotas",
      option: (n: number) => `${n} cuotas`,
      free: "sin interés",
      interestTotal: (pct: string) => `+${pct}% de interés en total`,
      each: (amt: string) => `US$ ${amt} cada una`,
      unavailable: "Esta opción no está disponible en la demo.",
      belowMin: (n: number, min: string) => `${n} cuotas desde US$ ${min}`,
      guarantorRequired: "Necesitás un fiador activo para abrir un plan.",
      noCapacity: "En este momento no hay cupo para planes nuevos. Probá más tarde.",
    },
    interestRow: "Interés del plan",
    interestChip: (pct: string) => `+${pct}%`,
    guarantorLabel: "Fiador",
    guarantorLine: (card: string | null, max: string) =>
      `Fiador${card ? ` · ${card}` : ""} · tope US$ ${max}`,
    checking: "Buscando tu wallet…",
    connectTitle: "Conectá tu wallet para comprar",
    connectBody:
      "Una wallet es tu cuenta en Solana: con Phantom comprás sin registrarte ni dar datos.",
    cta: "Pagar anticipo y abrir plan",
    ctaNoDown: "Abrir plan · sin anticipo",
    ctaHint: "Antes de firmar revisás destino, monto, token y red.",
    blockedTitle: "Todavía no podés comprar esto",
    blocked: {
      protocol_halted: {
        t: "El protocolo está en pausa",
        d: "La demo está detenida por mantenimiento. Probá de nuevo en un rato.",
        cta: null,
      },
      blocked_after_default: {
        t: "No podés abrir planes nuevos",
        d: (chargeDay: number) =>
          `Una cuota tuya llegó al día ${chargeDay} y la terminó pagando tu garante. Tu cuenta quedó bloqueada para planes nuevos.`,
        cta: { label: "Ver mi plan", href: "/panel" },
      },
      has_active_plan: {
        t: "Ya tenés un plan activo",
        d: "Solo podés tener un plan a la vez. Pagalo completo para abrir el próximo.",
        cta: { label: "Ir a mi plan", href: "/panel" },
      },
      no_guarantee: {
        t: "Necesitás un fiador",
        d: "Para abrir un plan necesitás un fiador. Invitalo en 2 minutos.",
        cta: { label: "Invitar a mi fiador", href: "/app/estudiante#invite-guarantor" },
      },
      exceeds_tier_max: {
        t: "Supera el tope de tu Tier",
        d: (max: string) => `En tu Tier el tope es US$ ${max}.`,
        next: (n: number, max: string) =>
          `Al llegar a Tier ${n + 1} el tope sube a US$ ${max}: se gana pagando planes a tiempo.`,
        cta: { label: "Ver algo más barato", href: "/comercio" },

      },
      exceeds_credit_limit: {
        t: "No te alcanza el margen",
        d: (missing: string) =>
          `Te faltan US$ ${missing} de margen para esta compra.`,
        cta: { label: "Ver mis planes", href: "/panel" },
      },
      exceeds_guarantor_max_purchase: {
        t: "Supera el tope de tu garante",
        d: (max: string) => `Tu garante te cubre compras hasta US$ ${max}.`,
        cta: { label: "Ver algo más barato", href: "/comercio" },
      },
      exceeds_guarantee_coverage: {
        t: "Tu garante no llega a cubrirla",
        d: (max: string) => `La cobertura de tu garante llega a US$ ${max}.`,
        cta: { label: "Ver algo más barato", href: "/comercio" },
      },
      option_unavailable: {
        t: "Esa opción no está disponible",
        d: "La opción de cuotas o de cobro que pediste no existe o está en pausa en la demo.",
        cta: null,
      },
      below_option_min: {
        t: (n: number, min: string) => `${n} cuotas desde US$ ${min}`,
        d: (n: number, min: string) => `Para elegir ${n} cuotas, la compra debe ser de al menos US$ ${min}.`,
        fallback: "Esta opción requiere alcanzar el precio mínimo configurado.",
      },
      pool_liquidity: {
        t: "Sin cupo disponible",
        d: "En este momento no hay cupo para planes nuevos. Probá más tarde.",
      },
      insufficient_funds: {
        t: "No te alcanza el saldo devUSDC",
        d: (missing: string | null) =>
          missing
            ? `Te faltan US$ ${missing} para el anticipo. En la demo podés pedir fondos de prueba.`
            : "Tu saldo devUSDC no llega al anticipo. En la demo podés pedir fondos de prueba.",
        cta: null,
      },
    },
    margin: {
      label: "Margen en uso",
      used: (used: string, limit: string) => `US$ ${used} / US$ ${limit}`,
      needed: (needed: string) => `Esta compra suma US$ ${needed}`,
      frees: "Pagando cuotas liberás margen, como una tarjeta.",
    },
    balanceLabel: "Tu saldo devUSDC",
    balanceUnavailable: "no disponible",
    calendar: {
      title: "Tu calendario de cuotas",
      count: (n: number) => `${n} cuotas`,
      installment: (i: number) => `Cuota ${i}`,
      nextUp: "Próxima cuota",
      nextTag: "próxima",
      dueOn: (date: string) => `vence ${date}`,
      inDays: (n: number) => `en ${n} ${n === 1 ? "día" : "días"}`,
      dueToday: "vence hoy",
      overdueDays: (n: number) => `venció hace ${n} ${n === 1 ? "día" : "días"}`,
      status: {
        Upcoming: "a tiempo",
        Due: "vence hoy",
        Grace: "en gracia",
        Late: "atrasada",
        Paid: "pagada",
        ChargedToGuarantor: "cobrada al fiador",
      },
      exactToggle: "Ver montos exactos",
      exactTotal: "Total financiado exacto",
      approxNote:
        "Las cuotas se guardan con 6 decimales; arriba se muestran redondeadas.",
      late: {
        title: "¿Qué pasa si me atraso?",
        grace: (d: number) =>
          `Tenés ${d} días de gracia después de cada vencimiento: pagando dentro de ese plazo no hay recargo.`,
        notice: (d: number) =>
          `Al día ${d} de atraso está previsto avisarle a tu fiador: es un aviso, todavía no un cobro.`,
        penalty: (pct: string) =>
          `Pasada la gracia se suma un recargo único del ${pct}% sobre la cuota vencida. Lo pagás vos: tu fiador no lo cubre.`,
        charge: (d: number) =>
          `Al día ${d} de atraso se solicita el cobro a tu fiador por el capital y el interés que falten (sin el recargo).`,
        recovery:
          "Si ese cobro se registra, tu plan deja de contar, bajás de escalón y no podés abrir planes nuevos.",
      },
    },
    pay: {
      cta: (n: number, amt: string) => `Pagar la cuota ${n} · US$ ${amt}`,
      title: "Revisá tu pago",
      rows: {
        dest: "Destino",
        destValue: "Pool de liquidez Lazo",
        amount: "Importe exacto",
        token: "Token",
        tokenValue: "devUSDC · USDC de prueba",
        network: "Red",
        networkValue: "Solana devnet · plata de prueba",
        wallet: "Firmás con",
        plan: "Plan",
        installment: (n: number) => `Cuota ${n}`,
        remaining: (n: number) =>
          `Después del pago quedan ${n} ${n === 1 ? "cuota" : "cuotas"}`,
      },
      approvalNote:
        "Phantom te pide una aprobación nueva: la firma del anticipo no autoriza esta cuota.",
      sign: "Aprobar y pagar",
      back: "Volver",
      mockNote: "Firma simulada en modo demo: Phantom no te pide nada.",
      errorTitle: "No se pudo pagar la cuota",
      successTitle: (n: number) => `Cuota ${n} pagada`,
      remainingLabel: (n: number) =>
        `Quedan ${n} ${n === 1 ? "cuota" : "cuotas"} por pagar`,
      balanceLabel: "Tu saldo devUSDC ahora",
      done: "Listo",
      progress: {
        title: "Estado de tu pago",
        aria: "Progreso del pago",
        steps: {
          preparing: {
            t: "Armando tu pago",
            d: "Armamos la operación en tu máquina. Todavía no se envió nada.",
          },
          awaiting_approval: {
            t: "Aprobá en tu billetera",
            d: "Phantom te muestra el pago: revisalo y aprobalo. Todavía no salió de tu máquina.",
          },
          sending: {
            t: "Enviando",
            d: "El pago ya salió con tu firma hacia devnet.",
          },
          confirming: {
            t: "Confirmando en devnet",
            d: "Devnet está confirmando el pago. La verdad la da la cadena, no un contador.",
          },
          syncing: {
            t: "Casi listo",
            d: "Confirmado: leyendo tu plan para actualizar el calendario.",
          },
        },
      },
    },
    compareTitle: "Lo mismo, pagando en cuotas",
    lazoPlan: (n: number) => `Lazo · ${n} cuotas`,
    mp: "La competencia · cuotas sin tarjeta",
    reference: "referencia",
    cfteaRange: (min: number, max: number) => `CFTEA publicada del ${min}% al ${max}% anual`,
    fixedCostNote: "Con Lazo, el costo total es fijo y lo ves antes de confirmar.",
    demoNote: "Compra simulada · el USDC es de prueba (devnet)",
    stageAria: (price: string, down: string, inst: string, n: number) =>
      `La compra de US$ ${price} se divide en un anticipo de US$ ${down} y ${n} cuotas de US$ ${inst}.`,
    confirm: {
      title: "Revisá lo que firmás",
      rows: {
        dest: "Destino",
        payToday: "Pagás hoy",
        token: "Token",
        network: "Red",
        interest: "Interés",
        after: "Después",
      },
      merchantFallback: "comercio demo",
      tokenValue: "devUSDC · USDC de prueba",
      networkValue: "Solana devnet · plata de prueba",
      installmentsLine: (n: number, amt: string) => `${n} cuotas de US$ ${amt}`,
      mockNote: "Firma simulada en modo demo: Phantom no te pide nada.",
      progress: {
        title: "Estado de tu compra",
        aria: "Progreso de la compra",
        steps: {
          preparing: {
            t: "Armando tu plan",
            d: "Armamos la operación en tu máquina. Todavía no se envió nada.",
          },
          awaiting_approval: {
            t: "Aprobá en tu billetera",
            d: "Phantom te muestra la operación: revisala y aprobala. Todavía no salió de tu máquina.",
          },
          sending: {
            t: "Enviando",
            d: "La operación ya salió con tu firma hacia devnet.",
          },
          confirming: {
            t: "Confirmando en devnet",
            d: "Devnet está confirmando la operación. La verdad la da la cadena, no un contador.",
          },
          syncing: {
            t: "Casi listo",
            d: "Confirmada: leyendo tu plan para armar tu calendario.",
          },
        },
      },
      sign: "Firmar y abrir plan",
      opening: "Abriendo el plan…",
      back: "Volver",
      errorTitle: "No se pudo abrir el plan",
      errors: {
        exceeds_tier_max: "El precio supera el tope de tu Tier.",
        exceeds_credit_limit: "No te alcanza el margen: pagando cuotas lo liberás.",
        exceeds_guarantor_max_purchase: "Supera el tope de tu garante.",
        exceeds_guarantee_coverage: "Tu garante no llega a cubrir esta compra.",
        no_guarantee: "Necesitás un garante activo para comprar.",
        guarantor_required: "Para abrir un plan necesitás un fiador. Invitalo en 2 minutos.",
        below_option_min: "La compra no alcanza el mínimo configurado para esa opción.",
        pool_liquidity: "En este momento no hay cupo para planes nuevos. Probá más tarde.",
        blocked_after_default: "Tu cuenta está bloqueada para planes nuevos.",
        has_active_plan: "Ya tenés un plan activo: pagalo antes de abrir otro.",
        protocol_halted: "El protocolo está en pausa. Probá más tarde.",
        option_unavailable: "Esa opción de cuotas o de cobro no está disponible en la demo.",
        not_found: "No encontramos el comercio o tu cuenta. Recargá la página.",
        generic: "Algo falló del otro lado. Probá de nuevo.",
        user_rejected:
          "Cancelaste la firma en tu billetera. No se envió nada.",
        wallet_required: "Necesitás una billetera conectada para firmar.",
        unauthorized: "Este perfil no está autorizado para esta operación.",
        wrong_cluster:
          "La billetera no está en devnet. Cambiá la red e intentá de nuevo.",
        insufficient_funds:
          "No alcanza tu saldo devUSDC para el anticipo.",
        simulation_failed:
          "La operación no pasó la simulación de devnet. Nada quedó registrado.",
        review_rejected: "El plan no pasó las reglas vigentes.",
        unsupported_version: "La billetera no soporta esta operación.",
        unavailable: "No pudimos hablar con devnet. Probá de nuevo.",
        demo_only: "Esta operación está disponible solo en devnet.",
        not_implemented: "Esta parte todavía no está implementada.",
        order_unavailable: "La orden ya no está disponible.",
        nothing_due: "Esa cuota ya no está pendiente.",
      },
      uncertain: {
        t: "No sabemos si la operación quedó registrada",
        d: "Perdimos la conexión después de enviarla. No la volvemos a mandar a ciegas: la verificamos leyendo la cadena.",
        sigLabel: "Firma de la operación",
        verifyCta: "Verificar en la cadena",
        verifying: "verificando…",
        stillPending:
          "Todavía no la vemos confirmada en la cadena. Podés volver a verificar; mientras tanto la compra queda bloqueada para no duplicar el pago.",
        failedOnchain:
          "La operación llegó a devnet y falló: tu plan no se abrió y tu devUSDC no se movió. Podés reintentar con una operación nueva.",
        backCta: "Volver a la compra",
        panelCta: "Ver mi panel",
      },
      success: {
        title: "Listo, plan abierto",
        paidLead: "Pagaste",
        paidTail: "de anticipo",
        paidNoDown: "Tu plan quedó abierto, sin anticipo.",
        youPaid: (x: string) => `Pagaste el anticipo: US$ ${x}`,
        pendingFact: (x: string) => `Te quedan por pagar US$ ${x}`,
        installments: (n: number, amt: string) => `Quedan ${n} cuotas de US$ ${amt}`,
        reconciled: "Verificada leyendo la cadena",
        interestFact: (x: string) => `Incluye US$ ${x} de interés`,
        beamYou: "tu wallet",
        beamAria: "La luz de tu pago viaja hasta el comercio.",
        receipt: (sig: string) => `Comprobante simulado · ${sig}`,
        ctaPanel: "Ir a mi plan",
        ctaStore: "Volver a la tienda",
      },
    },
  },
  en: {
    back: "Back to the store",
    price: "Price",
    breakdownTitle: "Your breakdown",
    tierChip: (n: number) => tierLabel(n),
    previewNote: "Tier 1 · Starter preview: connect your wallet to see yours.",
    stageDown: "Down payment",
    down: "Down payment · today",
    installment: (i: number) => `Installment ${i}`,
    dueOn: (date: string) => `due ${date}`,
    total: "Total",
    interestFree: "0% interest",
    plans: {
      label: "Choose your installments",
      option: (n: number) => `${n} installments`,
      free: "interest-free",
      interestTotal: (pct: string) => `+${pct}% total interest`,
      each: (amt: string) => `US$ ${amt} each`,
      unavailable: "This option isn't available in the demo.",
      belowMin: (n: number, min: string) => `${n} installments from US$ ${min}`,
      guarantorRequired: "You need an active guarantor to open a plan.",
      noCapacity: "There is no capacity for new plans right now. Try again later.",
    },
    interestRow: "Plan interest",
    interestChip: (pct: string) => `+${pct}%`,
    guarantorLabel: "Guarantor",
    guarantorLine: (card: string | null, max: string) =>
      `Guarantor${card ? ` · ${card}` : ""} · up to US$ ${max}`,
    checking: "Looking for your wallet…",
    connectTitle: "Connect your wallet to buy",
    connectBody:
      "A wallet is your Solana account: with Phantom you buy without signing up or sharing data.",
    cta: "Pay down payment & open plan",
    ctaNoDown: "Open plan · no down payment",
    ctaHint: "Before signing you review destination, amount, token and network.",
    blockedTitle: "You can't buy this yet",
    blocked: {
      protocol_halted: {
        t: "The protocol is paused",
        d: "The demo is stopped for maintenance. Try again in a bit.",
        cta: null,
      },
      blocked_after_default: {
        t: "You can't open new plans",
        d: (chargeDay: number) =>
          `One of your installments reached day ${chargeDay} and your guarantor ended up paying it. Your account is blocked from new plans.`,
        cta: { label: "See my plan", href: "/panel" },
      },
      has_active_plan: {
        t: "You already have an active plan",
        d: "You can only have one plan at a time. Pay it off to open the next one.",
        cta: { label: "Go to my plan", href: "/panel" },
      },
      no_guarantee: {
        t: "You need a guarantor",
        d: "You need a guarantor to open a plan. Invite them in 2 minutes.",
        cta: { label: "Invite my guarantor", href: "/app/estudiante#invite-guarantor" },
      },
      exceeds_tier_max: {
        t: "It's over your Tier's cap",
        d: (max: string) => `Your Tier caps at US$ ${max}.`,
        next: (n: number, max: string) =>
          `At Tier ${n + 1} the cap rises to US$ ${max}: you get there by paying plans on time.`,
        cta: { label: "See something cheaper", href: "/comercio" },

      },
      exceeds_credit_limit: {
        t: "Not enough credit margin",
        d: (missing: string) =>
          `You're US$ ${missing} short of margin for this purchase.`,
        cta: { label: "See my plans", href: "/panel" },
      },
      exceeds_guarantor_max_purchase: {
        t: "It's over your guarantor's cap",
        d: (max: string) => `Your guarantor covers purchases up to US$ ${max}.`,
        cta: { label: "See something cheaper", href: "/comercio" },
      },
      exceeds_guarantee_coverage: {
        t: "Your guarantor can't cover it",
        d: (max: string) => `Your guarantor's coverage reaches US$ ${max}.`,
        cta: { label: "See something cheaper", href: "/comercio" },
      },
      option_unavailable: {
        t: "That option isn't available",
        d: "The installment or settlement option you asked for doesn't exist or is paused in the demo.",
        cta: null,
      },
      below_option_min: {
        t: (n: number, min: string) => `${n} installments from US$ ${min}`,
        d: (n: number, min: string) => `To choose ${n} installments, the purchase must be at least US$ ${min}.`,
        fallback: "This option requires meeting its configured minimum price.",
      },
      pool_liquidity: {
        t: "No capacity available",
        d: "There is no capacity for new plans right now. Try again later.",
      },
      insufficient_funds: {
        t: "Not enough devUSDC balance",
        d: (missing: string | null) =>
          missing
            ? `You're US$ ${missing} short for the down payment. In the demo you can request test funds.`
            : "Your devUSDC balance doesn't cover the down payment. In the demo you can request test funds.",
        cta: null,
      },
    },
    margin: {
      label: "Margin in use",
      used: (used: string, limit: string) => `US$ ${used} / US$ ${limit}`,
      needed: (needed: string) => `This purchase adds US$ ${needed}`,
      frees: "Paying installments frees up margin, like a card.",
    },
    balanceLabel: "Your devUSDC balance",
    balanceUnavailable: "unavailable",
    calendar: {
      title: "Your installment schedule",
      count: (n: number) => `${n} installments`,
      installment: (i: number) => `Installment ${i}`,
      nextUp: "Next installment",
      nextTag: "next",
      dueOn: (date: string) => `due ${date}`,
      inDays: (n: number) => `in ${n} ${n === 1 ? "day" : "days"}`,
      dueToday: "due today",
      overdueDays: (n: number) => `${n} ${n === 1 ? "day" : "days"} overdue`,
      status: {
        Upcoming: "on time",
        Due: "due today",
        Grace: "in grace period",
        Late: "late",
        Paid: "paid",
        ChargedToGuarantor: "charged to guarantor",
      },
      exactToggle: "See exact amounts",
      exactTotal: "Exact financed total",
      approxNote:
        "Installments are stored with 6 decimals; above they're shown rounded.",
      late: {
        title: "What happens if I'm late?",
        grace: (d: number) =>
          `You have a ${d}-day grace period after each due date: paying within it carries no surcharge.`,
        notice: (d: number) =>
          `On day ${d} of delay your guarantor is due to be notified: a notice, not a charge.`,
        penalty: (pct: string) =>
          `After grace, a one-time ${pct}% surcharge is added on the overdue installment. You pay it: your guarantor does not cover it.`,
        charge: (d: number) =>
          `On day ${d} of delay a charge to your guarantor is requested for the outstanding principal and interest (excluding the surcharge).`,
        recovery:
          "If that charge is registered, your plan stops counting, you drop a tier and you can't open new plans.",
      },
    },
    pay: {
      cta: (n: number, amt: string) => `Pay installment ${n} · US$ ${amt}`,
      title: "Review your payment",
      rows: {
        dest: "Destination",
        destValue: "Lazo liquidity pool",
        amount: "Exact amount",
        token: "Token",
        tokenValue: "devUSDC · test USDC",
        network: "Network",
        networkValue: "Solana devnet · test money",
        wallet: "Signing with",
        plan: "Plan",
        installment: (n: number) => `Installment ${n}`,
        remaining: (n: number) =>
          `After this payment ${n} ${n === 1 ? "installment" : "installments"} remain`,
      },
      approvalNote:
        "Phantom asks for a fresh approval: the down payment signature does not authorize this installment.",
      sign: "Approve & pay",
      back: "Back",
      mockNote: "Signature simulated in demo mode: Phantom won't ask you anything.",
      errorTitle: "The installment couldn't be paid",
      successTitle: (n: number) => `Installment ${n} paid`,
      remainingLabel: (n: number) =>
        `${n} ${n === 1 ? "installment" : "installments"} left to pay`,
      balanceLabel: "Your devUSDC balance now",
      done: "Done",
      progress: {
        title: "Your payment status",
        aria: "Payment progress",
        steps: {
          preparing: {
            t: "Preparing your payment",
            d: "We're building the operation on your machine. Nothing was sent yet.",
          },
          awaiting_approval: {
            t: "Approve in your wallet",
            d: "Phantom shows the payment: review and approve it. It hasn't left your machine yet.",
          },
          sending: {
            t: "Sending",
            d: "The payment left with your signature towards devnet.",
          },
          confirming: {
            t: "Confirming on devnet",
            d: "Devnet is confirming the payment. The chain tells the truth, not a counter.",
          },
          syncing: {
            t: "Almost there",
            d: "Confirmed: reading your plan to update the calendar.",
          },
        },
      },
    },
    compareTitle: "The same purchase, in installments",
    lazoPlan: (n: number) => `Lazo · ${n} installments`,
    mp: "The competition · no-card installments",
    reference: "reference",
    cfteaRange: (min: number, max: number) => `Published annual CFTEA of ${min}% to ${max}%`,
    fixedCostNote: "With Lazo, the total cost is fixed and you see it before you confirm.",
    demoNote: "Simulated purchase · the USDC is test money (devnet)",
    stageAria: (price: string, down: string, inst: string, n: number) =>
      `The US$ ${price} purchase splits into a US$ ${down} down payment and ${n} US$ ${inst} installments.`,
    confirm: {
      title: "Check what you're signing",
      rows: {
        dest: "Destination",
        payToday: "You pay today",
        token: "Token",
        network: "Network",
        interest: "Interest",
        after: "Then",
      },
      merchantFallback: "demo merchant",
      tokenValue: "devUSDC · test USDC",
      networkValue: "Solana devnet · test money",
      installmentsLine: (n: number, amt: string) => `${n} installments of US$ ${amt}`,
      mockNote: "Signature simulated in demo mode: Phantom won't ask you anything.",
      progress: {
        title: "Your purchase status",
        aria: "Purchase progress",
        steps: {
          preparing: {
            t: "Setting up your plan",
            d: "We're building the operation on your machine. Nothing was sent yet.",
          },
          awaiting_approval: {
            t: "Approve in your wallet",
            d: "Phantom is showing you the operation: review it and approve. It hasn't left your machine yet.",
          },
          sending: {
            t: "Sending",
            d: "The operation left with your signature towards devnet.",
          },
          confirming: {
            t: "Confirming on devnet",
            d: "Devnet is confirming the operation. Truth comes from the chain, not from a timer.",
          },
          syncing: {
            t: "Almost there",
            d: "Confirmed: reading your plan to build your schedule.",
          },
        },
      },
      sign: "Sign & open plan",
      opening: "Opening the plan…",
      back: "Back",
      errorTitle: "The plan couldn't be opened",
      errors: {
        exceeds_tier_max: "The price is over your tier's cap.",
        exceeds_credit_limit: "Not enough credit margin: paying installments frees it up.",
        exceeds_guarantor_max_purchase: "It's over your guarantor's cap.",
        exceeds_guarantee_coverage: "Your guarantor can't cover this purchase.",
        no_guarantee: "You need an active guarantor to buy.",
        guarantor_required: "You need a guarantor to open a plan. Invite them in 2 minutes.",
        below_option_min: "The purchase doesn't meet this option's configured minimum.",
        pool_liquidity: "There is no capacity for new plans right now. Try again later.",
        blocked_after_default: "Your account is blocked from new plans.",
        has_active_plan: "You already have an active plan: pay it off first.",
        protocol_halted: "The protocol is paused. Try again later.",
        option_unavailable: "That installment or settlement option isn't available in the demo.",
        not_found: "We couldn't find the merchant or your account. Reload the page.",
        generic: "Something failed on the other side. Try again.",
        user_rejected:
          "You cancelled the signature in your wallet. Nothing was sent.",
        wallet_required: "You need a connected wallet to sign.",
        unauthorized: "This profile isn't authorized for this operation.",
        wrong_cluster:
          "The wallet isn't on devnet. Switch networks and try again.",
        insufficient_funds:
          "Your devUSDC balance doesn't cover the down payment.",
        simulation_failed:
          "The operation didn't pass devnet simulation. Nothing was recorded.",
        review_rejected: "The plan didn't pass the current rules.",
        unsupported_version: "The wallet doesn't support this operation.",
        unavailable: "We couldn't reach devnet. Try again.",
        demo_only: "This operation is only available on devnet.",
        not_implemented: "This part isn't implemented yet.",
        order_unavailable: "The order is no longer available.",
        nothing_due: "That installment is no longer pending.",
      },
      uncertain: {
        t: "We don't know if the operation was recorded",
        d: "We lost the connection after sending it. We won't blindly resend it: we verify it by reading the chain.",
        sigLabel: "Operation signature",
        verifyCta: "Verify on chain",
        verifying: "verifying…",
        stillPending:
          "We still can't see it confirmed on chain. You can verify again; meanwhile the purchase stays blocked so nothing gets charged twice.",
        failedOnchain:
          "The operation reached devnet and failed: your plan wasn't opened and your devUSDC didn't move. You can retry with a fresh operation.",
        backCta: "Back to the purchase",
        panelCta: "See my panel",
      },
      success: {
        title: "Done, plan opened",
        paidLead: "You paid",
        paidTail: "as a down payment",
        paidNoDown: "Your plan is open — no down payment.",
        youPaid: (x: string) => `You paid the down payment: US$ ${x}`,
        pendingFact: (x: string) => `You have US$ ${x} left to pay`,
        installments: (n: number, amt: string) => `${n} installments of US$ ${amt} left`,
        reconciled: "Verified by reading the chain",
        interestFact: (x: string) => `Includes US$ ${x} of interest`,
        beamYou: "your wallet",
        beamAria: "The light of your payment travels to the merchant.",
        receipt: (sig: string) => `Simulated receipt · ${sig}`,
        ctaPanel: "Go to my plan",
        ctaStore: "Back to the store",
      },
    },
  },
});
