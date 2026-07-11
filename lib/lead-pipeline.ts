import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { buildMetaJourneyPayload, hashPhone, journeyEventId, sendMetaCapiEvent, type MetaCapiPayload } from "@/lib/meta";
import { qualifyConversation, qualifyWithRules, type QualificationResult } from "@/lib/qualification";
import { decryptSecret } from "@/lib/secrets";
import { parseTrackingReference } from "@/lib/tracking";
import type { ClientRecord, InboundWhatsAppMessage, JourneyStageKey, JourneyStageRecord, LeadRecord, MetaEventRecord, MetaStandardEvent } from "@/lib/types";

type LeadContext = LeadRecord & {
  client_name: string;
  client_threshold: number;
  client_waba_id: string | null;
  client_dataset_id: string | null;
  client_token_env_key: string | null;
  client_access_token_ciphertext: string | null;
  click_tracking_json: string | null;
  click_occurred_at: string | null;
};

function now() {
  return new Date().toISOString();
}

function getLeadContext(leadId: string): LeadContext | undefined {
  return getDb().prepare(`
    SELECT l.*, c.name AS client_name, c.qualification_threshold AS client_threshold,
      COALESCE(m.waba_id, c.waba_id) AS client_waba_id,
      COALESCE(m.dataset_id, c.meta_dataset_id) AS client_dataset_id,
      COALESCE(m.token_env_key, c.meta_token_env_key) AS client_token_env_key,
      m.access_token_ciphertext AS client_access_token_ciphertext,
      click.tracking_json AS click_tracking_json, click.occurred_at AS click_occurred_at
    FROM leads l JOIN clients c ON c.id = l.client_id
    LEFT JOIN meta_connections m ON m.client_id = c.id
    LEFT JOIN tracked_link_clicks click ON click.id = l.tracked_click_id
    WHERE l.id = ?
  `).get(leadId) as unknown as LeadContext | undefined;
}

function getStage(clientId: string, stageKey: JourneyStageKey) {
  return getDb().prepare(`
    SELECT * FROM journey_stages WHERE client_id = ? AND stage_key = ?
  `).get(clientId, stageKey) as unknown as JourneyStageRecord | undefined;
}

function saveEvent(options: {
  lead: LeadContext;
  stageKey: JourneyStageKey;
  eventName: MetaStandardEvent;
  eventId: string;
  request: unknown;
  status: MetaEventRecord["status"];
  response?: unknown;
  error?: string | null;
}) {
  const createdAt = now();
  getDb().prepare(`
    INSERT INTO meta_events (
      id, lead_id, client_id, event_name, event_id, status, attempts, request_json,
      response_json, last_error, created_at, sent_at, stage_key
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id) DO UPDATE SET
      status = excluded.status, attempts = meta_events.attempts + 1,
      request_json = excluded.request_json, response_json = excluded.response_json,
      last_error = excluded.last_error, sent_at = excluded.sent_at, stage_key = excluded.stage_key
  `).run(
    randomUUID(), options.lead.id, options.lead.client_id, options.eventName, options.eventId,
    options.status, JSON.stringify(options.request),
    options.response === undefined ? null : JSON.stringify(options.response), options.error ?? null,
    createdAt, options.status === "sent" || options.status === "dry_run" ? createdAt : null, options.stageKey,
  );
  return getDb().prepare("SELECT * FROM meta_events WHERE event_id = ?").get(options.eventId) as unknown as MetaEventRecord;
}

