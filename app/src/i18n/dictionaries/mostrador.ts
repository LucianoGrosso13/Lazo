import { defineDict } from "../locale";

export const mostrador = defineDict({
  es: {
    // Panel del cajero
    titulo: "Venta en mostrador",
    subtitulo: "Generá una orden con QR o link para que tu cliente pague en cuotas desde su celular.",
    badgeCajero: "Mostrador",
    modoSimulador: "Modo simulador",
    realAviso:
      "Disponible en el simulador: la venta en mostrador por QR está implementada en el simulador de Lazo (modo mock). En devnet real opera el catálogo de productos.",

    // Flujo en 3 pasos
    flujoTitulo: "Cómo funciona la venta en el local",
    paso1Numero: "1",
    paso1Titulo: "Cargás la venta",
    paso1Desc: "Ingresá el monto y la descripción del producto o servicio.",
    paso2Numero: "2",
    paso2Titulo: "Mostrás el QR",
    paso2Desc: "El cliente escanea el código con la cámara de su celular o le compartís el link.",
    paso3Numero: "3",
    paso3Titulo: "El cliente confirma",
    paso3Desc: "Elige 3 o 6 cuotas con su fianza y la venta se acredita al instante en tu panel.",

    // Formulario de creación
    nuevaOrdenTitulo: "Nueva orden de cobro",
    campoMonto: "Monto (USDC)",
    campoMontoPlaceholder: "Ej. 450",
    campoDescripcion: "Descripción de la compra",
    campoDescripcionPlaceholder: "Ej. Teclado mecánico, Curso de inglés...",
    botonGenerar: "Generar orden",
    generando: "Generando orden…",
    errorMonto: "Ingresá un monto válido mayor a 0.",
    errorDescripcion: "Ingresá una descripción para la orden.",
    errorGenerar: "No se pudo generar la orden. Probá nuevamente.",

    // Orden activa y QR
    ordenActivaTitulo: "Orden en curso",
    esperandoCliente: "Esperando al cliente",
    ordenPagada: "Pagada",
    ordenVencida: "Vencida",
    qrAviso:
      "Es un link de Lazo: el cliente lo abre con la cámara. No es un QR de pagos de otras billeteras.",
    copiarLink: "Copiar link",
    linkCopiado: "¡Link copiado!",
    abrirComoCliente: "Abrir como cliente",
    abrirComoClienteHint: "Abrí la orden en otra pestaña para simular la experiencia del comprador.",
    detalleOrden: "Detalle de la orden",
    ordenId: "Orden",
    creadaEl: "Creada",
    venceEl: "Vence",
    planAsociado: "Plan asociado",
    ventaAcreditada: "Venta completada y acreditada en tu cuenta de comercio.",
    generarOtra: "Crear otra orden",

    // Historial del día
    historialTitulo: "Órdenes del día",
    historialVacio: "Todavía no generaste órdenes en este turno.",
    colOrden: "Orden",
    colDescripcion: "Descripción",
    colMonto: "Monto",
    colEstado: "Estado",
    colAccion: "Acción",
    verQr: "Ver QR",

    // Identidad / selector de comercio en demo
    comercioActivo: "Comercio",
    sinComercioTitulo: "Seleccioná un comercio para operar el mostrador",
    sinComercioDesc:
      "En el simulador podés ingresar con el comercio de ejemplo para cobrar con QR.",
    seleccionarDemoMerchant: "Operar como Comercio demo",
    comerciosEjemplo: "Comercio de ejemplo",
    ordenActivaVacia: "Al generar una orden, acá vas a ver el QR, el link para compartir y el estado de la venta.",
    pasoEtiqueta: (numero: string) => `PASO ${numero}`,
    seleccionada: "Seleccionada",
    contadorOrdenes: (cantidad: number) => `${cantidad} ${cantidad === 1 ? "orden" : "órdenes"}`,
    linkOrden: "Link de la orden",
    errorQr: "No se pudo generar el QR.",
    errorCopiar: "No se pudo copiar el link. Seleccionalo para copiarlo.",

    // Página de la orden (/orden/[id])
    ordenClienteTitulo: "Orden de compra",
    ordenClienteSubtitulo: (comercio: string) => `Comprando en ${comercio}`,
    ordenCargando: "Cargando orden…",
    ordenNoEncontradaTitulo: "Orden no encontrada",
    ordenNoEncontradaDesc: "El link de la orden no existe o ya no está disponible.",
    ordenPagadaTitulo: "Esta orden ya fue pagada",
    ordenPagadaDesc: (planId?: string) =>
      `La orden ya fue abonada${planId ? ` con el ${planId}` : ""}. Las órdenes de mostrador son de uso único y no pueden reutilizarse.`,
    ordenVencidaTitulo: "Esta orden venció",
    ordenVencidaDesc:
      "Las órdenes de mostrador vencen a las 24 horas. Pedile al comercio que genere una orden nueva.",
    ordenVolverTienda: "Ir a la tienda",
    ordenVolverComercio: "Volver al mostrador",
  },
  en: {
    // Cashier panel
    titulo: "Point-of-sale checkout",
    subtitulo: "Generate an in-store order with a QR code or link for your customer to pay in installments from their phone.",
    badgeCajero: "Cashier",
    modoSimulador: "Simulator mode",
    realAviso:
      "Available in the simulator: in-store QR checkout is implemented in the Lazo simulator (mock mode). On live devnet, catalog checkout operates.",

    // 3-step flow
    flujoTitulo: "How in-store checkout works",
    paso1Numero: "1",
    paso1Titulo: "Enter the sale",
    paso1Desc: "Type the amount and description for the product or service.",
    paso2Numero: "2",
    paso2Titulo: "Show the QR",
    paso2Desc: "The customer scans the code with their phone camera or you share the link.",
    paso3Numero: "3",
    paso3Titulo: "Customer confirms",
    paso3Desc: "They choose 3 or 6 installments with their guarantor and the sale credits instantly to your panel.",

    // Creation form
    nuevaOrdenTitulo: "New checkout order",
    campoMonto: "Amount (USDC)",
    campoMontoPlaceholder: "E.g. 450",
    campoDescripcion: "Purchase description",
    campoDescripcionPlaceholder: "E.g. Mechanical keyboard, English course...",
    botonGenerar: "Generate order",
    generando: "Generating order…",
    errorMonto: "Enter a valid amount greater than 0.",
    errorDescripcion: "Enter a description for the order.",
    errorGenerar: "Could not generate order. Please try again.",

    // Active order and QR
    ordenActivaTitulo: "Active order",
    esperandoCliente: "Waiting for customer",
    ordenPagada: "Paid",
    ordenVencida: "Expired",
    qrAviso:
      "It is a Lazo link: the customer opens it with their camera. It is not a payment QR from other wallets.",
    copiarLink: "Copy link",
    linkCopiado: "Link copied!",
    abrirComoCliente: "Open as customer",
    abrirComoClienteHint: "Open the order in another tab to simulate the buyer's experience.",
    detalleOrden: "Order details",
    ordenId: "Order",
    creadaEl: "Created",
    venceEl: "Expires",
    planAsociado: "Associated plan",
    ventaAcreditada: "Sale completed and credited to your merchant account.",
    generarOtra: "Create another order",

    // Daily history
    historialTitulo: "Today's orders",
    historialVacio: "You haven't generated any orders in this shift yet.",
    colOrden: "Order",
    colDescripcion: "Description",
    colMonto: "Amount",
    colEstado: "Status",
    colAccion: "Action",
    verQr: "View QR",

    // Identity / merchant selector in demo
    comercioActivo: "Merchant",
    sinComercioTitulo: "Select a merchant to operate the counter",
    sinComercioDesc:
      "In the simulator you can sign in with the demo merchant to collect via QR.",
    seleccionarDemoMerchant: "Operate as Demo Merchant",
    comerciosEjemplo: "Example merchant",
    ordenActivaVacia: "After generating an order, its QR code, shareable link, and sale status will appear here.",
    pasoEtiqueta: (numero: string) => `STEP ${numero}`,
    seleccionada: "Selected",
    contadorOrdenes: (cantidad: number) => `${cantidad} ${cantidad === 1 ? "order" : "orders"}`,
    linkOrden: "Order link",
    errorQr: "Could not generate the QR code.",
    errorCopiar: "Could not copy the link. Select it to copy it.",

    // Order page (/orden/[id])
    ordenClienteTitulo: "Purchase order",
    ordenClienteSubtitulo: (comercio: string) => `Purchasing at ${comercio}`,
    ordenCargando: "Loading order…",
    ordenNoEncontradaTitulo: "Order not found",
    ordenNoEncontradaDesc: "The order link does not exist or is no longer available.",
    ordenPagadaTitulo: "This order has already been paid",
    ordenPagadaDesc: (planId?: string) =>
      `This order has already been paid${planId ? ` with ${planId}` : ""}. Counter orders are single-use and cannot be reused.`,
    ordenVencidaTitulo: "This order has expired",
    ordenVencidaDesc:
      "Counter orders expire after 24 hours. Please ask the merchant to generate a new order.",
    ordenVolverTienda: "Go to store",
    ordenVolverComercio: "Back to counter",
  },
});
