import assert from "node:assert/strict";
import test from "node:test";

import { authenticateCredentials, canAccessClient, createSessionToken, verifySessionToken } from "../lib/auth";

process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";

test("autentica o perfil admin sem expor a senha na sessão", () => {
  const user = authenticateCredentials("admin@pulsecamp.demo", "PulseCamp2026!");
  assert.ok(user);
  assert.equal(user.role, "admin");
  assert.equal("passwordHash" in user, false);
  assert.deepEqual(verifySessionToken(createSessionToken(user)), user);
});

test("rejeita senha inválida e aplica isolamento por empresa", () => {
  assert.equal(authenticateCredentials("admin@pulsecamp.demo", "senha-errada"), null);
  const member = authenticateCredentials("analista@pulsecamp.demo", "Demo2026!");
  assert.ok(member);
  assert.equal(canAccessClient(member, "client-solar"), true);
  assert.equal(canAccessClient(member, "client-alfa"), false);
});

test("rejeita sessão adulterada", () => {
  const user = authenticateCredentials("admin@pulsecamp.demo", "PulseCamp2026!");
  assert.ok(user);
  const token = createSessionToken(user);
  assert.equal(verifySessionToken(`${token}x`), null);
});
