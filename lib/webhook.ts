import { createHmac, timingSafeEqual } from "node:crypto";

import type { InboundWhatsAppMessage } from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function messageText(message: UnknownRecord): string {
  const text = record(message.text);
  const button = record(message.button);
  const interactive = record(message.interactive);
  const buttonReply = record(interactive.button_reply);
  const listReply = record(interactive.list_reply);

  return (
    string(text.body) ||
    string(button.text) ||
    string(buttonReply.title) ||
    string(listReply.title) ||
    `[mensagem ${string(message.type) || "sem texto"}]`
  );
}

export function parseWhatsAppWebhook(payload: unknown): InboundWhatsAppMessage[] {
  const root = record(payload);
  if (root.object !== "whatsapp_business_account") return [];

  const parsed: InboundWhatsAppMessage[] = [];

  for (const rawEntry of array(root.entry)) {
    const entry = record(rawEntry);
    const wabaId = string(entry.id);

    for (const rawChange of array(entry.changes)) {
      const change = record(rawChange);
      const value = record(change.value);
      const metadata = record(value.metadata);
      const contacts = array(value.contacts).map(record);

      for (const rawMessage of array(value.messages)) {
        const message = record(rawMessage);
        const from = string(message.from);
        const contact = contacts.find((item) => string(item.wa_id) === from) ?? contacts[0] ?? {};
        const profile = record(contact.profile);
        const referral = record(message.referral);
        const context = record(message.context);
        const contextReferral = record(context.referral);

        const ctwaClid =
          string(referral.ctwa_clid) ||
          string(referral.ctwaClid) ||
          string(contextReferral.ctwa_clid) ||
          string(contextReferral.ctwaClid) ||
          null;

        parsed.push({
          messageId: string(message.id),
          wabaId,
          phoneNumberId: string(metadata.phone_number_id),
          from,
          displayName: string(profile.name) || "Lead do WhatsApp",
          timestamp: Number(string(message.timestamp)) || Math.floor(Date.now() / 1000),
          text: messageText(message),
          ctwaClid,
          sourceAdId: string(referral.source_id) || string(contextReferral.source_id) || null,
          sourceUrl: string(referral.source_url) || string(contextReferral.source_url) || null,
          sourceHeadline: string(referral.headline) || string(contextReferral.headline) || null,
        });
      }
    }
  }

  return parsed.filter((message) => message.messageId && message.from && message.phoneNumberId);
}

export function verifyMetaSignature(rawBody: string, signature: string | null, appSecret?: string) {
  if (!appSecret) return { valid: true, skipped: true };
  if (!signature?.startsWith("sha256=")) return { valid: false, skipped: false };

  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody).digest("hex"), "utf8");
  const received = Buffer.from(signature.slice("sha256=".length), "utf8");

  if (expected.length !== received.length) return { valid: false, skipped: false };
  return { valid: timingSafeEqual(expected, received), skipped: false };
}