export async function syncJourneyStageToMeta(options: {
  leadId: string;
  stageKey: JourneyStageKey;
  value?: number;
  currency?: string;
  referenceId?: string;
  force?: boolean;
}) {
  const lead = getLeadContext(options.leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  const stage = getStage(lead.client_id, options.stageKey);
  if (!stage || !stage.enabled || !stage.event_name) return null;
  if (stage.requires_value && (!options.value || options.value <= 0)) throw new Error(`A etapa ${stage.label} exige um valor maior que zero.`);

  const eventId = journeyEventId(lead.client_id, lead.id, options.stageKey, options.referenceId);
  const existing = getDb().prepare("SELECT * FROM meta_events WHERE event_id = ?").get(eventId) as unknown as MetaEventRecord | undefined;
  if (!options.force && existing && (existing.status === "sent" || existing.status === "dry_run")) return existing;

  if (!lead.client_waba_id || !lead.client_dataset_id) {
    return saveEvent({
      lead, stageKey: options.stageKey, eventName: stage.event_name, eventId,
      request: { event_name: stage.event_name, reason: "missing_meta_assets" }, status: "failed",
      error: "Configure WABA, número do WhatsApp e Pixel/conjunto de dados deste cliente.",
    });
  }

  const payload = buildMetaJourneyPayload({
    clientId: lead.client_id, leadId: lead.id, stageKey: options.stageKey, eventName: stage.event_name,
    phone: lead.wa_id, ctwaClid: lead.ctwa_clid, fbc: clickFbc(lead.click_tracking_json, lead.click_occurred_at), wabaId: lead.client_waba_id,
    score: lead.score, tier: lead.tier, qualificationProvider: lead.qualification_provider,
    value: options.value, currency: options.currency, referenceId: options.referenceId,
  });
  const dryRun = process.env.META_CAPI_DRY_RUN !== "false";
  const token = lead.client_access_token_ciphertext
    ? decryptSecret(lead.client_access_token_ciphertext)
    : lead.client_token_env_key ? process.env[lead.client_token_env_key] : undefined;
  if (!dryRun && !token) {
    return saveEvent({
      lead, stageKey: options.stageKey, eventName: stage.event_name, eventId, request: payload, status: "failed",
      error: `Credencial ausente: ${lead.client_token_env_key || "token da CAPI"}.`,
    });
  }

  saveEvent({ lead, stageKey: options.stageKey, eventName: stage.event_name, eventId, request: payload, status: "pending" });
  const result = await sendMetaCapiEvent({ datasetId: lead.client_dataset_id, accessToken: token || "dry-run-token", payload });
  getDb().prepare(`
    UPDATE meta_events SET status = ?, response_json = ?, last_error = ?, sent_at = ? WHERE event_id = ?
  `).run(
    result.status, result.response === null ? null : JSON.stringify(result.response), result.error,
    result.status === "sent" || result.status === "dry_run" ? now() : null, eventId,
  );
  return getDb().prepare("SELECT * FROM meta_events WHERE event_id = ?").get(eventId) as unknown as MetaEventRecord;
}

function clickFbc(trackingJson: string | null, occurredAt: string | null) {
  if (!trackingJson) return null;
  try {
    const tracking = JSON.parse(trackingJson) as { fbclid?: string };
    if (!tracking.fbclid) return null;
    return `fb.1.${occurredAt ? new Date(occurredAt).getTime() : Date.now()}.${tracking.fbclid}`;
  } catch {
    return null;
  }
}

export function syncQualifiedLeadToMeta(leadId: string, force = false) {
  return syncJourneyStageToMeta({ leadId, stageKey: "qualified", force });
}

function recordStageHistory(lead: LeadContext | LeadRecord, stageKey: JourneyStageKey, source: string) {
  getDb().prepare(`
    INSERT INTO lead_stage_history (id, lead_id, client_id, stage_key, occurred_at, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), lead.id, lead.client_id, stageKey, now(), source);
}

export async function moveLeadToStage(leadId: string, stageKey: JourneyStageKey, source = "manual") {
  if (stageKey === "won") throw new Error("Para marcar como venda, registre também o valor da compra.");
  const lead = getLeadContext(leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  const stage = getStage(lead.client_id, stageKey);
  if (!stage) throw new Error("Etapa não configurada para este cliente.");
  const status = stageKey === "qualified" || stageKey === "scheduled" || stageKey === "proposal" ? "qualified" : stageKey === "lost" ? "lost" : "nurturing";
  getDb().prepare(`
    UPDATE leads SET current_stage = ?, status = ?, qualified_at = CASE WHEN ? = 'qualified' THEN COALESCE(qualified_at, ?) ELSE qualified_at END, updated_at = ? WHERE id = ?
  `).run(stageKey, status, status, now(), now(), leadId);
  recordStageHistory(lead, stageKey, source);
  const event = await syncJourneyStageToMeta({ leadId, stageKey });
  return { leadId, stageKey, event };
}

export async function registerSale(options: { leadId: string; value: number; currency?: string; occurredAt?: string }) {
  const lead = getLeadContext(options.leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  if (!Number.isFinite(options.value) || options.value <= 0) throw new Error("Informe um valor de venda maior que zero.");
  const saleId = randomUUID();
  const occurredAt = options.occurredAt || now();
  const currency = (options.currency || "BRL").toUpperCase();
  getDb().prepare(`
    INSERT INTO sales (id, client_id, lead_id, value, currency, occurred_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(saleId, lead.client_id, lead.id, options.value, currency, occurredAt, now());
  getDb().prepare("UPDATE leads SET current_stage = 'won', status = 'won', updated_at = ? WHERE id = ?").run(now(), lead.id);
  recordStageHistory(lead, "won", "sale");
  if (lead.source_ad_id) {
    getDb().prepare("UPDATE campaigns SET sales = sales + 1, revenue = revenue + ? WHERE client_id = ? AND ad_id = ?")
      .run(options.value, lead.client_id, lead.source_ad_id);
  }
  const event = await syncJourneyStageToMeta({ leadId: lead.id, stageKey: "won", value: options.value, currency, referenceId: saleId });
  return { id: saleId, leadId: lead.id, value: options.value, currency, event };
}

async function safeQualify(conversation: string, threshold: number): Promise<QualificationResult> {
  try { return await qualifyConversation(conversation, threshold); } catch { return qualifyWithRules(conversation, threshold); }
}

export async function processInboundMessage(message: InboundWhatsAppMessage) {
  const db = getDb();
  const trackedReference = parseTrackingReference(message.text);
  const client = db.prepare(`
    SELECT c.* FROM clients c LEFT JOIN meta_connections m ON m.client_id = c.id
    WHERE COALESCE(m.phone_number_id, c.phone_number_id) = ? OR COALESCE(m.waba_id, c.waba_id) = ? LIMIT 1
  `).get(message.phoneNumberId, message.wabaId) as unknown as ClientRecord | undefined;
  if (!client) throw new Error(`Nenhum cliente encontrado para phone_number_id ${message.phoneNumberId}.`);
  const trackedClick = trackedReference.token ? db.prepare(`
    SELECT click.id, link.channel, link.campaign FROM tracked_link_clicks click
    JOIN tracked_links link ON link.id = click.link_id
    WHERE click.token = ? AND link.client_id = ? LIMIT 1
  `).get(trackedReference.token, client.id) as { id: string; channel: string; campaign: string } | undefined : undefined;

  const previousReceipt = db.prepare("SELECT status FROM webhook_receipts WHERE message_id = ?").get(message.messageId) as { status: string } | undefined;
  if (previousReceipt?.status === "processed") return { duplicate: true, leadId: null, qualification: null, event: null, events: [] };
  db.prepare(`
    INSERT INTO webhook_receipts (message_id, client_id, received_at, status, error)
    VALUES (?, ?, ?, 'received', NULL)
    ON CONFLICT(message_id) DO UPDATE SET status = 'received', error = NULL, received_at = excluded.received_at
  `).run(message.messageId, client.id, now());

  let lead = db.prepare("SELECT * FROM leads WHERE client_id = ? AND wa_id = ?").get(client.id, message.from) as unknown as LeadRecord | undefined;
  const isNewLead = !lead;
  const occurredAt = new Date(message.timestamp * 1000).toISOString();
  if (!lead) {
    const leadId = randomUUID();
    db.prepare(`
      INSERT INTO leads (
        id, client_id, wa_id, display_name, phone_hash, status, score, tier, ctwa_clid,
        source_ad_id, source_headline, tracked_click_id, source_channel, source_campaign,
        current_stage, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'new', 0, 'cold', ?, ?, ?, ?, ?, ?, 'contact', ?, ?)
    `).run(
      leadId, client.id, message.from, message.displayName, hashPhone(message.from), message.ctwaClid,
      message.sourceAdId, message.sourceHeadline, trackedClick?.id || null, trackedClick?.channel || null,
      trackedClick?.campaign || null, occurredAt, occurredAt,
    );
    lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId) as unknown as LeadRecord;
    recordStageHistory(lead, "contact", "whatsapp");
  } else {
    db.prepare(`
      UPDATE leads SET display_name = ?, ctwa_clid = COALESCE(ctwa_clid, ?),
        source_ad_id = COALESCE(source_ad_id, ?), source_headline = COALESCE(source_headline, ?),
        tracked_click_id = COALESCE(tracked_click_id, ?), source_channel = COALESCE(source_channel, ?),
        source_campaign = COALESCE(source_campaign, ?), updated_at = ? WHERE id = ?
    `).run(message.displayName, message.ctwaClid, message.sourceAdId, message.sourceHeadline, trackedClick?.id || null,
      trackedClick?.channel || null, trackedClick?.campaign || null, occurredAt, lead.id);
  }

  db.prepare(`INSERT OR IGNORE INTO lead_messages (id, lead_id, message_id, direction, body, occurred_at) VALUES (?, ?, ?, 'inbound', ?, ?)`)
    .run(randomUUID(), lead.id, message.messageId, trackedReference.cleanText, occurredAt);
  const messages = db.prepare("SELECT direction, body FROM lead_messages WHERE lead_id = ? ORDER BY occurred_at ASC").all(lead.id) as unknown as Array<{ direction: string; body: string }>;
  const conversation = messages.map((item) => `${item.direction === "inbound" ? "Lead" : "Empresa"}: ${item.body}`).join("\n");
  const previousQualified = lead.status === "qualified" || lead.status === "won" || Boolean(lead.qualified_at);
  const qualification = await safeQualify(conversation, client.qualification_threshold);
  const becameQualified = !previousQualified && qualification.qualified;
  const qualifiedAt = qualification.qualified ? lead.qualified_at || now() : lead.qualified_at;
  const nextStatus = previousQualified || qualification.qualified ? "qualified" : qualification.score >= 50 ? "nurturing" : "new";
  const nextStage = becameQualified ? "qualified" : lead.current_stage || "contact";

  db.prepare(`
    UPDATE leads SET status = ?, current_stage = ?, score = ?, tier = ?, intent = ?, urgency = ?, budget_signal = ?,
      location_signal = ?, reasons_json = ?, objections_json = ?, recommended_action = ?, qualification_provider = ?,
      qualified_at = ?, updated_at = ? WHERE id = ?
  `).run(
    nextStatus, nextStage, qualification.score, qualification.tier, qualification.intent, qualification.urgency,
    qualification.budgetSignal, qualification.locationSignal, JSON.stringify(qualification.reasons),
    JSON.stringify(qualification.objections), qualification.recommendedAction, qualification.provider, qualifiedAt, now(), lead.id,
  );

  if (isNewLead && message.sourceAdId) db.prepare("UPDATE campaigns SET conversations = conversations + 1 WHERE client_id = ? AND ad_id = ?").run(client.id, message.sourceAdId);
  if (becameQualified) {
    recordStageHistory(lead, "qualified", "qualification");
    if (message.sourceAdId) db.prepare("UPDATE campaigns SET qualified = qualified + 1 WHERE client_id = ? AND ad_id = ?").run(client.id, message.sourceAdId);
  }

  const events: Array<MetaEventRecord | null> = [];
  if (isNewLead) events.push(await syncJourneyStageToMeta({ leadId: lead.id, stageKey: "contact" }));
  if (becameQualified) events.push(await syncJourneyStageToMeta({ leadId: lead.id, stageKey: "qualified" }));
  const filteredEvents = events.filter((item): item is MetaEventRecord => Boolean(item));
  db.prepare("UPDATE webhook_receipts SET status = 'processed' WHERE message_id = ?").run(message.messageId);
  return { duplicate: false, leadId: lead.id, qualification, event: filteredEvents.at(-1) || null, events: filteredEvents };
}

export function markWebhookReceiptFailed(messageId: string, error: string) {
  getDb().prepare("UPDATE webhook_receipts SET status = 'failed', error = ? WHERE message_id = ?").run(error, messageId);
}

export async function manuallyQualifyLead(leadId: string) {
  const lead = getLeadContext(leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  getDb().prepare(`
    UPDATE leads SET status = 'qualified', current_stage = 'qualified', score = CASE WHEN score < 85 THEN 85 ELSE score END,
      tier = CASE WHEN score < 80 THEN 'hot' ELSE tier END, qualified_at = COALESCE(qualified_at, ?),
      qualification_provider = 'manual', recommended_action = 'Qualificação confirmada pelo gestor. Priorizar contato comercial.', updated_at = ? WHERE id = ?
  `).run(now(), now(), leadId);
  recordStageHistory(lead, "qualified", "manual");
  return syncQualifiedLeadToMeta(leadId);
}

export async function retryMetaEvent(eventRecordId: string) {
  const event = getDb().prepare("SELECT * FROM meta_events WHERE id = ?").get(eventRecordId) as unknown as MetaEventRecord | undefined;
  if (!event) throw new Error("Evento não encontrado.");
  const connection = getDb().prepare("SELECT * FROM meta_connections WHERE client_id = ?").get(event.client_id) as unknown as { dataset_id: string | null; token_env_key: string | null; access_token_ciphertext: string | null } | undefined;
  if (!connection?.dataset_id) throw new Error("Cliente sem Pixel/conjunto de dados configurado.");
  const token = connection.access_token_ciphertext
    ? decryptSecret(connection.access_token_ciphertext)
    : connection.token_env_key ? process.env[connection.token_env_key] : undefined;
  if (process.env.META_CAPI_DRY_RUN === "false" && !token) throw new Error(`Credencial ausente: ${connection.token_env_key || "token da CAPI"}.`);
  const payload = JSON.parse(event.request_json) as MetaCapiPayload;
  const result = await sendMetaCapiEvent({ datasetId: connection.dataset_id, accessToken: token || "dry-run-token", payload });
  getDb().prepare(`UPDATE meta_events SET status = ?, attempts = attempts + 1, response_json = ?, last_error = ?, sent_at = ? WHERE id = ?`).run(
    result.status, result.response === null ? null : JSON.stringify(result.response), result.error,
    result.status === "sent" || result.status === "dry_run" ? now() : null, eventRecordId,
  );
  return getDb().prepare("SELECT * FROM meta_events WHERE id = ?").get(eventRecordId) as unknown as MetaEventRecord;
}

export async function createDemoLead(clientId: string) {
  const client = getDb().prepare(`
    SELECT c.*, COALESCE(m.phone_number_id, c.phone_number_id) AS phone_number_id,
      COALESCE(m.waba_id, c.waba_id) AS waba_id FROM clients c
    LEFT JOIN meta_connections m ON m.client_id = c.id WHERE c.id = ?
  `).get(clientId) as unknown as ClientRecord | undefined;
  if (!client?.phone_number_id || !client.waba_id) throw new Error("Cliente sem integração WhatsApp configurada.");
  const suffix = String(Date.now()).slice(-7);
  const sourceAd = getDb().prepare("SELECT ad_id, ad_name FROM campaigns WHERE client_id = ? ORDER BY spend DESC LIMIT 1").get(clientId) as { ad_id: string; ad_name: string } | undefined;
  return processInboundMessage({
    messageId: `wamid.demo.${randomUUID()}`, wabaId: client.waba_id, phoneNumberId: client.phone_number_id,
    from: `55119${suffix}`, displayName: "Lead demonstrativo", timestamp: Math.floor(Date.now() / 1000),
    text: "Tenho interesse e quero fechar ainda esta semana. Minha conta hoje é R$ 1.200 e gostaria de receber um orçamento agora.",
    ctwaClid: `ctwa.demo.${randomUUID()}`, sourceAdId: sourceAd?.ad_id || null,
    sourceUrl: "https://fb.me/demo-ad", sourceHeadline: sourceAd?.ad_name || "Anúncio demonstrativo",
  });
}
