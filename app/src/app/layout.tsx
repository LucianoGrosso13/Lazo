import type { Metadata } from "next";
import { Bricolage_Grotesque, Martian_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
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
  title: "Lazo · Credit for commerce — 3 installments interest-free, 6 with low interest",
  description:
    "A simulated demo of installments for shoppers: 3 interest-free or 6 with low interest, backed by a family guarantor covering 100% of the capital while merchants choose when to get paid. No payments or transactions are processed; the planned test environment is Solana devnet.",
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
          <SiteFooter />
          <DemoClock />
        </Providers>
      </body>
    </html>
  );
}
