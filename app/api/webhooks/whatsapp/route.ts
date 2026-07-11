import { NextResponse } from "next/server";

import { markWebhookReceiptFailed, processInboundMessage } from "@/lib/lead-pipeline";
import { parseWhatsAppWebhook, verifyMetaSignature } from "@/lib/webhook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Falha na verificação do webhook." }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), process.env.META_APP_SECRET);
  if (!signature.valid) return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const messages = parseWhatsAppWebhook(payload);
  const results = [];
  for (const message of messages) {
    try {
      results.push(await processInboundMessage(message));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Falha ao processar mensagem.";
      markWebhookReceiptFailed(message.messageId, reason);
      return NextResponse.json({ error: reason, processed: results.length }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, received: messages.length, results });
}
