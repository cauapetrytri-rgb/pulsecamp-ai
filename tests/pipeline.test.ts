import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { getDb, resetDatabaseForTests } from "../lib/db";
import { moveLeadToStage, registerSale } from "../lib/lead-pipeline";
import { buildMetaJourneyPayload, buildMetaQualifiedLeadPayload, hashPhone } from "../lib/meta";
import { qualifyWithRules } from "../lib/qualification";
import { parseWhatsAppWebhook, verifyMetaSignature } from "../lib/webhook";

test("extrai atribuição CTWA da primeira mensagem do WhatsApp", () => {
  const messages = parseWhatsAppWebhook({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-123",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-456" },
              contacts: [{ wa_id: "5511999999999", profile: { name: "Maria" } }],
              messages: [
                {
                  id: "wamid.abc",
                  from: "5511999999999",
                  timestamp: "1783612800",
                  type: "text",
                  text: { body: "Quero um orçamento" },
                  referral: {
                    ctwa_clid: "ctwa-click-789",
                    source_id: "ad-321",
                    headline: "Oferta principal",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].ctwaClid, "ctwa-click-789");
  assert.equal(messages[0].sourceAdId, "ad-321");
  assert.equal(messages[0].phoneNumberId, "phone-456");
  assert.equal(messages[0].displayName, "Maria");
});

test("valida assinatura HMAC enviada pela Meta", () => {
  const body = JSON.stringify({ ok: true });
  const secret = "app-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  assert.equal(verifyMetaSignature(body, signature, secret).valid, true);
  assert.equal(verifyMetaSignature(`${body}x`, signature, secret).valid, false);
});

test("qualifica lead com intenção, orçamento e urgência explícitos", () => {
  const result = qualifyWithRules(
    "Quero contratar ainda esta semana. Minha conta é R$ 1.400 e preciso de um orçamento agora.",
    70,
  );

  assert.equal(result.qualified, true);
  assert.ok(result.score >= 70);
  assert.equal(result.tier, "hot");
});

test("monta evento de mensageria com identificadores de atribuição", () => {
  const payload = buildMetaQualifiedLeadPayload({
    clientId: "client-1",
    leadId: "lead-1",
    phone: "+55 (11) 99999-9999",
    ctwaClid: "ctwa-1",
    wabaId: "waba-1",
    score: 88,
    tier: "hot",
    qualificationProvider: "openai",
    timestamp: 1783612800,
  });
  const event = payload.data[0];

  assert.equal(event.event_name, "LeadSubmitted");
  assert.equal(event.action_source, "business_messaging");
  assert.equal(event.messaging_channel, "whatsapp");
  assert.equal(event.user_data.ctwa_clid, "ctwa-1");
  assert.equal(event.user_data.whatsapp_business_account_id, "waba-1");
  assert.equal(event.user_data.ph[0], hashPhone("5511999999999"));
  assert.equal(event.event_id, "qualified:client-1:lead-1");
});

test("monta Purchase com valor, moeda e idempotência por venda", () => {
  const event = buildMetaJourneyPayload({
    clientId: "client-1", leadId: "lead-1", stageKey: "won", eventName: "Purchase",
    phone: "5511999999999", wabaId: "waba-1", ctwaClid: "ctwa-1", score: 90,
    tier: "hot", qualificationProvider: "rules", value: 12500, currency: "BRL",
    referenceId: "sale-1", timestamp: 1783612800,
  }).data[0];

  assert.equal(event.event_name, "Purchase");
  assert.equal(event.custom_data.value, 12500);
  assert.equal(event.custom_data.currency, "BRL");
  assert.equal(event.event_id, "won:client-1:lead-1:sale-1");
});

test("persiste mudança de jornada e venda com eventos CAPI", async () => {
  process.env.DATABASE_PATH = ":memory:";
  process.env.META_CAPI_DRY_RUN = "true";
  resetDatabaseForTests();
  getDb();

  await moveLeadToStage("lead-joao", "scheduled", "test");
  const scheduled = getDb().prepare("SELECT current_stage FROM leads WHERE id = 'lead-joao'").get() as { current_stage: string };
  assert.equal(scheduled.current_stage, "scheduled");

  const sale = await registerSale({ leadId: "lead-joao", value: 18900, currency: "BRL" });
  const purchase = getDb().prepare("SELECT event_name, status FROM meta_events WHERE event_id = ?").get(`won:client-solar:lead-joao:${sale.id}`) as { event_name: string; status: string };
  assert.equal(purchase.event_name, "Purchase");
  assert.equal(purchase.status, "dry_run");
  assert.equal((getDb().prepare("SELECT current_stage FROM leads WHERE id = 'lead-joao'").get() as { current_stage: string }).current_stage, "won");

  resetDatabaseForTests();
  delete process.env.DATABASE_PATH;
});
