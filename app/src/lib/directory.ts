// Directorio de «Comercios adheridos»: datos editoriales de ejemplo.
// Los cuatro comercios son ficticios — ninguno existe ni procesa compras.
// Solo `voltia` está ligado al checkout de la demo (DEMO_MERCHANT en
// cuotas/format.ts); el resto ilustra cómo se vería la red cuando haya
// acuerdos reales. Nunca linkear una compra a otro comercio de esta lista.

export type DirectoryCategory = "tech" | "books" | "gear" | "courses";
export type Fulfillment = "pickup" | "delivery" | "online";

export interface DirectoryEntry {
  id: "voltia" | "margen" | "norte" | "aula";
  name: string;
  blurb: { es: string; en: string };
  category: DirectoryCategory;
  /** Zona gruesa, sin direcciones: estos comercios no existen. */
  zone: { es: string; en: string };
  fulfillment: Fulfillment;
  /** Marca al único comercio por el que corre el checkout de la demo. */
  handlesDemo?: boolean;
}

/** Orden de las categorías = orden del espectro (violeta → verde). */
export const DIRECTORY_CATEGORIES = ["tech", "books", "gear", "courses"] as const;

export const DIRECTORY: DirectoryEntry[] = [
  {
    id: "voltia",
    name: "Voltia",
    blurb: {
      es: "PC, notebooks y periféricos para cursar y trabajar.",
      en: "PCs, laptops and peripherals for class and work.",
    },
    category: "tech",
    zone: { es: "San Miguel de Tucumán", en: "San Miguel de Tucumán" },
    fulfillment: "pickup",
    handlesDemo: true,
  },
  {
    id: "margen",
    name: "Margen Librería",
    blurb: {
      es: "Libros, calculadoras y todo lo que hace falta para la facu.",
      en: "Books, calculators and everything you need for college.",
    },
    category: "books",
    zone: { es: "Zona universitaria", en: "University area" },
    fulfillment: "pickup",
  },
  {
    id: "norte",
    name: "Norte Equipamiento",
    blurb: {
      es: "Escritorio, silla y lámpara para armar el rincón de estudio.",
      en: "Desk, chair and lamp for your study setup.",
    },
    category: "gear",
    zone: { es: "Yerba Buena", en: "Yerba Buena" },
    fulfillment: "delivery",
  },
  {
    id: "aula",
    name: "Aula Abierta",
    blurb: {
      es: "Cursos de desarrollo web para aprender a tu ritmo.",
      en: "Web development courses to learn at your own pace.",
    },
    category: "courses",
    zone: { es: "Online", en: "Online" },
    fulfillment: "online",
  },
];
