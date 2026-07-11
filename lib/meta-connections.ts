import { getDb } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";

type ConnectionInput = {
  clientId: string;
  businessId?: string;
  adAccountId?: string;
  datasetId: string;
  wabaId: string;
  phoneNumberId: string;
  tokenEnvKey?: string;
  accessToken?: string;
};

function clean(value?: string) {
  return value?.trim() || null;
}

export function saveMetaConnection(input: ConnectionInput) {
  const db = getDb();
  const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(input.clientId);
  if (!client) throw new Error("Empresa não encontrada.");
  const existing = db.prepare("SELECT access_token_ciphertext FROM meta_connections WHERE client_id = ?").get(input.clientId) as { access_token_ciphertext: string | null } | undefined;
  const encryptedToken = input.accessToken?.trim() ? encryptSecret(input.accessToken.trim()) : existing?.access_token_ciphertext || null;
  const tokenEnvKey = clean(input.tokenEnvKey);
  const configured = Boolean(
    input.datasetId.trim() && input.wabaId.trim() && input.phoneNumberId.trim() &&
    (encryptedToken || (tokenEnvKey && process.env[tokenEnvKey])),
  );
  const updatedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO meta_connections (
      client_id, business_id, ad_account_id, dataset_id, waba_id, phone_number_id,
      token_env_key, access_token_ciphertext, status, last_error, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(client_id) DO UPDATE SET
      business_id = excluded.business_id, ad_account_id = excluded.ad_account_id,
      dataset_id = excluded.dataset_id, waba_id = excluded.waba_id,
      phone_number_id = excluded.phone_number_id, token_env_key = excluded.token_env_key,
      access_token_ciphertext = excluded.access_token_ciphertext, status = excluded.status,
      last_error = NULL, updated_at = excluded.updated_at
  `).run(
    input.clientId, clean(input.businessId), clean(input.adAccountId), input.datasetId.trim(),
    input.wabaId.trim(), input.phoneNumberId.trim(), tokenEnvKey, encryptedToken,
    configured ? "connected" : "setup", updatedAt,
  );
  db.prepare(`
    UPDATE clients SET waba_id = ?, phone_number_id = ?, meta_dataset_id = ?, meta_token_env_key = ?, status = ? WHERE id = ?
  `).run(input.wabaId.trim(), input.phoneNumberId.trim(), input.datasetId.trim(), tokenEnvKey, configured ? "connected" : "attention", input.clientId);
  return { clientId: input.clientId, status: configured ? "connected" : "setup", tokenConfigured: Boolean(encryptedToken || tokenEnvKey) };
}

function connectionToken(connection: { access_token_ciphertext: string | null; token_env_key: string | null }) {
  if (connection.access_token_ciphertext) return decryptSecret(connection.access_token_ciphertext);
  return connection.token_env_key ? process.env[connection.token_env_key] : undefined;
}

export async function testMetaConnection(clientId: string) {
  const db = getDb();
  const connection = db.prepare("SELECT * FROM meta_connections WHERE client_id = ?").get(clientId) as {
    dataset_id: string | null;
    waba_id: string | null;
    phone_number_id: string | null;
    token_env_key: string | null;
    access_token_ciphertext: string | null;
  } | undefined;
  if (!connection?.dataset_id || !connection.waba_id || !connection.phone_number_id) throw new Error("Preencha Pixel/conjunto de dados, WABA e número do WhatsApp.");
  const token = connectionToken(connection);
  if (!token) throw new Error(`Token não encontrado${connection.token_env_key ? ` na variável ${connection.token_env_key}` : ""}.`);

  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  let ok = false;
  let detail = "";
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${connection.dataset_id}?fields=id,name`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json().catch(() => ({})) as { id?: string; name?: string; error?: { message?: string } };
    ok = response.ok && Boolean(body.id);
    detail = ok ? `Conjunto de dados ${body.name || body.id} validado.` : body.error?.message || `Meta respondeu HTTP ${response.status}.`;
  } catch (error) {
    detail = error instanceof Error ? error.message : "Falha ao testar a conexão Meta.";
  }
  const testedAt = new Date().toISOString();
  db.prepare("UPDATE meta_connections SET status = ?, last_tested_at = ?, last_error = ?, updated_at = ? WHERE client_id = ?")
    .run(ok ? "connected" : "error", testedAt, ok ? null : detail, testedAt, clientId);
  if (!ok) throw new Error(detail);
  return { ok, detail, testedAt };
}
