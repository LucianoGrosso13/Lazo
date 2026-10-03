import { Bricolage_Grotesque, Martian_Mono } from "next/font/google";

// Tipografías de Lazo. Cuando entre el sistema de diseño (ticket 07) pasan a layout.tsx.
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "wdth"],
  display: "swap",
});

export const mono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
