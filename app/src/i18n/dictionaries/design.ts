import { defineDict } from "../locale";

/**
 * Diccionario de /design (el sistema Prisma mostrado entero) y del chrome
 * compartido que este ticket rediseña (header, menú, marcas "simulada").
 */
export const design = defineDict({
  es: {
    chrome: {
      menuOpen: "Abrir menú",
      menuClose: "Cerrar menú",
      navLabel: "Secciones",
      designLink: "Diseño",
      devnetShort: "devnet",
      simulated: "simulada",
    },
    title: "Sistema Prisma",
    intro:
      "Una compra entra al vidrio como un haz de luz blanca y sale partida en anticipo y tres cuotas. Estas son las piezas con las que se construye Lazo.",
    footerNote: "Todo corre en devnet, la red de prueba de Solana: la plata es de mentira.",
    sections: {
      light: "Luz y suelo",
      type: "Dos voces tipográficas",
      glass: "Vidrio grueso",
      states: "El estado es una marca",
      numbers: "Números de titular",
      controls: "Controles",
      prism: "El prisma",
    },
    light: {
      abyss: "Suelo · abyss",
      spectrum: "Espectro Solana",
      beam: "Luz blanca · el precio",
      ash: "Gris · la alternativa",
      inks: "Tintas",
      note: "El espectro aparece solo cuando la luz blanca se mueve: la plata en cuotas. El gris le pertenece a la alternativa.",
    },
    type: {
      sample: "Lazo parte la luz en cuotas.",
      sampleNum: "anticipo · cuota · día 3 · día 15",
      display:
        "Spectral talla los titulares y el texto: la voz del vidrio cortado. AaBbCcDdEeFfGg 0123456789",
      num: "Azeret Mono mide: cantos, etiquetas y números tabulares que se alinean como marcas de una regla.",
    },
    glass: {
      panelTitle: "Panel",
      panelBody:
        "Canto superior iluminado, borde inferior pulido que atrapa el espectro, brillo interior y blur que refracta el mundo.",
      slabTitle: "Slab",
      slabBody:
        "El bloque de los héroes: aristas biseladas como un prisma tallado y una sombra que lo despega del suelo.",
    },
    states: {
      caption: "Cada estado se lee por forma y trama, no solo por color. A la derecha, las mismas marcas sin color.",
      dim: "Futura",
      lit: "Por vencer",
      etched: "Pagada",
      cracked: "Vencida",
      refilled: "La cubrió el fiador",
      noColor: "Sin color",
    },
    numbers: {
      installment: "cuota",
      each: "cada una",
      totalNote: "La última cuota absorbe el redondeo: la suma siempre cierra.",
    },
    controls: {
      primary: "Comprar en 3 cuotas sin interés",
      secondary: "Ver demo guiada",
      ghost: "Cómo funciona",
      disabled: "Todavía no",
      chips: "Productos",
      chipToggle: "Interactivo",
      tiers: "Escalón",
      wallet: "Wallet",
    },
    prism: {
      input: "Precio",
      down: "Anticipo",
      installment: "Cuota",
      merchant: "El comercio cobra",
      comparison: "Mercado Pago · 3 cuotas",
      price: "Precio",
      tier: "Escalón",
      state: "Estado de la cuota 2",
      stateNone: "Al día",
      demoNote: "Mové el precio o el escalón: el haz se vuelve a refractar. Montos calculados desde la configuración del protocolo.",
      stateDemo: "La mora, en luz",
      cracked: "Se raja al vencer",
      refilled: "La luz de atrás la llena: paga el fiador",
      etched: "Pagada: queda grabada",
    },
  },
  en: {
    chrome: {
      menuOpen: "Open menu",
      menuClose: "Close menu",
      navLabel: "Sections",
      designLink: "Design",
      devnetShort: "devnet",
      simulated: "simulated",
    },
    title: "Prisma system",
    intro:
      "A purchase enters the glass as a beam of white light and leaves split into a down payment and three installments. These are the pieces Lazo is built from.",
    footerNote: "Everything runs on devnet, Solana's test network: the money is fake.",
    sections: {
      light: "Light and ground",
      type: "Two typographic voices",
      glass: "Thick glass",
      states: "State is a mark",
      numbers: "Headline numbers",
      controls: "Controls",
      prism: "The prism",
    },
    light: {
      abyss: "Ground · abyss",
      spectrum: "Solana spectrum",
      beam: "White light · the price",
      ash: "Grey · the alternative",
      inks: "Inks",
      note: "The spectrum only appears when white light moves: money in installments. Grey belongs to the alternative.",
    },
    type: {
      sample: "Lazo splits light into installments.",
      sampleNum: "down payment · installment · day 3 · day 15",
      display:
        "Spectral cuts headlines and body text: the voice of cut glass. AaBbCcDdEeFfGg 0123456789",
      num: "Azeret Mono measures: edges, labels and tabular numbers that align like ruler marks.",
    },
    glass: {
      panelTitle: "Panel",
      panelBody:
        "Lit top edge, polished bottom edge that catches the spectrum, inner highlight and blur that refracts the world.",
      slabTitle: "Slab",
      slabBody:
        "The hero block: beveled edges like a cut prism and a shadow that lifts it off the ground.",
    },
    states: {
      caption: "Every state reads through shape and texture, not only color. On the right, the same marks without color.",
      dim: "Upcoming",
      lit: "Due",
      etched: "Paid",
      cracked: "Late",
      refilled: "Covered by the guarantor",
      noColor: "No color",
    },
    numbers: {
      installment: "installment",
      each: "each",
      totalNote: "The last installment absorbs rounding: the sum always closes.",
    },
    controls: {
      primary: "Buy in 3 interest-free installments",
      secondary: "Watch the guided demo",
      ghost: "How it works",
      disabled: "Not yet",
      chips: "Products",
      chipToggle: "Interactive",
      tiers: "Tier",
      wallet: "Wallet",
    },
    prism: {
      input: "Price",
      down: "Down payment",
      installment: "Installment",
      merchant: "Merchant receives",
      comparison: "Mercado Pago · 3 installments",
      price: "Price",
      tier: "Tier",
      state: "State of installment 2",
      stateNone: "On time",
      demoNote: "Move the price or the tier: the beam refracts again. Amounts computed from the protocol config.",
      stateDemo: "Late payment, in light",
      cracked: "It cracks when late",
      refilled: "Backlight fills it: the guarantor pays",
      etched: "Paid: etched into the glass",
    },
  },
});
