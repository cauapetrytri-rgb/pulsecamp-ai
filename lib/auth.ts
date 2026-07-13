import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "pulsecamp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type UserRole = "admin" | "member";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientIds: string[];
};

type StoredUser = SessionUser & { passwordHash: string };
type SessionPayload = SessionUser & { exp: number };

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres em produção.");
  }
  return "pulsecamp-local-only-session-secret-change-me";
}

function hashPassword(password: string, salt: string) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function demoUsers(): StoredUser[] {
  return [
    {
      id: "user-demo-admin",
      name: "Gestor Demo",
      email: "admin@pulsecamp.demo",
      role: "admin",
      clientIds: ["*"],
      passwordHash: hashPassword("PulseCamp2026!", "pulsecamp-demo-admin"),
    },
    {
      id: "user-demo-member",
      name: "Analista Demo",
      email: "analista@pulsecamp.demo",
      role: "member",
      clientIds: ["client-solar"],
      passwordHash: hashPassword("Demo2026!", "pulsecamp-demo-member"),
    },
  ];
}

function configuredUsers(): StoredUser[] {
  const raw = process.env.AUTH_USERS_JSON;
  if (!raw) return demoUsers();
  const parsed = JSON.parse(raw) as StoredUser[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("AUTH_USERS_JSON inválido.");
  return parsed;
}

function passwordMatches(password: string, stored: string) {
  const separator = stored.indexOf(":");
  if (separator <= 0) return false;
  const salt = stored.slice(0, separator);
  const expected = Buffer.from(stored.slice(separator + 1), "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function authenticateCredentials(email: string, password: string): SessionUser | null {
  const user = configuredUsers().find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
  if (!user || !passwordMatches(password, user.passwordHash)) return null;
  const { passwordHash: _passwordHash, ...sessionUser } = user;
  return sessionUser;
}

function signature(encodedPayload: string) {
  return createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
}

export function createSessionToken(user: SessionUser) {
  const payload: SessionPayload = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) return null;
  const expected = Buffer.from(signature(encoded));
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    const { exp: _exp, ...user } = payload;
    return user;
  } catch {
    return null;
  }
}

function cookieValue(cookieHeader: string | null, name: string) {
  return cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function userFromRequest(request: Request) {
  return verifySessionToken(cookieValue(request.headers.get("cookie"), SESSION_COOKIE));
}

export async function getServerUser() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export function canAccessClient(user: SessionUser, clientId: string) {
  return user.role === "admin" || user.clientIds.includes("*") || user.clientIds.includes(clientId);
}

export function allowedClientIds(user: SessionUser) {
  return user.role === "admin" || user.clientIds.includes("*") ? undefined : user.clientIds;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
