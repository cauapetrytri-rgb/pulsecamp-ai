import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "pulsecamp-ai",
    capiMode: process.env.META_CAPI_DRY_RUN === "false" ? "live" : "dry_run",
    aiProvider: process.env.OPENAI_API_KEY ? "openai" : "rules",
    graphVersion: process.env.META_GRAPH_API_VERSION || "v25.0",
  });
}
