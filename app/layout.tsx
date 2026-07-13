import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pulsecamp-ai-portfolio.vercel.app"),
  title: "PulseCamp — Rastreamento e qualidade de leads",
  description: "Atribuição de campanhas Click-to-WhatsApp, qualificação comercial e feedback de conversão para a Meta.",
  openGraph: {
    title: "PulseCamp — SaaS de campanhas e conversões",
    description: "Atribuição Click-to-WhatsApp, qualificação de leads, pipeline e Meta CAPI em um fluxo auditável.",
    url: "/",
    siteName: "PulseCamp",
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
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
