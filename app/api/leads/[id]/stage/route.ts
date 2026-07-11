import { NextResponse } from "next/server";
import { z } from "zod";

import { moveLeadToStage } from "@/lib/lead-pipeline";

export const runtime = "nodejs";
const BodySchema = z.object({ stageKey: z.enum(["contact", "qualified", "scheduled", "proposal", "lost"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = BodySchema.parse(await request.json());
    return NextResponse.json({ ok: true, result: await moveLeadToStage(id, body.stageKey) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível mover o lead." }, { status: 400 });
  }
}
