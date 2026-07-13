import { NextResponse } from "next/server";

import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { apiError, requireSameOrigin, requireUser } from "@/lib/http";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireUser(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return apiError(error, "Não foi possível encerrar a sessão.");
  }
}
