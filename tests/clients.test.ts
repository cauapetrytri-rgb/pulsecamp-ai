import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_PATH = ":memory:";

test("cria empresa com jornada e atualiza o limite de qualificação", async () => {
  const { getDb, resetDatabaseForTests } = await import("../lib/db");
  const { createClient, updateQualificationThreshold } = await import("../lib/clients");
  resetDatabaseForTests();

  const client = createClient({ name: "Clínica Horizonte", niche: "Saúde", qualificationThreshold: 65 });
  assert.equal(client.slug, "clinica-horizonte");
  assert.equal(client.status, "setup");
  assert.equal(client.qualification_threshold, 65);

  const stages = getDb().prepare("SELECT COUNT(*) AS count FROM journey_stages WHERE client_id = ?").get(client.id) as { count: number };
  assert.equal(stages.count, 6);
  const connection = getDb().prepare("SELECT status FROM meta_connections WHERE client_id = ?").get(client.id) as { status: string };
  assert.equal(connection.status, "setup");

  updateQualificationThreshold(client.id, 82);
  const updated = getDb().prepare("SELECT qualification_threshold FROM clients WHERE id = ?").get(client.id) as { qualification_threshold: number };
  assert.equal(updated.qualification_threshold, 82);
  resetDatabaseForTests();
});
