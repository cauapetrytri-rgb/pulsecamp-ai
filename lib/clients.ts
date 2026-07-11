import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { slugify } from "@/lib/tracking";
import type { ClientRecord } from "@/lib/types";

const defaultJourney = [
  ["contact", "Primeiro contato", "Contact", 10, 0],
  ["qualified", "Lead quente", "LeadSubmitted", 20, 0],
  ["scheduled", "Agendamento", "Schedule", 30, 0],
  ["proposal", "Proposta", "InitiateCheckout", 40, 0],
  ["won", "Venda", "Purchase", 50, 1],
  ["lost", "Perdido", null, 60, 0],
] as const;

export function createClient(input: { name: string; niche: string; qualificationThreshold?: number }) {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS count FROM clients").get() as { count: number };
  if (count.count >= 10) throw new Error("O plano atual permite até 10 empresas.");

  const id = `client-${randomUUID()}`;
  const baseSlug = slugify(input.name) || "empresa";
  const slugExists = db.prepare("SELECT 1 FROM clients WHERE slug = ?").get(baseSlug);
  const slug = slugExists ? `${baseSlug}-${id.slice(-6)}` : baseSlug;
  const threshold = input.qualificationThreshold ?? 70;
  const now = new Date().toISOString();

  db.exec("BEGIN");
  try {
    db.prepare(`
      INSERT INTO clients (id, name, slug, niche, status, qualification_threshold, created_at)
      VALUES (?, ?, ?, ?, 'setup', ?, ?)
    `).run(id, input.name.trim(), slug, input.niche.trim(), threshold, now);
    db.prepare(`
      INSERT INTO meta_connections (client_id, status, updated_at)
      VALUES (?, 'setup', ?)
    `).run(id, now);
    const insertStage = db.prepare(`
      INSERT INTO journey_stages (
        id, client_id, stage_key, label, event_name, enabled, sort_order, requires_value
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);
    for (const [stageKey, label, eventName, order, requiresValue] of defaultJourney) {
      insertStage.run(`${id}:${stageKey}`, id, stageKey, label, eventName, order, requiresValue);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as unknown as ClientRecord;
}

export function updateQualificationThreshold(clientId: string, threshold: number) {
  const db = getDb();
  const result = db.prepare("UPDATE clients SET qualification_threshold = ? WHERE id = ?").run(threshold, clientId);
  if (!result.changes) throw new Error("Empresa não encontrada.");
  return { clientId, qualificationThreshold: threshold };
}
