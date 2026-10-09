import { defineDict } from "../locale";

export const landingEquipo = defineDict({
  es: {
    quienesSomos: {
      title: "Quiénes somos",
      problem:
        "Lazo nace de algo que vivimos de cerca: estudiantes sin tarjeta ni historial que no acceden a cuotas, y una alternativa sin tarjeta que cuesta mucho más.",
      sharedHeadline: "Amigos desde hace años. Hoy construimos Lazo juntos.",
      education:
        "Estudiamos Ingeniería en Informática en la Universidad del Norte Santo Tomás de Aquino (UNSTA), en Tucumán.",
      graduation: "Próximos a recibirnos · Diciembre de 2026",
      role: "Producto y desarrollo",
      ageUnit: "años",
      members: [
        {
          name: "Luciano Grosso",
          age: 22,
          bio: [
            "Trabajo actualmente en Control Andina y estoy por recibirme de ingeniero en Informática. Me apasionan la inteligencia artificial y la mejora de procesos.",
            "En Lazo participo tanto en las decisiones de producto como en el desarrollo: junto a Nacho, definimos qué construir y lo llevamos a la práctica.",
          ],
          initials: "LG",
          gradient: "linear-gradient(135deg, #9945ff, #00c2ff)",
        },
        {
          name: "Ignacio Albarracín",
          age: 22,
          bio: [
            "Construyo Lazo de punta a punta: el programa en Solana, la app y todo lo que los conecta.",
            "También participo en las decisiones de producto junto a Luciano: qué problema resolver, cómo se usa Lazo y qué construimos para hacerlo posible.",
          ],
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
      sharedHeadline: "Longtime friends. Now building Lazo together.",
      education:
        "We study Computer Engineering at Universidad del Norte Santo Tomás de Aquino (UNSTA) in Tucumán, Argentina.",
      graduation: "Graduating soon · December 2026",
      role: "Product & development",
      ageUnit: "years old",
      members: [
        {
          name: "Luciano Grosso",
          age: 22,
          bio: [
            "I currently work at Control Andina and am about to graduate in Computer Engineering. I'm passionate about artificial intelligence and improving processes.",
            "At Lazo, I contribute to both product decisions and development. Together with Nacho, we decide what to build and bring it to life.",
          ],
          initials: "LG",
          gradient: "linear-gradient(135deg, #9945ff, #00c2ff)",
        },
        {
          name: "Ignacio Albarracín",
          age: 22,
          bio: [
            "I build Lazo end to end: the Solana program, the app and everything that connects them.",
            "I also make product decisions with Luciano: which problem to solve, how people use Lazo and what we build to make it possible.",
          ],
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
