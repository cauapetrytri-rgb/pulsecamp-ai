import { NextResponse } from "next/server";
import { z } from "zod";

import { registerSale } from "@/lib/lead-pipeline";
import { apiError, requireLeadAccess, requireSameOrigin, requireUser } from "@/lib/http";

export const runtime = "nodejs";
const BodySchema = z.object({ leadId: z.string().min(1), value: z.coerce.number().positive(), currency: z.string().length(3).default("BRL") });

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request);
    const input = BodySchema.parse(await request.json());
    requireLeadAccess(user, input.leadId);
    const result = await registerSale(input);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return apiError(error, "Não foi possível registrar a venda.");
  }
}
