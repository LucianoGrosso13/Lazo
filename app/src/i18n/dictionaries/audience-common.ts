import { defineDict } from "../locale";

/**
 * Lo compartido de las páginas por audiencia: nombres en la navegación y el
 * footer, textos de los encabezados placeholder y etiquetas de los callouts.
 * Los tickets 09–11 crean un diccionario por página para el contenido real.
 */
export const audienceCommon = defineDict({
  es: {
    navLabel: "Cómo funciona",
    pages: {
      estudiantes: {
        nav: "Estudiantes y familias",
        eyebrow: "Estudiantes y familias",
        title: "Cómo funciona Lazo para estudiantes y familias",
        lede: "Cuotas con respaldo familiar, un anticipo que baja con tu historial y reglas claras si te atrasás.",
      },
      comercios: {
        nav: "Comercios",
        eyebrow: "Comercios",
        title: "Cómo funciona Lazo para comercios",
        lede: "Vendé en cuotas sin tarjeta de por medio: elegís cuándo cobrar y la comisión baja si esperás.",
      },
      inversores: {
        nav: "Inversores",
        eyebrow: "Inversores",
        title: "Cómo funciona Lazo para inversores",
        lede: "El pool adelanta la parte financiada de cada venta y cada movimiento se verifica en la cadena.",
      },
    },
    callout: { provisional: "provisional", demo: "demo", devnet: "devnet" },
    stepsLabel: "Pasos",
    faqLabel: "Preguntas frecuentes",
    wip: "Contenido en preparación: esta página se está escribiendo.",
  },
  en: {
    navLabel: "How it works",
    pages: {
      estudiantes: {
        nav: "Students and families",
        eyebrow: "Students and families",
        title: "How Lazo works for students and families",
        lede: "Installments backed by your family, a down payment that drops with your track record, and clear rules if you fall behind.",
      },
      comercios: {
        nav: "Merchants",
        eyebrow: "Merchants",
        title: "How Lazo works for merchants",
        lede: "Sell in installments with no card in between: you choose when you get paid and the fee drops if you wait.",
      },
      inversores: {
        nav: "Investors",
        eyebrow: "Investors",
        title: "How Lazo works for investors",
        lede: "The pool advances the financed share of every sale and every move is verifiable onchain.",
      },
    },
    callout: { provisional: "provisional", demo: "demo", devnet: "devnet" },
    stepsLabel: "Steps",
    faqLabel: "Frequently asked questions",
    wip: "Content in preparation: this page is being written.",
  },
});
