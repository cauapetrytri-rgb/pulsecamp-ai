import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "PulseCamp — Rastreamento e qualidade de leads",
  description: "Atribuição de campanhas Click-to-WhatsApp, qualificação comercial e feedback de conversão para a Meta.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d1c31",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
