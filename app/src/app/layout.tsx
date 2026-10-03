import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lazo · Cuotas sin interés, respaldadas por tu familia",
  description: "Zero-interest USDC installments for students without a credit card, backed by a family guarantor. Runs on Solana devnet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppHeader />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
