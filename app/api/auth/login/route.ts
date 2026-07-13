import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateCredentials, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { ApiError, apiError, requireSameOrigin } from "@/lib/http";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const attempt = rateLimit(requestKey(request, "login"), 8, 10 * 60_000);
    if (!attempt.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde antes de tentar novamente.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } },
      );
    }
    const { email, password } = BodySchema.parse(await request.json());
    const user = authenticateCredentials(email, password);
    if (!user) throw new ApiError(401, "E-mail ou senha inválidos.", "INVALID_CREDENTIALS");
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions);
    return response;
  } catch (error) {
    return apiError(error, "Não foi possível entrar.");
  }
}
