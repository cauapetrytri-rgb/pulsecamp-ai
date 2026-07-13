import { NextResponse } from "next/server";

import { retryMetaEvent } from "@/lib/lead-pipeline";
import { apiError, requireEventAccess, requireSameOrigin, requireUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request);
    const { id } = await context.params;
    requireEventAccess(user, id);
    const event = await retryMetaEvent(id);
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return apiError(error, "Não foi possível reenviar o evento.");
  }
}
