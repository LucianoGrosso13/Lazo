import { defineDict } from "../locale";

export const landingEquipo = defineDict({
  es: {
    quienesSomos: {
      title: "Quiénes somos",
      problem:
        "Lazo nace de algo que vivimos de cerca: estudiantes sin tarjeta ni historial que no acceden a cuotas, y una alternativa sin tarjeta que cuesta mucho más.",
      sharedHeadline:
        "Estudiantes de Ingeniería en Informática en la Universidad del Norte Santo Tomás de Aquino (UNSTA), se reciben en diciembre de 2026, amigos desde hace años.",
      university: "UNSTA · Ingeniería en Informática",
      graduation: "Diciembre de 2026",
      friendship: "Amigos desde hace años",
      members: [
        {
          name: "Luciano Grosso",
          age: 22,
          role: "Product Owner",
          interest: "Amante de la blockchain y de los productos financieros. Define qué construye Lazo, para quién y con qué reglas.",
          initials: "LG",
          gradient: "linear-gradient(135deg, #9945ff, #00c2ff)",
        },
        {
          name: "Ignacio Albarracín",
          age: 22,
          role: "Full Stack Developer",
          interest: "Construye Lazo de punta a punta: el programa en Solana, la app y todo lo que los conecta.",
          initials: "IA",
          gradient: "linear-gradient(135deg, #00c2ff, #19fb9b)",
        },
      ],
    },
    probalo: {
      title: "Probalo en 2 minutos",
      lede: "Una guía corta para recorrer la demo de punta a punta y ver cómo interactúan el comprador, el comercio y el protocolo.",
      steps: [
        {
          num: "01",
          title: "Elegí un producto",
          desc: "Entrá a la tienda y elegí el producto que querés financiar.",
          href: "/tienda",
          linkText: "/tienda",
        },
        {
          num: "02",
          title: "Checkout con 6 cuotas",
          desc: "Elegí 6 cuotas y mirá el interés total, el anticipo de tu Tier y lo que cubre el fiador.",
          href: "/tienda",
          linkText: "Ver checkout",
        },
        {
          num: "03",
          title: "Reloj de demo",
          desc: "Adelantá 30 días en el reloj de demo: pagá a tiempo o dejá vencer para ver la mora.",
          href: "#reloj-demo",
          linkText: "Reloj de demo",
        },
        {
          num: "04",
          title: "Liberación de tramos",
          desc: "En el panel del comercio, comprobá cómo los tramos se van liberando con el paso de los días.",
          href: "/app/comercio",
          linkText: "/app/comercio",
        },
        {
          num: "05",
          title: "Venta en mostrador",
          desc: "Generá un código QR con monto y descripción para cobrar en el local y abrilo en el celular.",
          href: "/app/comercio/mostrador",
          linkText: "/app/comercio/mostrador",
        },
      ],
      devnet: "Corre en Solana devnet: la plata es de prueba.",
    },
  },
  en: {
    quienesSomos: {
      title: "About us",
      problem:
        "Lazo comes from something we see up close: students without a credit card or credit history who can't buy in installments, and a no-card alternative that costs far more.",
      sharedHeadline:
        "Computer Engineering students at Universidad del Norte Santo Tomás de Aquino (UNSTA), graduating in December 2026, longtime friends.",
      university: "UNSTA · Computer Engineering",
      graduation: "December 2026",
      friendship: "Friends for years",
      members: [
        {
          name: "Luciano Grosso",
          age: 22,
          role: "Product Owner",
          interest: "Blockchain enthusiast with a passion for financial products. Defines what Lazo builds, for whom and under which rules.",
          initials: "LG",
          gradient: "linear-gradient(135deg, #9945ff, #00c2ff)",
        },
        {
          name: "Ignacio Albarracín",
          age: 22,
          role: "Full Stack Developer",
          interest: "Builds Lazo end to end: the Solana program, the app and everything that connects them.",
          initials: "IA",
          gradient: "linear-gradient(135deg, #00c2ff, #19fb9b)",
        },
      ],
    },
    probalo: {
      title: "Try it in 2 minutes",
      lede: "A quick walkthrough to explore the demo end to end and see how the buyer, merchant, and protocol interact.",
      steps: [
        {
          num: "01",
          title: "Choose a product",
          desc: "Enter the store and choose the product you want to finance.",
          href: "/tienda",
          linkText: "/tienda",
        },
        {
          num: "02",
          title: "Checkout with 6 installments",
          desc: "Pick 6 installments and check the total interest, your Tier's down payment and what the guarantor covers.",
          href: "/tienda",
          linkText: "View checkout",
        },
        {
          num: "03",
          title: "Demo clock",
          desc: "Advance 30 days on the demo clock: pay on time or let it lapse to test delinquency.",
          href: "#reloj-demo",
          linkText: "Demo clock",
        },
        {
          num: "04",
          title: "Merchant tranches",
          desc: "In the merchant dashboard, verify how settlement tranches release over time.",
          href: "/app/comercio",
          linkText: "/app/comercio",
        },
        {
          num: "05",
          title: "Counter sales",
          desc: "Generate an in-person QR code with an amount and description, and open it on your phone.",
          href: "/app/comercio/mostrador",
          linkText: "/app/comercio/mostrador",
        },
      ],
      devnet: "Runs on Solana devnet: test money only.",
    },
  },
});
