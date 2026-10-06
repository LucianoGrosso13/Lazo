import type { Metadata } from "next";
import { Bricolage_Grotesque, Martian_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { DemoClock } from "@/components/demo-clock/demo-clock";
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
  title: "Lazo · Credit for commerce, zero interest",
  description:
    "A simulated demo of zero-interest installments for shoppers, backed by a family guarantor. No payments or transactions are processed; the planned test environment is Solana devnet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`h-full antialiased ${bricolage.variable} ${martian.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppHeader />
          <main id="main" className="flex-1">{children}</main>
          <DemoClock />
        </Providers>
      </body>
    </html>
  );
}
