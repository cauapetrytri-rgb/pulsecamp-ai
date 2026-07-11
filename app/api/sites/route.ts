import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { normalizeGtmContainerId, normalizePublicUrl } from "@/lib/tracking";
import type { ClientRecord, TrackingSiteRecord } from "@/lib/types";

export const runtime = "nodejs";

const SiteSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  url: z.string().trim().min(4).max(500),
  gtmContainerId: z.string().trim().min(5).max(30),
});

export async function POST(request: Request) {
  try {
    const input = SiteSchema.parse(await request.json());
    const db = getDb();
    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(input.clientId) as unknown as ClientRecord | undefined;
    if (!client) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

    const id = randomUUID();
    const now = new Date().toISOString();
    const url = normalizePublicUrl(input.url);
    const containerId = normalizeGtmContainerId(input.gtmContainerId);
    db.prepare(`
      INSERT INTO tracking_sites (
        id, client_id, name, url, gtm_container_id, install_method, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'manual', 'pending', ?, ?)
    `).run(id, input.clientId, input.name, url, containerId, now, now);

    const site = db.prepare("SELECT * FROM tracking_sites WHERE id = ?").get(id) as unknown as TrackingSiteRecord;
    return NextResponse.json({ ok: true, site }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível cadastrar o site.";
    const status = message.includes("UNIQUE constraint") ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? "Este site já está cadastrado para a empresa." : message }, { status });
  }
}
