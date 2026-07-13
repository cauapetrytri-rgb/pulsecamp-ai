import { NextResponse } from "next/server";

import { manuallyQualifyLead } from "@/lib/lead-pipeline";
import { apiError, requireLeadAccess, requireSameOrigin, requireUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request);
    const { id } = await context.params;
    requireLeadAccess(user, id);
    const event = await manuallyQualifyLead(id);
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return apiError(error, "Não foi possível qualificar o lead.");
  }
}
