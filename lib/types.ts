export type LeadTier = "cold" | "warm" | "hot";
export type LeadStatus = "new" | "nurturing" | "qualified" | "won" | "lost";
export type MetaEventStatus = "pending" | "dry_run" | "sent" | "failed" | "skipped";
export type TrackingSiteStatus = "pending" | "connected" | "attention";
export type JourneyStageKey = "contact" | "qualified" | "scheduled" | "proposal" | "won" | "lost";
export type MetaStandardEvent = "Contact" | "LeadSubmitted" | "Schedule" | "InitiateCheckout" | "Purchase";

export type ClientRecord = {
  id: string;
  name: string;
  slug: string;
  niche: string;
  status: "connected" | "attention" | "setup";
  qualification_threshold: number;
  waba_id: string | null;
  phone_number_id: string | null;
  meta_dataset_id: string | null;
  meta_token_env_key: string | null;
};

export type MetaConnectionRecord = {
  client_id: string;
  business_id: string | null;
  ad_account_id: string | null;
  dataset_id: string | null;
  waba_id: string | null;
  phone_number_id: string | null;
  token_env_key: string | null;
  token_configured: number;
  status: "setup" | "connected" | "error";
  last_tested_at: string | null;
  last_error: string | null;
  updated_at: string;
  client_name?: string;
};

export type JourneyStageRecord = {
  id: string;
  client_id: string;
  stage_key: JourneyStageKey;
  label: string;
  event_name: MetaStandardEvent | null;
  enabled: number;
  sort_order: number;
  requires_value: number;
  client_name?: string;
};

export type SaleRecord = {
  id: string;
  client_id: string;
  lead_id: string;
  value: number;
  currency: string;
  occurred_at: string;
  created_at: string;
  lead_name?: string;
  client_name?: string;
};

export type CampaignRecord = {
  id: string;
  client_id: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  spend: number;
  conversations: number;
  qualified: number;
  sales: number;
  revenue: number;
};

export type LeadRecord = {
  id: string;
  client_id: string;
  wa_id: string;
  display_name: string;
  phone_hash: string;
  status: LeadStatus;
  score: number;
  tier: LeadTier;
  intent: string;
  urgency: string;
  budget_signal: string;
  location_signal: string;
  reasons_json: string;
  objections_json: string;
  recommended_action: string;
  qualification_provider: string;
  ctwa_clid: string | null;
  source_ad_id: string | null;
  source_headline: string | null;
  tracked_click_id: string | null;
  source_channel: string | null;
  source_campaign: string | null;
  current_stage: JourneyStageKey;
  qualified_at: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  latest_message?: string;
};

export type MetaEventRecord = {
  id: string;
  lead_id: string;
  client_id: string;
  event_name: string;
  event_id: string;
  status: MetaEventStatus;
  attempts: number;
  request_json: string;
  response_json: string | null;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  lead_name?: string;
  client_name?: string;
  score?: number;
};

export type TrackingSiteRecord = {
  id: string;
  client_id: string;
  name: string;
  url: string;
  gtm_container_id: string;
  install_method: "manual";
  status: TrackingSiteStatus;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
};

export type TrackedLinkRecord = {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  destination_url: string;
  channel: string;
  campaign: string;
  status: "active" | "paused";
  created_at: string;
  click_count: number;
  client_name?: string;
};

export type DashboardData = {
  clients: ClientRecord[];
  metaConnections: MetaConnectionRecord[];
  journeyStages: JourneyStageRecord[];
  campaigns: CampaignRecord[];
  leads: LeadRecord[];
  events: MetaEventRecord[];
  sales: SaleRecord[];
  sites: TrackingSiteRecord[];
  trackedLinks: TrackedLinkRecord[];
  totals: {
    spend: number;
    conversations: number;
    qualified: number;
    sales: number;
    revenue: number;
    pendingEvents: number;
  };
  runtime: {
    capiDryRun: boolean;
    openAiConfigured: boolean;
    graphVersion: string;
  };
};

export type InboundWhatsAppMessage = {
  messageId: string;
  wabaId: string;
  phoneNumberId: string;
  from: string;
  displayName: string;
  timestamp: number;
  text: string;
  ctwaClid: string | null;
  sourceAdId: string | null;
  sourceUrl: string | null;
  sourceHeadline: string | null;
};
