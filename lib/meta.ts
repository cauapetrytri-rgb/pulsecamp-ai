import { createHash } from "node:crypto";

import type { JourneyStageKey, LeadTier, MetaEventStatus, MetaStandardEvent } from "@/lib/types";

export type MetaJourneyEventInput = {
  clientId: string;
  leadId: string;
  stageKey: JourneyStageKey;
  eventName: MetaStandardEvent;
  phone: string;
  wabaId: string;
  ctwaClid?: string | null;
  fbc?: string | null;
  score: number;
  tier: LeadTier;
  qualificationProvider: string;
  value?: number;
  currency?: string;
  referenceId?: string;
  timestamp?: number;
};

export type MetaQualifiedLeadInput = Omit<MetaJourneyEventInput, "stageKey" | "eventName" | "ctwaClid"> & {
  ctwaClid: string;
};

export type MetaCapiPayload = {
  data: Array<{
    event_name: MetaStandardEvent;
    event_time: number;
    event_id: string;
    action_source: "business_messaging";
    messaging_channel: "whatsapp";
    user_data: {
      ph: string[];
      ctwa_clid?: string;
      fbc?: string;
      whatsapp_business_account_id: string;
    };
    custom_data: {
      stage: JourneyStageKey;
      lead_score: number;
      lead_tier: LeadTier;
      qualification_source: string;
      value?: number;
      currency?: string;
    };
  }>;
  test_event_code?: string;
};

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function hashPhone(phone: string) {
  return createHash("sha256").update(normalizePhone(phone)).digest("hex");
}

export function qualifiedLeadEventId(clientId: string, leadId: string) {
  return `qualified:${clientId}:${leadId}`;
}

export function journeyEventId(clientId: string, leadId: string, stageKey: JourneyStageKey, referenceId?: string) {
  if (stageKey === "qualified" && !referenceId) return qualifiedLeadEventId(clientId, leadId);
  return `${stageKey}:${clientId}:${leadId}${referenceId ? `:${referenceId}` : ""}`;
}

export function buildMetaJourneyPayload(input: MetaJourneyEventInput): MetaCapiPayload {
  const userData: MetaCapiPayload["data"][number]["user_data"] = {
    ph: [hashPhone(input.phone)],
    whatsapp_business_account_id: input.wabaId,
  };
  if (input.ctwaClid) userData.ctwa_clid = input.ctwaClid;
  if (input.fbc) userData.fbc = input.fbc;

  const customData: MetaCapiPayload["data"][number]["custom_data"] = {
    stage: input.stageKey,
    lead_score: input.score,
    lead_tier: input.tier,
    qualification_source: input.qualificationProvider,
  };
  if (typeof input.value === "number") {
    customData.value = input.value;
    customData.currency = input.currency || "BRL";
  }

  const payload: MetaCapiPayload = {
    data: [{
      event_name: input.eventName,
      event_time: input.timestamp ?? Math.floor(Date.now() / 1000),
      event_id: journeyEventId(input.clientId, input.leadId, input.stageKey, input.referenceId),
      action_source: "business_messaging",
      messaging_channel: "whatsapp",
      user_data: userData,
      custom_data: customData,
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  return payload;
}

export function buildMetaQualifiedLeadPayload(input: MetaQualifiedLeadInput): MetaCapiPayload {
  return buildMetaJourneyPayload({ ...input, stageKey: "qualified", eventName: "LeadSubmitted" });
}

export type MetaSendResult = {
  status: MetaEventStatus;
  response: unknown;
  error: string | null;
};

export async function sendMetaCapiEvent(options: {
  datasetId: string;
  accessToken: string;
  payload: MetaCapiPayload;
  forceLive?: boolean;
}): Promise<MetaSendResult> {
  const dryRun = !options.forceLive && process.env.META_CAPI_DRY_RUN !== "false";
  if (dryRun) {
    return {
      status: "dry_run",
      response: { events_received: 1, dry_run: true, message: "Evento validado localmente; nenhum dado foi enviado à Meta." },
      error: null,
    };
  }

  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${options.datasetId}/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(options.payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({ status: response.status }));
    if (!response.ok) return { status: "failed", response: body, error: `Meta CAPI respondeu HTTP ${response.status}.` };
    return { status: "sent", response: body, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida ao enviar evento.";
    return { status: "failed", response: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
