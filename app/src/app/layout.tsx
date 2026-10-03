import type { Metadata } from "next";
import { Bricolage_Grotesque, Martian_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { Providers } from "./providers";
import "./globals.css";

// Bricolage Grotesque: display y texto (variable, con ejes de tamaño óptico y ancho).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

// Martian Mono: números tabulares, etiquetas y medición.
const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lazo · Cuotas sin interés, respaldadas por tu familia",
  description:
    "Zero-interest USDC installments for students without a credit card, backed by a family guarantor. Runs on Solana devnet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`h-full antialiased ${bricolage.variable} ${martian.variable}`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppHeader />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
