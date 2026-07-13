import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { apiError, requireSameOrigin, requireSiteAccess, requireUser } from "@/lib/http";
import { verifyGtmInstallation } from "@/lib/site-verification";
import type { TrackingSiteRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = requireUser(request);
    const { id } = await context.params;
    requireSiteAccess(user, id);
    const db = getDb();
    const site = db.prepare("SELECT * FROM tracking_sites WHERE id = ?").get(id) as unknown as TrackingSiteRecord;
    const checkedAt = new Date().toISOString();
    const verification = await verifyGtmInstallation(site.url, site.gtm_container_id);
    db.prepare(`
      UPDATE tracking_sites SET status = ?, last_checked_at = ?, last_error = ?, updated_at = ? WHERE id = ?
    `).run(verification.installed ? "connected" : "attention", checkedAt, verification.installed ? null : verification.message, checkedAt, id);
    return NextResponse.json({ ok: true, verification });
  } catch (error) {
    return apiError(error, "Não foi possível verificar o site.");
  }
}
