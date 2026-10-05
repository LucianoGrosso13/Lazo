import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases utilitarias sin dejar reglas Tailwind que se pisan. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
