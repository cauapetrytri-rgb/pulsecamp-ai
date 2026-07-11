import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/clients";

export const runtime = "nodejs";

const BodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  niche: z.string().trim().min(2).max(80),
  qualificationThreshold: z.coerce.number().int().min(0).max(100).default(70),
});

export async function POST(request: Request) {
  try {
    const client = createClient(BodySchema.parse(await request.json()));
    return NextResponse.json({ ok: true, client }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível adicionar a empresa.";
    return NextResponse.json({ error: message }, { status: message.includes("10 empresas") ? 409 : 400 });
  }
}
