import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { attachTrackingToken, forwardTrackingParameters, trackingParameters } from "@/lib/tracking";
import type { TrackedLinkRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const db = getDb();
  const link = db.prepare("SELECT * FROM tracked_links WHERE slug = ? AND status = 'active'").get(slug) as unknown as TrackedLinkRecord | undefined;
  if (!link) return NextResponse.json({ error: "Link não encontrado ou pausado." }, { status: 404 });

  const incoming = new URL(request.url).searchParams;
  const clickId = randomUUID();
  const token = clickId.replaceAll("-", "").slice(0, 16);
  db.prepare(`
    INSERT INTO tracked_link_clicks (id, link_id, occurred_at, referrer, user_agent, tracking_json, token)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    clickId, link.id, new Date().toISOString(), request.headers.get("referer"),
    request.headers.get("user-agent"), JSON.stringify(trackingParameters(incoming)),
    token,
  );

  return NextResponse.redirect(attachTrackingToken(forwardTrackingParameters(link.destination_url, incoming), token), 307);
}
