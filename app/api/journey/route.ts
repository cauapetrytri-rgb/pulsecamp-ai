import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const StageSchema = z.object({
  stageKey: z.enum(["contact", "qualified", "scheduled", "proposal", "won", "lost"]),
  label: z.string().min(2).max(40),
  eventName: z.enum(["Contact", "LeadSubmitted", "Schedule", "InitiateCheckout", "Purchase"]).nullable(),
  enabled: z.boolean(),
});
const BodySchema = z.object({ clientId: z.string().min(1), stages: z.array(StageSchema).min(1).max(6) });

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const db = getDb();
    const statement = db.prepare(`UPDATE journey_stages SET label = ?, event_name = ?, enabled = ? WHERE client_id = ? AND stage_key = ?`);
    db.exec("BEGIN");
    try {
      for (const stage of body.stages) statement.run(stage.label, stage.eventName, stage.enabled ? 1 : 0, body.clientId, stage.stageKey);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a jornada." }, { status: 400 });
  }
}
