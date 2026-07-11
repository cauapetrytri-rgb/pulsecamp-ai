import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { CampaignRecord, ClientRecord, DashboardData, JourneyStageRecord, LeadRecord, MetaConnectionRecord, MetaEventRecord, SaleRecord, TrackedLinkRecord, TrackingSiteRecord } from "@/lib/types";

declare global {
  // eslint-disable-next-line no-var
  var __pulseCampDb: DatabaseSync | undefined;
}

function databasePath() {
  const configured = process.env.DATABASE_PATH || ".data/pulsecamp.db";
  if (configured === ":memory:") return configured;
  return resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

function createSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      niche TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('connected', 'attention', 'setup')),
      qualification_threshold INTEGER NOT NULL DEFAULT 70,
      waba_id TEXT,
      phone_number_id TEXT,
      meta_dataset_id TEXT,
      meta_token_env_key TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      campaign_id TEXT NOT NULL,
      campaign_name TEXT NOT NULL,
      adset_id TEXT NOT NULL,
      adset_name TEXT NOT NULL,
      ad_id TEXT NOT NULL,
      ad_name TEXT NOT NULL,
      spend REAL NOT NULL DEFAULT 0,
      conversations INTEGER NOT NULL DEFAULT 0,
      qualified INTEGER NOT NULL DEFAULT 0,
      sales INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      wa_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      phone_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'nurturing', 'qualified', 'won', 'lost')),
      score INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'cold' CHECK(tier IN ('cold', 'warm', 'hot')),
      intent TEXT NOT NULL DEFAULT '',
      urgency TEXT NOT NULL DEFAULT 'unknown',
      budget_signal TEXT NOT NULL DEFAULT '',
      location_signal TEXT NOT NULL DEFAULT '',
      reasons_json TEXT NOT NULL DEFAULT '[]',
      objections_json TEXT NOT NULL DEFAULT '[]',
      recommended_action TEXT NOT NULL DEFAULT '',
      qualification_provider TEXT NOT NULL DEFAULT 'pending',
      ctwa_clid TEXT,
      source_ad_id TEXT,
      source_headline TEXT,
      qualified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(client_id, wa_id)
    );

    CREATE TABLE IF NOT EXISTS lead_messages (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      message_id TEXT NOT NULL UNIQUE,
      direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
      body TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meta_events (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      event_name TEXT NOT NULL,
      event_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('pending', 'dry_run', 'sent', 'failed', 'skipped')),
      attempts INTEGER NOT NULL DEFAULT 0,
      request_json TEXT NOT NULL,
      response_json TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS webhook_receipts (
      message_id TEXT PRIMARY KEY,
      client_id TEXT,
      received_at TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS tracking_sites (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      gtm_container_id TEXT NOT NULL,
      install_method TEXT NOT NULL DEFAULT 'manual' CHECK(install_method IN ('manual')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'connected', 'attention')),
      last_checked_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(client_id, url)
    );

    CREATE TABLE IF NOT EXISTS tracked_links (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      destination_url TEXT NOT NULL,
      channel TEXT NOT NULL,
      campaign TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracked_link_clicks (
      id TEXT PRIMARY KEY,
      link_id TEXT NOT NULL REFERENCES tracked_links(id) ON DELETE CASCADE,
      occurred_at TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      tracking_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS meta_connections (
      client_id TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      business_id TEXT,
      ad_account_id TEXT,
      dataset_id TEXT,
      waba_id TEXT,
      phone_number_id TEXT,
      token_env_key TEXT,
      status TEXT NOT NULL DEFAULT 'setup' CHECK(status IN ('setup', 'connected', 'error')),
      last_tested_at TEXT,
      last_error TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journey_stages (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      stage_key TEXT NOT NULL CHECK(stage_key IN ('contact', 'qualified', 'scheduled', 'proposal', 'won', 'lost')),
      label TEXT NOT NULL,
      event_name TEXT,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
      sort_order INTEGER NOT NULL,
      requires_value INTEGER NOT NULL DEFAULT 0 CHECK(requires_value IN (0, 1)),
      UNIQUE(client_id, stage_key)
    );

    CREATE TABLE IF NOT EXISTS lead_stage_history (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      stage_key TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      value REAL NOT NULL CHECK(value > 0),
      currency TEXT NOT NULL DEFAULT 'BRL',
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_client_updated ON leads(client_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_meta_events_client_created ON meta_events(client_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_lead_time ON lead_messages(lead_id, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_tracking_sites_client ON tracking_sites(client_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tracked_links_client ON tracked_links(client_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tracked_link_clicks_link ON tracked_link_clicks(link_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_journey_stages_client ON journey_stages(client_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_stage_history_lead ON lead_stage_history(lead_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id, occurred_at DESC);
  `);

  ensureColumn(db, "leads", "current_stage", "TEXT NOT NULL DEFAULT 'contact'");
  ensureColumn(db, "meta_events", "stage_key", "TEXT");
  ensureColumn(db, "meta_connections", "access_token_ciphertext", "TEXT");
  ensureColumn(db, "tracked_link_clicks", "token", "TEXT");
  ensureColumn(db, "leads", "tracked_click_id", "TEXT");
  ensureColumn(db, "leads", "source_channel", "TEXT");
  ensureColumn(db, "leads", "source_campaign", "TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_tracked_link_clicks_token ON tracked_link_clicks(token) WHERE token IS NOT NULL");
}

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

const defaultJourney = [
  ["contact", "Primeiro contato", "Contact", 10, 0],
  ["qualified", "Lead quente", "LeadSubmitted", 20, 0],
  ["scheduled", "Agendamento", "Schedule", 30, 0],
  ["proposal", "Proposta", "InitiateCheckout", 40, 0],
  ["won", "Venda", "Purchase", 50, 1],
  ["lost", "Perdido", null, 60, 0],
] as const;

function ensureOperationalDefaults(db: DatabaseSync) {
  const clients = db.prepare("SELECT * FROM clients").all() as unknown as ClientRecord[];
  const insertConnection = db.prepare(`
    INSERT OR IGNORE INTO meta_connections (
      client_id, dataset_id, waba_id, phone_number_id, token_env_key, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStage = db.prepare(`
    INSERT OR IGNORE INTO journey_stages (
      id, client_id, stage_key, label, event_name, enabled, sort_order, requires_value
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);
  for (const client of clients) {
    const configured = Boolean(
      client.meta_dataset_id && client.waba_id && client.phone_number_id &&
      client.meta_token_env_key && process.env[client.meta_token_env_key],
    );
    insertConnection.run(
      client.id, client.meta_dataset_id, client.waba_id, client.phone_number_id, client.meta_token_env_key,
      configured ? "connected" : "setup", new Date().toISOString(),
    );
    for (const [stageKey, label, eventName, order, requiresValue] of defaultJourney) {
      insertStage.run(`${client.id}:${stageKey}`, client.id, stageKey, label, eventName, order, requiresValue);
    }
  }
  db.exec(`
    UPDATE leads SET current_stage = 'qualified'
      WHERE current_stage = 'contact' AND status = 'qualified';
    UPDATE leads SET current_stage = 'won'
      WHERE current_stage = 'contact' AND status = 'won';
    UPDATE leads SET current_stage = 'lost'
      WHERE current_stage = 'contact' AND status = 'lost';
  `);
}

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function seed(db: DatabaseSync) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM clients").get() as { count: number };
  if (count.count > 0) return;

  const insertClient = db.prepare(`
    INSERT INTO clients (
      id, name, slug, niche, status, qualification_threshold, waba_id, phone_number_id,
      meta_dataset_id, meta_token_env_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertClient.run("client-solar", "Solar Prime", "solar-prime", "Energia solar", "connected", 70, "waba-demo-solar", "phone-demo-solar", "dataset-demo-solar", "META_CAPI_TOKEN_SOLAR_PRIME");
  insertClient.run("client-alfa", "Alfa Imóveis", "alfa-imoveis", "Imóveis", "attention", 75, "waba-demo-alfa", "phone-demo-alfa", "dataset-demo-alfa", "META_CAPI_TOKEN_ALFA_IMOVEIS");
  insertClient.run("client-orbe", "Orbe Auto", "orbe-auto", "Automotivo", "setup", 68, "waba-demo-orbe", "phone-demo-orbe", "dataset-demo-orbe", "META_CAPI_TOKEN_ORBE_AUTO");

  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (
      id, client_id, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name,
      spend, conversations, qualified, sales, revenue
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCampaign.run("camp-solar-1", "client-solar", "12001", "Captação Solar | WhatsApp", "22001", "Sudeste | Proprietários", "32001", "Economia na conta — vídeo", 4820, 118, 43, 11, 146300);
  insertCampaign.run("camp-solar-2", "client-solar", "12002", "Remarketing Propostas", "22002", "Engajados 30 dias", "32002", "Prova social — carrossel", 1690, 37, 21, 8, 91400);
  insertCampaign.run("camp-alfa-1", "client-alfa", "12003", "Apartamentos Zona Sul", "22003", "Renda familiar 12k+", "32003", "Tour decorado — reels", 7350, 164, 39, 6, 280000);
  insertCampaign.run("camp-alfa-2", "client-alfa", "12004", "Lançamento Vista Parque", "22004", "Lookalike compradores", "32004", "Entrada facilitada — imagem", 2980, 76, 11, 1, 42000);
  insertCampaign.run("camp-orbe-1", "client-orbe", "12005", "Seminovos no WhatsApp", "22005", "Raio 40 km", "32005", "SUV da semana — vídeo", 3260, 92, 27, 7, 496000);

  const insertLead = db.prepare(`
    INSERT INTO leads (
      id, client_id, wa_id, display_name, phone_hash, status, score, tier, intent, urgency,
      budget_signal, location_signal, reasons_json, objections_json, recommended_action,
      qualification_provider, ctwa_clid, source_ad_id, source_headline, qualified_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMessage = db.prepare(`
    INSERT INTO lead_messages (id, lead_id, message_id, direction, body, occurred_at)
    VALUES (?, ?, ?, 'inbound', ?, ?)
  `);

  const leads = [
    {
      id: "lead-marina", client: "client-solar", wa: "5511991112201", name: "Marina Costa", status: "qualified", score: 92, tier: "hot",
      text: "Quero instalar energia solar ainda este mês. Minha conta fica perto de R$ 1.400 e gostaria de um orçamento.",
      intent: "Solicitou orçamento para instalação neste mês", urgency: "high", budget: "Conta atual de R$ 1.400", ctwa: "ctwa-demo-marina", ad: "32001", headline: "Reduza sua conta em até 90%", minutes: 12,
    },
    {
      id: "lead-joao", client: "client-solar", wa: "5511984448802", name: "João Mendes", status: "nurturing", score: 57, tier: "cold",
      text: "Vi o anúncio e queria entender melhor como funciona. Ainda estou só pesquisando.",
      intent: "Pesquisa inicial", urgency: "unknown", budget: "Orçamento não confirmado", ctwa: "ctwa-demo-joao", ad: "32001", headline: "Reduza sua conta em até 90%", minutes: 38,
    },
    {
      id: "lead-carol", client: "client-alfa", wa: "5511973331103", name: "Carolina Alves", status: "qualified", score: 84, tier: "hot",
      text: "Tenho interesse no apartamento de 3 quartos. Posso visitar sábado? Tenho entrada de R$ 180 mil.",
      intent: "Agendar visita ao imóvel", urgency: "medium", budget: "Entrada declarada de R$ 180 mil", ctwa: "ctwa-demo-carol", ad: "32003", headline: "3 quartos perto do metrô", minutes: 63,
    },
    {
      id: "lead-ricardo", client: "client-alfa", wa: "5511962225504", name: "Ricardo Lima", status: "new", score: 44, tier: "cold",
      text: "Qual o endereço?", intent: "Solicitou localização", urgency: "unknown", budget: "Orçamento não confirmado", ctwa: "ctwa-demo-ricardo", ad: "32004", headline: "Vista Parque", minutes: 91,
    },
    {
      id: "lead-bianca", client: "client-orbe", wa: "5511951119905", name: "Bianca Rocha", status: "qualified", score: 79, tier: "warm",
      text: "Quero trocar meu carro e dar um Onix 2021 de entrada. Consigo ir hoje ver o SUV do anúncio?", intent: "Avaliar troca e visitar veículo", urgency: "high", budget: "Veículo de entrada informado", ctwa: "ctwa-demo-bianca", ad: "32005", headline: "SUV da semana", minutes: 126,
    },
  ];

  for (const lead of leads) {
    const created = isoMinutesAgo(lead.minutes);
    const qualifiedAt = lead.status === "qualified" ? isoMinutesAgo(lead.minutes - 3) : null;
    insertLead.run(
      lead.id, lead.client, lead.wa, lead.name, `seed-${lead.wa.slice(-6)}`, lead.status, lead.score, lead.tier,
      lead.intent, lead.urgency, lead.budget, "Localização a confirmar", JSON.stringify([lead.intent]), "[]",
      lead.status === "qualified" ? "Responder em até 5 minutos e conduzir para agendamento." : "Fazer perguntas de qualificação.",
      "demo", lead.ctwa, lead.ad, lead.headline, qualifiedAt, created, created,
    );
    insertMessage.run(randomUUID(), lead.id, `wamid-${lead.id}`, lead.text, created);
  }

  const insertEvent = db.prepare(`
    INSERT INTO meta_events (
      id, lead_id, client_id, event_name, event_id, status, attempts, request_json,
      response_json, last_error, created_at, sent_at
    ) VALUES (?, ?, ?, 'LeadSubmitted', ?, ?, 1, ?, ?, NULL, ?, ?)
  `);
  for (const [leadId, clientId, score] of [
    ["lead-marina", "client-solar", 92],
    ["lead-carol", "client-alfa", 84],
    ["lead-bianca", "client-orbe", 79],
  ] as const) {
    const at = isoMinutesAgo(8);
    insertEvent.run(
      randomUUID(), leadId, clientId, `qualified:${clientId}:${leadId}`, "dry_run",
      JSON.stringify({ data: [{ event_name: "LeadSubmitted", action_source: "business_messaging", custom_data: { lead_score: score } }] }),
      JSON.stringify({ events_received: 1, dry_run: true }), at, at,
    );
  }
}

export function getDb() {
  if (global.__pulseCampDb) return global.__pulseCampDb;
  const path = databasePath();
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  createSchema(db);
  seed(db);
  ensureOperationalDefaults(db);
  global.__pulseCampDb = db;
  return db;
}

export function getDashboardData(): DashboardData {
  const db = getDb();
  const plainRows = <T,>(rows: unknown[]) => rows.map((row) => ({ ...(row as Record<string, unknown>) })) as T[];
  const clients = plainRows<ClientRecord>(db.prepare("SELECT * FROM clients ORDER BY name").all());
  const rawMetaConnections = plainRows<MetaConnectionRecord & { has_encrypted_token: number }>(db.prepare(`
    SELECT m.client_id, m.business_id, m.ad_account_id, m.dataset_id, m.waba_id,
      m.phone_number_id, m.token_env_key, m.status, m.last_tested_at, m.last_error, m.updated_at,
      CASE WHEN m.access_token_ciphertext IS NOT NULL THEN 1 ELSE 0 END AS has_encrypted_token,
      0 AS token_configured,
      c.name AS client_name FROM meta_connections m
    JOIN clients c ON c.id = m.client_id ORDER BY c.name
  `).all());
  const metaConnections = rawMetaConnections.map(({ has_encrypted_token, ...connection }) => {
    const tokenConfigured = Boolean(has_encrypted_token || (connection.token_env_key && process.env[connection.token_env_key]));
    const assetsConfigured = Boolean(connection.dataset_id && connection.waba_id && connection.phone_number_id);
    return {
      ...connection,
      token_configured: tokenConfigured ? 1 : 0,
      status: connection.status === "error" ? "error" as const : tokenConfigured && assetsConfigured ? "connected" as const : "setup" as const,
    };
  });
  const journeyStages = plainRows<JourneyStageRecord>(db.prepare(`
    SELECT j.*, c.name AS client_name FROM journey_stages j
    JOIN clients c ON c.id = j.client_id ORDER BY c.name, j.sort_order
  `).all());
  const campaigns = plainRows<CampaignRecord>(db.prepare("SELECT * FROM campaigns ORDER BY spend DESC").all());
  const leads = plainRows<LeadRecord>(db.prepare(`
    SELECT l.*, c.name AS client_name,
      (SELECT body FROM lead_messages m WHERE m.lead_id = l.id ORDER BY occurred_at DESC LIMIT 1) AS latest_message
    FROM leads l
    JOIN clients c ON c.id = l.client_id
    ORDER BY l.updated_at DESC
    LIMIT 100
  `).all());
  const events = plainRows<MetaEventRecord>(db.prepare(`
    SELECT e.*, l.display_name AS lead_name, l.score AS score, c.name AS client_name
    FROM meta_events e
    JOIN leads l ON l.id = e.lead_id
    JOIN clients c ON c.id = e.client_id
    ORDER BY e.created_at DESC
    LIMIT 100
  `).all());
  const sales = plainRows<SaleRecord>(db.prepare(`
    SELECT s.*, l.display_name AS lead_name, c.name AS client_name
    FROM sales s JOIN leads l ON l.id = s.lead_id JOIN clients c ON c.id = s.client_id
    ORDER BY s.occurred_at DESC LIMIT 100
  `).all());
  const sites = plainRows<TrackingSiteRecord>(db.prepare(`
    SELECT s.*, c.name AS client_name
    FROM tracking_sites s
    JOIN clients c ON c.id = s.client_id
    ORDER BY s.created_at DESC
  `).all());
  const trackedLinks = plainRows<TrackedLinkRecord>(db.prepare(`
    SELECT l.*, c.name AS client_name,
      (SELECT COUNT(*) FROM tracked_link_clicks click WHERE click.link_id = l.id) AS click_count
    FROM tracked_links l
    JOIN clients c ON c.id = l.client_id
    ORDER BY l.created_at DESC
  `).all());

  const totals = campaigns.reduce(
    (acc, campaign) => ({
      spend: acc.spend + campaign.spend,
      conversations: acc.conversations + campaign.conversations,
      qualified: acc.qualified + campaign.qualified,
      sales: acc.sales + campaign.sales,
      revenue: acc.revenue + campaign.revenue,
      pendingEvents: acc.pendingEvents,
    }),
    { spend: 0, conversations: 0, qualified: 0, sales: 0, revenue: 0, pendingEvents: 0 },
  );
  totals.pendingEvents = events.filter((event) => event.status === "pending" || event.status === "failed").length;

  return {
    clients,
    metaConnections,
    journeyStages,
    campaigns,
    leads,
    events,
    sales,
    sites,
    trackedLinks,
    totals,
    runtime: {
      capiDryRun: process.env.META_CAPI_DRY_RUN !== "false",
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      graphVersion: process.env.META_GRAPH_API_VERSION || "v25.0",
    },
  };
}

export function resetDatabaseForTests() {
  global.__pulseCampDb?.close();
  global.__pulseCampDb = undefined;
}
