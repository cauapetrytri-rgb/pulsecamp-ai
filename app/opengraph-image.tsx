import { ImageResponse } from "next/og";

export const alt = "PulseCamp — campanhas, leads e conversões em um só fluxo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", background: "#f4f5f8", color: "#1d1c31", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 30, fontWeight: 800 }}>
        <div style={{ width: 58, height: 58, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "#5d4df2", color: "white", fontSize: 20 }}>PC</div>
        PulseCamp
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: 980 }}>
        <div style={{ color: "#5d4df2", fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>SAAS FULL STACK</div>
        <div style={{ fontSize: 70, lineHeight: 1.04, fontWeight: 850, letterSpacing: -3 }}>Campanhas, leads e conversões em um fluxo auditável.</div>
        <div style={{ color: "#656879", fontSize: 28 }}>Next.js · TypeScript · RBAC · Meta CAPI · Playwright</div>
      </div>
    </div>,
    size,
  );
}
