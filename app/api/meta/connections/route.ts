import { NextResponse } from "next/server";
import { z } from "zod";

import { saveMetaConnection } from "@/lib/meta-connections";
import { apiError, requireClientAccess, requireSameOrigin, requireUser } from "@/lib/http";

export const runtime = "nodejs";

const BodySchema = z.object({
  clientId: z.string().min(1), businessId: z.string().optional(), adAccountId: z.string().optional(),
  datasetId: z.string().min(2), wabaId: z.string().min(2), phoneNumberId: z.string().min(2),
  tokenEnvKey: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional().or(z.literal("")),
  accessToken: z.string().min(20).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request, "admin");
    const input = BodySchema.parse(await request.json());
    requireClientAccess(user, input.clientId);
    const result = saveMetaConnection(input);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return apiError(error, "Não foi possível salvar a conexão Meta.");
  }
}
