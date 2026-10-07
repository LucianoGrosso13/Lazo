import { defineDict } from "../locale";
import { tierShort } from "./tiers";

export const landingHero = defineDict({
  es: {
    eyebrow: "Cuotas con respaldo familiar",
    title1: "Crédito para el comercio.",
    title2: "3 cuotas sin interés.",
    title3: "6 con 3% total.",
    lede: "3 cuotas sin interés o 6 con 3% total. Un familiar te respalda. El comercio cobra hoy o en tramos.",
    ctaPrimary: "Probar Lazo",
    ctaSecondary: "Cómo funciona",
    devnet: "Esta versión funciona en Solana devnet, una red de prueba donde los fondos no tienen valor monetario.",
    priceLabel: "Precio",
    price: "Precio de la compra",
    products: { pc: "PC", notebook: "Notebook", curso: "Pack" },
    tierLabel: "Tu Tier",
    tierName: (n: number) => tierShort(n),
    down: "Anticipo",
    installment: (i: number) => `Cuota ${i}`,
    interest3: "0% de interés en 3 cuotas",
    interest6: "3% de interés total en 6 cuotas",
    overTier: (max: string) => `En este Tier el tope es US$ ${max}. Pagá tus planes a tiempo para subir.`,
    stageAria: (price: string, down: string, inst: string, n: number) =>
      `Una compra de US$ ${price} se divide en un anticipo de US$ ${down} y ${n} cuotas de US$ ${inst}.`,
  },
  en: {
    eyebrow: "Family-backed installments",
    title1: "Credit for commerce.",
    title2: "3 installments, zero interest.",
    title3: "6 with 3% total.",
    lede: "3 interest-free installments or 6 with 3% total. Backed by family. Merchants get paid today or in tranches.",
    ctaPrimary: "Try Lazo",
    ctaSecondary: "How it works",
    devnet: "This version runs on Solana devnet, a test network where funds have no monetary value.",
    priceLabel: "Price",
    price: "Purchase price",
    products: { pc: "PC", notebook: "Laptop", curso: "Bundle" },
    tierLabel: "Your Tier",
    tierName: (n: number) => tierShort(n),
    down: "Down payment",
    installment: (i: number) => `Installment ${i}`,
    interest3: "0% interest on 3 installments",
    interest6: "3% total interest on 6 installments",
    overTier: (max: string) => `This Tier caps at US$ ${max}. Pay your plans on time to move up.`,
    stageAria: (price: string, down: string, inst: string, n: number) =>
      `A US$ ${price} purchase splits into a US$ ${down} down payment and ${n} US$ ${inst} installments.`,
  },
});
