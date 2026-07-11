import { NextResponse } from "next/server";

import { manuallyQualifyLead } from "@/lib/lead-pipeline";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const event = await manuallyQualifyLead(id);
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível qualificar o lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
