import type { Metadata } from "next";
import { Spectral, Azeret_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { Providers } from "./providers";
import "./globals.css";

// Spectral: la voz del vidrio tallado (display + texto).
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

// Azeret Mono: números tabulares a escala de titular, marcas de medición.
const azeret = Azeret_Mono({
  variable: "--font-azeret",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lazo · Cuotas sin interés, respaldadas por tu familia",
  description:
    "Zero-interest USDC installments for students without a credit card, backed by a family guarantor. Runs on Solana devnet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`h-full antialiased ${spectral.variable} ${azeret.variable}`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppHeader />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
