import { defineDict } from "../locale";

export const landingEquipo = defineDict({
  es: {
    quienesSomos: {
      title: "Quiénes somos",
      problem:
        "Millones de jóvenes sin tarjeta ni historial no acceden a cuotas, y la alternativa sin tarjeta cuesta mucho más.",
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
          interest: "Apasionado por la blockchain y los productos financieros.",
          initials: "LG",
          gradient: "linear-gradient(135deg, #9945ff, #00c2ff)",
        },
        {
          name: "Ignacio Albarracín",
          age: 22,
          role: "Full Stack Developer",
          interest: "Apasionado por el desarrollo full stack y la arquitectura de software.",
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
          desc: "Probá la financiación en 6 cuotas con interés total del 3% respaldado por el fiador.",
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
        "Millions of young adults without a credit card or credit history cannot access installments, and no-card alternatives cost significantly more.",
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
          interest: "Passionate about blockchain technology and financial products.",
          initials: "LG",
          gradient: "linear-gradient(135deg, #9945ff, #00c2ff)",
        },
        {
          name: "Ignacio Albarracín",
          age: 22,
          role: "Full Stack Developer",
          interest: "Passionate about full-stack development and software architecture.",
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
          desc: "Experience 6 installments with 3% total interest backed by the guarantor.",
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
