import { NextResponse } from "next/server";
import { z } from "zod";

import { saveMetaConnection } from "@/lib/meta-connections";

export const runtime = "nodejs";

const BodySchema = z.object({
  clientId: z.string().min(1), businessId: z.string().optional(), adAccountId: z.string().optional(),
  datasetId: z.string().min(2), wabaId: z.string().min(2), phoneNumberId: z.string().min(2),
  tokenEnvKey: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional().or(z.literal("")),
  accessToken: z.string().min(20).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const result = saveMetaConnection(BodySchema.parse(await request.json()));
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a conexão Meta." }, { status: 400 });
  }
}
