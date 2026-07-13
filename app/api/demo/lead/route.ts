import { NextResponse } from "next/server";
import { z } from "zod";

import { createDemoLead } from "@/lib/lead-pipeline";
import { apiError, requireClientAccess, requireSameOrigin, requireUser } from "@/lib/http";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const BodySchema = z.object({ clientId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request);
    const attempt = rateLimit(requestKey(request, `demo-lead:${user.id}`), 12, 60_000);
    if (!attempt.allowed) return NextResponse.json({ error: "Limite de simulações atingido.", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });
    const body = BodySchema.parse(await request.json());
    requireClientAccess(user, body.clientId);
    const result = await createDemoLead(body.clientId);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return apiError(error, "Não foi possível criar o lead demonstrativo.");
  }
}
