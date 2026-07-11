import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { verifyGtmInstallation } from "@/lib/site-verification";
import type { TrackingSiteRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();
  const site = db.prepare("SELECT * FROM tracking_sites WHERE id = ?").get(id) as unknown as TrackingSiteRecord | undefined;
  if (!site) return NextResponse.json({ error: "Site não encontrado." }, { status: 404 });

  const checkedAt = new Date().toISOString();
  try {
    const verification = await verifyGtmInstallation(site.url, site.gtm_container_id);
    db.prepare(`
      UPDATE tracking_sites SET status = ?, last_checked_at = ?, last_error = ?, updated_at = ? WHERE id = ?
    `).run(verification.installed ? "connected" : "attention", checkedAt, verification.installed ? null : verification.message, checkedAt, id);
    return NextResponse.json({ ok: true, verification });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível acessar o site.";
    db.prepare(`
      UPDATE tracking_sites SET status = 'attention', last_checked_at = ?, last_error = ?, updated_at = ? WHERE id = ?
    `).run(checkedAt, message, checkedAt, id);
    return NextResponse.json({ ok: true, verification: { installed: false, containers: [], message } });
  }
}
