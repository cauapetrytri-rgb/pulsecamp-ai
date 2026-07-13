import { NextResponse } from "next/server";

import { testMetaConnection } from "@/lib/meta-connections";
import { apiError, requireClientAccess, requireSameOrigin, requireUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ clientId: string }> }) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request, "admin");
    const { clientId } = await context.params;
    requireClientAccess(user, clientId);
    return NextResponse.json({ ok: true, result: await testMetaConnection(clientId) });
  } catch (error) {
    return apiError(error, "Não foi possível testar a conexão Meta.");
  }
}
