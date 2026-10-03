import { toMicro, type Micro } from "./cuotas";

// Catálogo de la tienda demo (simulada). Precios en micro-USDC.
export interface Product {
  id: "pc" | "notebook" | "curso";
  name: { es: string; en: string };
  blurb: { es: string; en: string };
  price: Micro;
  image: string;
}

export const CATALOG: Product[] = [
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
];

export const getProduct = (id: string) => CATALOG.find((p) => p.id === id) ?? null;
