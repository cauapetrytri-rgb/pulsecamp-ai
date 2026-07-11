export type AppView =
  | "dashboard"
  | "ai-insights"
  | "campaigns"
  | "creatives"
  | "sites"
  | "links"
  | "origins"
  | "integrations"
  | "conversations"
  | "leads"
  | "pipeline"
  | "sales"
  | "team"
  | "attribution"
  | "reports"
  | "events"
  | "goals"
  | "companies"
  | "users"
  | "settings"
  | "billing";

export type IconName =
  | "dashboard"
  | "sparkles"
  | "campaign"
  | "creative"
  | "site"
  | "link"
  | "origin"
  | "integration"
  | "conversation"
  | "lead"
  | "pipeline"
  | "sale"
  | "team"
  | "attribution"
  | "report"
  | "event"
  | "goal"
  | "company"
  | "user"
  | "settings"
  | "billing"
  | "calendar"
  | "filter"
  | "bell"
  | "help"
  | "plus"
  | "search"
  | "download"
  | "copy"
  | "check"
  | "warning"
  | "clock"
  | "arrow";

export const navigationSections: Array<{
  label: string;
  items: Array<{ id: AppView; label: string; icon: IconName; badge?: string }>;
}> = [
  {
    label: "Visão geral",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard" },
      { id: "ai-insights", label: "Insights da IA", icon: "sparkles" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "campaigns", label: "Campanhas", icon: "campaign" },
      { id: "creatives", label: "Criativos", icon: "creative" },
      { id: "sites", label: "Sites e tags", icon: "site" },
      { id: "links", label: "Links rastreáveis", icon: "link" },
      { id: "origins", label: "Origens", icon: "origin" },
      { id: "integrations", label: "Integrações", icon: "integration" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { id: "conversations", label: "Conversas", icon: "conversation" },
      { id: "leads", label: "Leads", icon: "lead" },
      { id: "pipeline", label: "Pipeline", icon: "pipeline" },
      { id: "sales", label: "Vendas", icon: "sale" },
      { id: "team", label: "Equipe", icon: "team" },
    ],
  },
  {
    label: "Análise",
    items: [
      { id: "attribution", label: "Atribuição", icon: "attribution" },
      { id: "reports", label: "Relatórios", icon: "report" },
      { id: "events", label: "Eventos Meta", icon: "event" },
      { id: "goals", label: "Metas", icon: "goal" },
    ],
  },
  {
    label: "Administração",
    items: [
      { id: "companies", label: "Empresas", icon: "company" },
      { id: "users", label: "Usuários", icon: "user" },
      { id: "settings", label: "Configurações", icon: "settings" },
      { id: "billing", label: "Plano e cobrança", icon: "billing" },
    ],
  },
];

export const viewMeta: Record<AppView, { title: string; description: string }> = {
  dashboard: { title: "Dashboard", description: "Resumo do desempenho de marketing e vendas." },
  "ai-insights": { title: "Insights da IA", description: "Oportunidades, riscos e ações sustentadas pelos seus dados." },
  campaigns: { title: "Campanhas", description: "Compare investimento, leads, vendas e receita por campanha." },
  creatives: { title: "Criativos", description: "Analise quais peças atraem leads e geram vendas." },
  sites: { title: "Sites e tags", description: "Instale, verifique e monitore containers do Google Tag Manager." },
  links: { title: "Links rastreáveis", description: "Crie e acompanhe links com atribuição de origem." },
  origins: { title: "Origens", description: "Entenda os canais que trazem leads, vendas e receita." },
  integrations: { title: "Integrações", description: "Gerencie conexões, permissões e sincronizações." },
  conversations: { title: "Conversas", description: "Atenda e qualifique leads sem perder o contexto da campanha." },
  leads: { title: "Leads", description: "Consulte origem, etapa, qualidade e responsável de cada oportunidade." },
  pipeline: { title: "Pipeline", description: "Acompanhe oportunidades e gargalos por etapa comercial." },
  sales: { title: "Vendas", description: "Veja receita atribuída por campanha, canal e vendedor." },
  team: { title: "Equipe", description: "Compare capacidade, atendimento e resultados comerciais." },
  attribution: { title: "Atribuição", description: "Reconstrua a jornada entre clique, conversa, qualificação e venda." },
  reports: { title: "Relatórios", description: "Salve, exporte e compartilhe análises da operação." },
  events: { title: "Eventos Meta", description: "Audite o retorno de leads qualificados para a Meta." },
  goals: { title: "Metas", description: "Acompanhe objetivos de receita, vendas e eficiência." },
  companies: { title: "Empresas", description: "Organize clientes e conexões da sua operação." },
  users: { title: "Usuários", description: "Gerencie equipe, funções e acessos." },
  settings: { title: "Configurações", description: "Defina etapas, eventos, notificações e regras da conta." },
  billing: { title: "Plano e cobrança", description: "Acompanhe plano, uso e dados de cobrança." },
};

export function isAppView(value: unknown): value is AppView {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(viewMeta, value);
}

export function dashboardHref(view: AppView, clientId = "all") {
  const params = new URLSearchParams();
  if (view !== "dashboard") params.set("view", view);
  if (clientId !== "all") params.set("client", clientId);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
