import { NextResponse } from "next/server";

import { testMetaConnection } from "@/lib/meta-connections";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await context.params;
    return NextResponse.json({ ok: true, result: await testMetaConnection(clientId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível testar a conexão Meta." }, { status: 400 });
  }
}
