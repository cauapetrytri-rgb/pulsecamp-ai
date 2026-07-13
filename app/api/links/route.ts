import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { apiError, requireClientAccess, requireSameOrigin, requireUser } from "@/lib/http";
import { buildTrackedDestination, slugify } from "@/lib/tracking";
import type { ClientRecord, TrackedLinkRecord } from "@/lib/types";

export const runtime = "nodejs";

const LinkSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  destination: z.string().trim().min(4).max(1000),
  channel: z.string().trim().min(2).max(50),
  campaign: z.string().trim().max(100).default(""),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmCampaign: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request);
    const input = LinkSchema.parse(await request.json());
    requireClientAccess(user, input.clientId);
    const db = getDb();
    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(input.clientId) as unknown as ClientRecord | undefined;
    if (!client) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

    const id = randomUUID();
    const slug = `${slugify(input.name)}-${id.slice(0, 6)}`;
    const destination = buildTrackedDestination(input.destination, {
      source: input.utmSource || input.channel,
      medium: input.utmMedium,
      campaign: input.utmCampaign || input.campaign,
    });
    db.prepare(`
      INSERT INTO tracked_links (id, client_id, name, slug, destination_url, channel, campaign, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(id, input.clientId, input.name, slug, destination, input.channel, input.campaign, new Date().toISOString());
    const link = db.prepare("SELECT *, 0 AS click_count FROM tracked_links WHERE id = ?").get(id) as unknown as TrackedLinkRecord;
    return NextResponse.json({ ok: true, link }, { status: 201 });
  } catch (error) {
    return apiError(error, "Não foi possível criar o link.");
  }
}
