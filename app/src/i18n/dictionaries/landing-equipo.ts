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
      ageUnit: "años",
      members: [
        {
          name: "Luciano Grosso",
          age: 22,
          role: "Product Owner",
          bio: [
            "Trabajo en Control Andina, donde llevo adelante toda la parte tecnológica de la compañía. Estoy por recibirme de ingeniero en Informática en la UNSTA, y me gusta conectar lo que aprendo con los desafíos del trabajo cotidiano.",
            "Me apasionan la inteligencia artificial y la mejora de procesos: entender cómo se hacen las cosas, encontrar qué se puede simplificar y pensar soluciones que les hagan la vida más fácil a las personas.",
            "En Lazo soy Product Owner y participo también en el desarrollo. Junto a Nacho, trabajamos tanto en el producto como en la tecnología: definimos el problema, pensamos la experiencia y construimos lo necesario para llevar la idea a la práctica.",
          ],
          initials: "LG",
          gradient: "linear-gradient(135deg, #9945ff, #00c2ff)",
        },
        {
          name: "Ignacio Albarracín",
          age: 22,
          role: "Full Stack Developer",
          bio: [
            "Soy estudiante de Ingeniería en Informática en la UNSTA, próximo a recibirme, y en Lazo soy Full Stack Developer. Trabajo en el desarrollo de punta a punta: desde el programa en Solana hasta la app y todo lo que los conecta.",
            "También participo en la construcción del producto junto a Luciano. Los dos trabajamos en ambas áreas: pensamos qué problema resolver, cómo debería funcionar la experiencia y cómo convertir esas decisiones en una solución que se pueda usar.",
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
          desc: "Elegí 6 cuotas y mirá el interés total, el anticipo de tu Tier y lo que cubre el garante.",
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
      ageUnit: "years old",
      members: [
        {
          name: "Luciano Grosso",
          age: 22,
          role: "Product Owner",
          bio: [
            "I work at Control Andina, where I oversee the company's technology. I'm about to graduate in Computer Engineering at UNSTA, and I enjoy connecting what I learn with the challenges of everyday work.",
            "I'm passionate about artificial intelligence and improving processes: understanding how things work, finding what can be simplified and developing ideas that make people's lives easier.",
            "At Lazo, I'm the Product Owner and also contribute to development. Together with Nacho, I work across both product and technology: defining the problem, shaping the experience and building what we need to bring the idea to life.",
          ],
          initials: "LG",
          gradient: "linear-gradient(135deg, #9945ff, #00c2ff)",
        },
        {
          name: "Ignacio Albarracín",
          age: 22,
          role: "Full Stack Developer",
          bio: [
            "I'm a Computer Engineering student at UNSTA, about to graduate, and Lazo's Full Stack Developer. I work on development end to end: from the Solana program to the app and everything that connects them.",
            "I also help shape the product with Luciano. We both work across these two areas: deciding which problem to solve, how the experience should work and how to turn those decisions into a solution people can use.",
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
