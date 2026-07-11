import { NextResponse } from "next/server";
import { z } from "zod";

import { updateQualificationThreshold } from "@/lib/clients";

export const runtime = "nodejs";

const BodySchema = z.object({ threshold: z.coerce.number().int().min(0).max(100) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { threshold } = BodySchema.parse(await request.json());
    const result = updateQualificationThreshold(id, threshold);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar a regra de qualificação.";
    return NextResponse.json({ error: message }, { status: message === "Empresa não encontrada." ? 404 : 400 });
  }
}
