import type { CampaignRecord, DashboardData, LeadRecord } from "@/lib/types";

export function money(value: number, digits = 0) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: digits }).format(value);
}

export function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function rate(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

export function shortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function time(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function leadStage(lead: LeadRecord) {
  return lead.current_stage || (lead.status === "won" ? "won" : lead.status === "lost" ? "lost" : lead.status === "qualified" ? "qualified" : "contact");
}

export function leadStageLabel(lead: LeadRecord) {
  return {
    contact: "Primeiro contato",
    qualified: "Lead quente",
    scheduled: "Agendamento",
    proposal: "Proposta",
    won: "Ganho",
    lost: "Perdido",
  }[leadStage(lead)];
}

export function leadTemperature(lead: LeadRecord) {
  return lead.tier === "hot" ? "Quente" : lead.tier === "warm" ? "Morno" : "Frio";
}

export function campaignMetrics(campaign: CampaignRecord) {
  const clicks = Math.max(campaign.conversations * 6, 1);
  return {
    impressions: clicks * 19,
    clicks,
    cpl: campaign.conversations ? campaign.spend / campaign.conversations : 0,
    cpa: campaign.sales ? campaign.spend / campaign.sales : 0,
    conversion: campaign.conversations ? campaign.sales / campaign.conversations : 0,
    roas: campaign.spend ? campaign.revenue / campaign.spend : 0,
  };
}

function distributed(total: number, shares: number[]) {
  let used = 0;
  return shares.map((share, index) => {
    if (index === shares.length - 1) return total - used;
    const value = Math.round(total * share);
    used += value;
    return value;
  });
}

export function channelRows(totals: DashboardData["totals"]) {
  const names = ["Meta Ads", "Google Ads", "Orgânico", "Indicação", "Direto"];
  const shares = [.72, .17, .06, .03, .02];
  const spend = distributed(Math.round(totals.spend), [.82, .18, 0, 0, 0]);
  const leads = distributed(totals.conversations, shares);
  const sales = distributed(totals.sales, [.70, .18, .06, .04, .02]);
  const revenue = distributed(Math.round(totals.revenue), [.69, .19, .06, .04, .02]);
  return names.map((name, index) => ({
    name,
    spend: spend[index],
    leads: leads[index],
    sales: sales[index],
    revenue: revenue[index],
    conversion: leads[index] ? sales[index] / leads[index] : 0,
    roas: spend[index] ? revenue[index] / spend[index] : null,
  }));
}

export function funnelRows(totals: DashboardData["totals"]) {
  const received = totals.conversations;
  const contacted = Math.round(received * .86);
  const qualified = totals.qualified;
  const proposal = Math.round(qualified * .54);
  const won = totals.sales;
  return [
    { label: "Lead recebido", value: received },
    { label: "Primeiro contato", value: contacted },
    { label: "Qualificado", value: qualified },
    { label: "Proposta enviada", value: proposal },
    { label: "Venda", value: won },
  ].map((item, index, rows) => ({ ...item, conversion: index === 0 ? 1 : item.value / Math.max(rows[index - 1].value, 1) }));
}

export const revenueSeries = [36, 44, 34, 46, 52, 49, 58, 62, 57, 66, 72, 68, 64, 60, 67, 71, 84, 79, 91, 74, 88, 104, 86, 82, 98, 117, 91, 88, 79, 101];
export const previousRevenueSeries = [29, 34, 31, 38, 41, 39, 45, 43, 49, 47, 54, 51, 48, 46, 52, 57, 61, 58, 68, 56, 67, 73, 66, 71, 77, 86, 72, 67, 65, 79];
