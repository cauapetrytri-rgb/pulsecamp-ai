import { NextResponse } from "next/server";

import { canAccessClient, type SessionUser, userFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
  }
}

export function requireUser(request: Request, role?: "admin") {
  const user = userFromRequest(request);
  if (!user) throw new ApiError(401, "Faça login para continuar.", "UNAUTHENTICATED");
  if (role === "admin" && user.role !== "admin") throw new ApiError(403, "Ação permitida somente para administradores.", "FORBIDDEN");
  return user;
}

export function requireClientAccess(user: SessionUser, clientId: string) {
  if (!canAccessClient(user, clientId)) throw new ApiError(403, "Você não tem acesso a esta empresa.", "FORBIDDEN");
}

export function requireLeadAccess(user: SessionUser, leadId: string) {
  const row = getDb().prepare("SELECT client_id FROM leads WHERE id = ?").get(leadId) as { client_id: string } | undefined;
  if (!row) throw new ApiError(404, "Lead não encontrado.", "NOT_FOUND");
  requireClientAccess(user, row.client_id);
  return row.client_id;
}

export function requireEventAccess(user: SessionUser, eventId: string) {
  const row = getDb().prepare("SELECT client_id FROM meta_events WHERE id = ?").get(eventId) as { client_id: string } | undefined;
  if (!row) throw new ApiError(404, "Evento não encontrado.", "NOT_FOUND");
  requireClientAccess(user, row.client_id);
  return row.client_id;
}

export function requireSiteAccess(user: SessionUser, siteId: string) {
  const row = getDb().prepare("SELECT client_id FROM tracking_sites WHERE id = ?").get(siteId) as { client_id: string } | undefined;
  if (!row) throw new ApiError(404, "Site não encontrado.", "NOT_FOUND");
  requireClientAccess(user, row.client_id);
  return row.client_id;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configuredOrigin = process.env.APP_ORIGIN;
  const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  const valid = origin && (configuredOrigin ? origin === configuredOrigin : new URL(origin).host === requestHost);
  if (!valid) {
    throw new ApiError(403, "Origem da requisição não permitida.", "INVALID_ORIGIN");
  }
}

export function apiError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof Error && error.name === "ZodError") {
    return NextResponse.json({ error: "Dados inválidos.", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  logError(error, fallback);
  return NextResponse.json({ error: fallback, code: "INTERNAL_ERROR" }, { status: 500 });
}

export function logError(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  console.error(JSON.stringify({ level: "error", context, message, timestamp: new Date().toISOString() }));
}
