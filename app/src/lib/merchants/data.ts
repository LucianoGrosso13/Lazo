// Directorio de comercios demo (simulados): datos estáticos tipados.
// Nombres inventados, sin marcas reales; direcciones base58 válidas
// (32 bytes) derivadas determinísticamente — fixtures, no cuentas devnet
// reales. Los productos se exponen al catálogo en `src/lib/catalog.ts`.
// Fuentes: `.scratch/web-completa/spec.md` §"Directorio de comercios demo"
// y `proyecto/08-minorista-y-economia.md` §"Categorías y tickets".
import { DEMO_MERCHANT, toMicro } from "../cuotas/format";
import type { Micro, WalletAddress } from "../cuotas/types";

export type CategoryId =
  | "electronics"
  | "peripherals"
  | "books"
  | "tools"
  | "courses"
  | "service";

export interface MerchantCategory {
  id: CategoryId;
  label: { es: string; en: string };
}

export const CATEGORIES: MerchantCategory[] = [
  { id: "electronics", label: { es: "Electrónica y computación", en: "Electronics and computing" } },
  { id: "peripherals", label: { es: "Periféricos y accesorios", en: "Peripherals and accessories" } },
  { id: "books", label: { es: "Librería y estudio", en: "Bookstore and study" } },
  { id: "tools", label: { es: "Herramientas y equipamiento", en: "Tools and equipment" } },
  { id: "courses", label: { es: "Cursos y formación", en: "Courses and training" } },
  { id: "service", label: { es: "Servicio técnico", en: "Technical service" } },
];

/** Producto dentro de un comercio del directorio (sin el comercio dueño). */
export interface DirectoryProduct {
  /** Slug único dentro de todo el directorio. */
  id: string;
  name: { es: string; en: string };
  blurb: { es: string; en: string };
  /** Micro-USDC; nunca por encima del tope máximo de la config. */
  price: Micro;
  /** `/products/<id>.webp`; la UI muestra un fallback si falta el archivo. */
  image: string;
}

export interface DemoMerchant {
  /** Dirección base58 (32 bytes) de su cuenta Merchant en el mock. */
  address: WalletAddress;
  name: string;
  category: CategoryId;
  city: string;
  description: { es: string; en: string };
  featured: boolean;
  /** Siempre true: todos son ficticios y la UI lo rotula. */
  demo: true;
  /** Foto principal del comercio (su primer producto local). */
  image: string;
  products: DirectoryProduct[];
}

