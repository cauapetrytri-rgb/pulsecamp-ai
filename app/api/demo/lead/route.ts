import { NextResponse } from "next/server";
import { z } from "zod";

import { createDemoLead } from "@/lib/lead-pipeline";

export const runtime = "nodejs";

const BodySchema = z.object({ clientId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const result = await createDemoLead(body.clientId);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o lead demonstrativo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
