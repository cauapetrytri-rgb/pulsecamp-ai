import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/clients";
import { apiError, requireSameOrigin, requireUser } from "@/lib/http";

export const runtime = "nodejs";

const BodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  niche: z.string().trim().min(2).max(80),
  qualificationThreshold: z.coerce.number().int().min(0).max(100).default(70),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireUser(request, "admin");
    const client = createClient(BodySchema.parse(await request.json()));
    return NextResponse.json({ ok: true, client }, { status: 201 });
  } catch (error) {
    return apiError(error, "Não foi possível adicionar a empresa.");
  }
}
