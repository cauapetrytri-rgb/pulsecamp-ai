import { NextResponse } from "next/server";
import { z } from "zod";

import { registerSale } from "@/lib/lead-pipeline";

export const runtime = "nodejs";
const BodySchema = z.object({ leadId: z.string().min(1), value: z.coerce.number().positive(), currency: z.string().length(3).default("BRL") });

export async function POST(request: Request) {
  try {
    const result = await registerSale(BodySchema.parse(await request.json()));
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível registrar a venda." }, { status: 400 });
  }
}
