import { defineDict } from "../locale";

export const landingHero = defineDict({
  es: {
    title1: "Tres cuotas.",
    title2: "Cero interés.",
    title3: "Sin tarjeta.",
    lede: "Cuotas sin interés, respaldadas por un garante que solo paga si vos no pagás. El comercio cobra al instante y cada paso queda registrado en Solana.",
    ctaPrimary: "Comprar en 3 cuotas sin interés",
    ctaSecondary: "Ver la demo",
    devnet: "Corre en devnet: el USDC es de prueba y no vale nada.",
    priceLabel: "Precio",
    price: "Precio de la compra",
    products: { pc: "PC", notebook: "Notebook", curso: "Curso" },
    tierLabel: "Tu escalón",
    tierName: (n: number) => `Escalón ${n}`,
    down: "Anticipo hoy",
    installment: (i: number) => `Cuota ${i}`,
    merchant: "El comercio cobra hoy",
    interest: "interés",
    overTier: (max: string) => `En este escalón el tope es US$ ${max}. Pagá tus planes a tiempo para subir.`,
    paySplit: (down: string, inst: string, count: number) =>
      `Hoy US$ ${down} + ${count} cuotas de US$ ${inst} del saldo`,
    payNoDown: (inst: string, count: number) => `Sin anticipo: ${count} cuotas de US$ ${inst}`,
    payTotal: (total: string) => `Total US$ ${total} · 0% de interés`,
    downNote: "El anticipo es parte del precio, no un depósito.",
    demoBtn: "Ver una cuota impaga",
    demoNote: "demostración visual, no es una deuda real",
    compareTitle: "Lo mismo, pagando",
    lazo: "Lazo",
    mp: "Mercado Pago, cuotas sin tarjeta",
    reference: "referencia",
    savings: (x: string) => `Te ahorrás US$ ${x}`,
    stageAria: (price: string, down: string | null, inst: string) =>
      down
        ? `Una compra de US$ ${price} se divide en un anticipo de US$ ${down} y tres cuotas de US$ ${inst}, sin interés.`
        : `Una compra de US$ ${price} se divide en tres cuotas de US$ ${inst}, sin anticipo ni interés.`,
  },
  en: {
    title1: "Three installments.",
    title2: "Zero interest.",
    title3: "No credit card.",
    lede: "Zero-interest installments backed by a guarantor who only pays if you don't. The merchant gets paid instantly and every step is recorded on Solana.",
    ctaPrimary: "Buy in 3 interest-free installments",
    ctaSecondary: "Watch the demo",
    devnet: "Runs on devnet: the USDC is test money and worth nothing.",
    priceLabel: "Price",
    price: "Purchase price",
    products: { pc: "PC", notebook: "Laptop", curso: "Course" },
    tierLabel: "Your tier",
    tierName: (n: number) => `Tier ${n}`,
    down: "Down payment today",
    installment: (i: number) => `Installment ${i}`,
    merchant: "Merchant gets paid today",
    interest: "interest",
    overTier: (max: string) => `This tier caps at US$ ${max}. Pay your plans on time to move up.`,
    paySplit: (down: string, inst: string, count: number) =>
      `Today US$ ${down} + ${count} installments of US$ ${inst} on the balance`,
    payNoDown: (inst: string, count: number) => `No down payment: ${count} installments of US$ ${inst}`,
    payTotal: (total: string) => `Total US$ ${total} · 0% interest`,
    downNote: "The down payment is part of the price, not a deposit.",
    demoBtn: "See a missed installment",
    demoNote: "visual demo, not a real debt",
    compareTitle: "The same purchase, paying",
    lazo: "Lazo",
    mp: "Mercado Pago, no-card installments",
    reference: "reference",
    savings: (x: string) => `You save US$ ${x}`,
    stageAria: (price: string, down: string | null, inst: string) =>
      down
        ? `A US$ ${price} purchase splits into a US$ ${down} down payment and three US$ ${inst} installments, interest-free.`
        : `A US$ ${price} purchase splits into three US$ ${inst} installments with no down payment, interest-free.`,
  },
});
