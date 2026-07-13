import { NextResponse } from "next/server";
import { z } from "zod";

import { updateQualificationThreshold } from "@/lib/clients";
import { apiError, requireClientAccess, requireSameOrigin, requireUser } from "@/lib/http";

export const runtime = "nodejs";

const BodySchema = z.object({ threshold: z.coerce.number().int().min(0).max(100) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request, "admin");
    const { id } = await context.params;
    requireClientAccess(user, id);
    const { threshold } = BodySchema.parse(await request.json());
    const result = updateQualificationThreshold(id, threshold);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return apiError(error, "Não foi possível salvar a regra de qualificação.");
  }
}