// Direcciones derivadas de sha256("lazo-demo-merchant-<slug>") en base58:
// determinísticas, válidas y sin palabras legibles. Kroma conserva
// DEMO_MERCHANT (`src/lib/cuotas/format.ts`), el guion de la demo no cambia.
export const MERCHANTS: DemoMerchant[] = [
  {
    address: DEMO_MERCHANT,
    name: "Kroma",
    category: "electronics",
    city: "Distrito Digital",
    description: {
      es: "Estaciones de trabajo, portátiles y formación técnica para creadores.",
      en: "Workstations, laptops and technical training for creators.",
    },
    featured: true,
    demo: true,
    image: "/products/pc.webp",
    products: [
      {
        id: "pc",
        name: { es: "PC de escritorio", en: "Desktop PC" },
        blurb: { es: "Para programar, diseñar y rendir finales.", en: "For coding, design and finals." },
        price: toMicro(1000),
        image: "/products/pc.webp",
      },
      {
        id: "notebook",
        name: { es: "Notebook", en: "Laptop" },
        blurb: { es: "Liviana, para cursar todo el día.", en: "Light enough for a full day of classes." },
        price: toMicro(650),
        image: "/products/notebook.webp",
      },
      {
        id: "curso",
        name: { es: "Curso online", en: "Online course" },
        blurb: { es: "Un curso de desarrollo web completo.", en: "A full web development course." },
        price: toMicro(120),
        image: "/products/curso.webp",
      },
    ],
  },
  {
    address: "AxPBA787ZnU8XVzySDAZPRd5uxRqnTrMHFodM1eGWpRv",
    name: "Lumina Display",
    category: "electronics",
    city: "Hub Central",
    description: {
      es: "Monitores de alta definición y tablets para estudio intensivo.",
      en: "High-definition monitors and tablets for intensive study.",
    },
    featured: false,
    demo: true,
    image: "/products/monitor-24.webp",
    products: [
      {
        id: "monitor-24",
        name: { es: "Monitor 24″", en: "24-inch monitor" },
        blurb: { es: "Segunda pantalla para cursar y trabajar.", en: "A second screen for classes and work." },
        price: toMicro(190),
        image: "/products/monitor-24.webp",
      },
      {
        id: "tablet-10",
        name: { es: "Tablet 10″", en: "10-inch tablet" },
        blurb: { es: "Para leer apuntes y tomar notas.", en: "For reading notes and taking class notes." },
        price: toMicro(340),
        image: "/products/tablet-10.webp",
      },
    ],
  },
  {
    address: "2dgH9sW7mCLwHK2N5WiGbMHQZm25c9Vc9RpTsaAAhcvA",
    name: "Apex Periféricos",
    category: "peripherals",
    city: "Online",
    description: {
      es: "Teclados mecánicos de precisión, ratones ligeros y audio de estudio.",
      en: "Precision mechanical keyboards, lightweight mice and studio audio.",
    },
    featured: false,
    demo: true,
    image: "/products/teclado-mecanico.webp",
    products: [
      {
        id: "teclado-mecanico",
        name: { es: "Teclado mecánico", en: "Mechanical keyboard" },
        blurb: { es: "Switches silenciosos para la biblioteca.", en: "Quiet switches for the library." },
        price: toMicro(95),
        image: "/products/teclado-mecanico.webp",
      },
      {
        id: "mouse-inalambrico",
        name: { es: "Mouse inalámbrico", en: "Wireless mouse" },
        blurb: { es: "Liviano, con meses de batería.", en: "Light, with months of battery." },
        price: toMicro(45),
        image: "/products/mouse-inalambrico.webp",
      },
      {
        id: "auriculares-bt",
        name: { es: "Auriculares bluetooth", en: "Bluetooth headphones" },
        blurb: { es: "Con micrófono para clases y llamadas.", en: "With a mic for classes and calls." },
        price: toMicro(120),
        image: "/products/auriculares-bt.webp",
      },
    ],
  },
  {
    address: "CzdcE7N7nor6KdEZf5VSsuL8ymBUBzPs8NXGq2hnX5hn",
    name: "Flux Audio",
    category: "peripherals",
    city: "Plataforma Demo",
    description: {
      es: "Sistemas de sonido inalámbricos y adaptadores de carga rápida 65W.",
      en: "Wireless sound systems and 65W fast-charging adapters.",
    },
    featured: false,
    demo: true,
    image: "/products/parlante-bt.webp",
    products: [
      {
        id: "parlante-bt",
        name: { es: "Parlante bluetooth", en: "Bluetooth speaker" },
        blurb: { es: "Sonido para la casa o el quincho.", en: "Sound for home or the backyard." },
        price: toMicro(78),
        image: "/products/parlante-bt.webp",
      },
      {
        id: "cargador-65w",
        name: { es: "Cargador rápido 65W", en: "65W fast charger" },
        blurb: { es: "Carga notebook y celu con un solo enchufe.", en: "Charges laptop and phone from one plug." },
        price: toMicro(42),
        image: "/products/cargador-65w.webp",
      },
    ],
  },
  {
    address: "D5xVGAaUSZpgMX1kozAzxyr7SBmwdQMGEHtRnaaN8BR",
    name: "Códice Estudio",
    category: "books",
    city: "Campus Virtual",
    description: {
      es: "Mochilas técnicas acolchadas y guías de estudio para la carrera.",
      en: "Padded technical backpacks and degree study guides.",
    },
    featured: true,
    demo: true,
    image: "/products/pack-apuntes.webp",
    products: [
      {
        id: "pack-apuntes",
        name: { es: "Pack de apuntes de cursada", en: "Class notes pack" },
        blurb: { es: "Apuntes y guías impresas del cuatrimestre.", en: "Printed notes and guides for the term." },
        price: toMicro(36),
        image: "/products/pack-apuntes.webp",
      },
      {
        id: "mochila-universitaria",
        name: { es: "Mochila universitaria", en: "University backpack" },
        blurb: { es: "Con bolsillo acolchado para notebook.", en: "With a padded laptop sleeve." },
        price: toMicro(95),
        image: "/products/mochila-universitaria.webp",
      },
    ],
  },
  {
    address: "CD1WKjuTqbpEq1H6berakYr4vbv72FXYH1AWYjdqMCnr",
    name: "Grafito Lab",
    category: "books",
    city: "Distrito Central",
    description: {
      es: "Calculadoras científicas y sets de dibujo para ciencias e ingeniería.",
      en: "Scientific calculators and drawing sets for science and engineering.",
    },
    featured: false,
    demo: true,
    image: "/products/calculadora-cientifica.webp",
    products: [
      {
        id: "calculadora-cientifica",
        name: { es: "Calculadora científica", en: "Scientific calculator" },
        blurb: { es: "La que piden en análisis y física.", en: "The one required for calculus and physics." },
        price: toMicro(62),
        image: "/products/calculadora-cientifica.webp",
      },
      {
        id: "set-dibujo-tecnico",
        name: { es: "Set de dibujo técnico", en: "Technical drawing set" },
        blurb: { es: "Escuadras, compás y reglas para el taller.", en: "Squares, compass and rulers for the workshop." },
        price: toMicro(28),
        image: "/products/set-dibujo-tecnico.webp",
      },
    ],
  },
  {
    address: "ffScbDLem4WnVw8FssngPhF61ASQV1g7pghGz1gGKKE",
    name: "Torque Taller",
    category: "tools",
    city: "Polo Técnico",
    description: {
      es: "Amoladoras angulares y cajas de herramientas completas para taller.",
      en: "Angle grinders and complete toolboxes for workshop use.",
    },
    featured: false,
    demo: true,
    image: "/products/amoladora-angular.webp",
    products: [
      {
        id: "amoladora-angular",
        name: { es: "Amoladora angular", en: "Angle grinder" },
        blurb: { es: "Para cortes y desbastes del taller.", en: "For workshop cutting and grinding." },
        price: toMicro(145),
        image: "/products/amoladora-angular.webp",
      },
      {
        id: "kit-herramientas",
        name: { es: "Kit de herramientas 42 piezas", en: "42-piece tool kit" },
        blurb: { es: "Lo básico para arreglar en casa.", en: "The basics for fixing things at home." },
        price: toMicro(230),
        image: "/products/kit-herramientas.webp",
      },
    ],
  },
  {
    address: "3zA4rv4QkbP9SfqcKKf9pG3DXCcMEuuTK38pCNVd6odt",
    name: "Forja Industrial",
    category: "tools",
    city: "Centro Tecnológico",
    description: {
      es: "Taladros percutores de alta potencia y soldadoras inverter portátiles.",
      en: "High-power hammer drills and portable inverter welders.",
    },
    featured: false,
    demo: true,
    image: "/products/taladro-percutor.webp",
    products: [
      {
        id: "taladro-percutor",
        name: { es: "Taladro percutor", en: "Hammer drill" },
        blurb: { es: "Para hormigón, mampostería y madera.", en: "For concrete, masonry and wood." },
        price: toMicro(260),
        image: "/products/taladro-percutor.webp",
      },
      {
        id: "soldadora-inverter",
        name: { es: "Soldadora inverter", en: "Inverter welder" },
        blurb: { es: "Compacta, para trabajos de herrería.", en: "Compact, for metalwork jobs." },
        price: toMicro(430),
        image: "/products/soldadora-inverter.webp",
      },
    ],
  },
  {
    address: "ARCiBAiXu3ZJau3PF18kzUcNK6Nvy3kDd5zCmG2yB4S5",
    name: "Sintaxis Academy",
    category: "courses",
    city: "Online",
    description: {
      es: "Cursos intensivos de diseño UX, interfaces e inglés técnico.",
      en: "Intensive courses in UX design, interfaces and technical English.",
    },
    featured: true,
    demo: true,
    image: "/products/curso-ux.webp",
    products: [
      {
        id: "curso-ux",
        name: { es: "Curso de diseño UX", en: "UX design course" },
        blurb: { es: "De wireframes a portfolio en ocho semanas.", en: "From wireframes to a portfolio in eight weeks." },
        price: toMicro(160),
        image: "/products/curso-ux.webp",
      },
      {
        id: "curso-ingles-tecnico",
        name: { es: "Inglés técnico para programadores", en: "Technical English for developers" },
        blurb: { es: "Vocabulario para entrevistas y documentación.", en: "Vocabulary for interviews and docs." },
        price: toMicro(90),
        image: "/products/curso-ingles-tecnico.webp",
      },
    ],
  },
  {
    address: "FhmCapYjgkn6XtQz1YYZmZiCjH1Cj6NLrLz8NfyR54EM",
    name: "Silicio Service",
    category: "service",
    city: "Distrito Tecnológico",
    description: {
      es: "Reparación de placas madre, cambio de componentes y optimización.",
      en: "Motherboard repair, component replacement and performance tune-ups.",
    },
    featured: true,
    demo: true,
    image: "/products/reparacion-notebook.webp",
    products: [
      {
        id: "reparacion-notebook",
        name: { es: "Reparación de notebook", en: "Notebook repair" },
        blurb: { es: "Diagnóstico, cambio de placa, bisagras y teclado.", en: "Diagnostics, board, hinge and keyboard fixes." },
        price: toMicro(180),
        image: "/products/reparacion-notebook.webp",
      },
      {
        id: "mantenimiento-pc",
        name: { es: "Mantenimiento de PC", en: "PC maintenance" },
        blurb: { es: "Limpieza, pasta térmica y optimización.", en: "Cleaning, thermal paste and tune-up." },
        price: toMicro(65),
        image: "/products/mantenimiento-pc.webp",
      },
    ],
  },
];
