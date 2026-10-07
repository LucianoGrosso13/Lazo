import type { CategoryId } from "@/lib/merchants";
import styles from "./marketplace.module.css";

// Gradiente por categoría: pares del espectro del mundo (violet, cyan, green,
// indigo del store, backlight) — cada comercio lleva el color de su rubro.
export const CATEGORY_MONOGRAM: Record<CategoryId, string> = {
  electronics: "linear-gradient(135deg, #9945ff, #00c2ff)",
  peripherals: "linear-gradient(135deg, #00c2ff, #19fb9b)",
  books: "linear-gradient(135deg, #6c63ff, #c4a3ff)",
  tools: "linear-gradient(135deg, #565d74, #00c2ff)",
  courses: "linear-gradient(135deg, #c4a3ff, #6c63ff)",
  service: "linear-gradient(135deg, #9945ff, #19fb9b)",
};

/** Inicial del comercio tallada en el gradiente de su categoría. */
export function MerchantMonogram({
  name,
  category,
  large = false,
}: {
  name: string;
  category: CategoryId;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`${styles.monogram} ${large ? styles.monogramLg : ""}`}
      style={{ ["--mg" as string]: CATEGORY_MONOGRAM[category] }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
