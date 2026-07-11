"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BillingPage, CompaniesPage, SettingsPage, UsersPage } from "@/components/pages/admin-pages";
import { AiInsightsPage, AttributionPage, EventsPage, GoalsPage, ReportsPage } from "@/components/pages/analysis-pages";
import { ConversationsPage, LeadsPage, PipelinePage, SalesPage, TeamPage } from "@/components/pages/commercial-pages";
import { DashboardPage } from "@/components/pages/dashboard-page";
import { CampaignsPage, CreativesPage, IntegrationsPage, LinksPage, OriginsPage } from "@/components/pages/marketing-pages";
import { SitesPage } from "@/components/pages/sites-page";
import { Icon } from "@/components/ui/icon";
import { dashboardHref, navigationSections, type AppView, viewMeta } from "@/lib/navigation";
import type { DashboardData } from "@/lib/types";

function filteredDashboardData(data: DashboardData, clientId: string): DashboardData {
  if (clientId === "all") return data;
  const campaigns = data.campaigns.filter((campaign) => campaign.client_id === clientId);
  const metaConnections = data.metaConnections.filter((connection) => connection.client_id === clientId);
  const journeyStages = data.journeyStages.filter((stage) => stage.client_id === clientId);
  const leads = data.leads.filter((lead) => lead.client_id === clientId);
  const events = data.events.filter((event) => event.client_id === clientId);
  const sales = data.sales.filter((sale) => sale.client_id === clientId);
  const sites = data.sites.filter((site) => site.client_id === clientId);
  const trackedLinks = data.trackedLinks.filter((link) => link.client_id === clientId);
  const totals = campaigns.reduce((acc, campaign) => ({
    spend: acc.spend + campaign.spend,
    conversations: acc.conversations + campaign.conversations,
    qualified: acc.qualified + campaign.qualified,
    sales: acc.sales + campaign.sales,
    revenue: acc.revenue + campaign.revenue,
    pendingEvents: acc.pendingEvents,
  }), { spend: 0, conversations: 0, qualified: 0, sales: 0, revenue: 0, pendingEvents: 0 });
  totals.pendingEvents = events.filter((event) => event.status === "pending" || event.status === "failed").length;
  return { ...data, metaConnections, journeyStages, campaigns, leads, events, sales, sites, trackedLinks, totals };
}

type DashboardProps = {
  data: DashboardData;
  initialView: AppView;
  initialClient: string;
};

export function Dashboard({ data, initialView = "dashboard", initialClient = "all" }: DashboardProps) {
  const router = useRouter();
  const [view, setView] = useState<AppView>(initialView);
  const [selectedClient, setSelectedClient] = useState(initialClient);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();
  const currentData = useMemo(() => filteredDashboardData(data, selectedClient), [data, selectedClient]);
  const currentCompany = data.clients.find((client) => client.id === selectedClient);
  const demoClientId = selectedClient === "all" ? data.clients[0]?.id : selectedClient;
  const formClientId = selectedClient === "all" ? data.clients[0]?.id || "" : selectedClient;

  useEffect(() => setView(initialView), [initialView]);
  useEffect(() => setSelectedClient(initialClient), [initialClient]);

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3800);
  }

  function openView(next: AppView) {
    setView(next);
    setMobileOpen(false);
    router.push(dashboardHref(next, selectedClient), { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectClient(clientId: string) {
    setSelectedClient(clientId);
    router.push(dashboardHref(view, clientId), { scroll: false });
  }

  async function post(url: string, body: unknown | undefined, success: string) {
    setActiveAction(url);
    try {
      const response = await fetch(url, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
      notify(success);
      startTransition(() => router.refresh());
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
      return false;
    } finally {
      setActiveAction(null);
    }
  }

  const common = {
    data: currentData,
    onNotify: notify,
    onQualify: (leadId: string) => post(`/api/leads/${leadId}/qualify`, undefined, "Lead qualificado e evento Meta processado."),
    onMoveStage: (leadId: string, stageKey: string) => post(`/api/leads/${leadId}/stage`, { stageKey }, "Etapa atualizada e evento Meta processado."),
    onRegisterSale: (input: { leadId: string; value: number; currency: string }) => post("/api/sales", input, "Venda registrada e Purchase enviado para processamento."),
    busy: Boolean(activeAction),
  };

  function renderPage() {
    switch (view) {
      case "dashboard": return <DashboardPage data={currentData} onOpenView={openView} onNotify={notify} />;
      case "ai-insights": return <AiInsightsPage data={currentData} onNotify={notify} />;
      case "campaigns": return <CampaignsPage data={currentData} onNotify={notify} />;
      case "creatives": return <CreativesPage data={currentData} onNotify={notify} />;
      case "sites": return <SitesPage data={currentData} defaultClientId={formClientId} busy={Boolean(activeAction)} onNotify={notify} onCreate={(input) => post("/api/sites", input, "Site cadastrado. Instale os snippets e faça a verificação.")} onVerify={(siteId) => post(`/api/sites/${siteId}/verify`, undefined, "Verificação do site concluída.")} />;
      case "links": return <LinksPage data={currentData} onNotify={notify} defaultClientId={formClientId} busy={Boolean(activeAction)} onCreate={(input) => post("/api/links", input, "Link rastreável criado.")} />;
      case "origins": return <OriginsPage data={currentData} onNotify={notify} />;
      case "integrations": return <IntegrationsPage data={currentData} onNotify={notify} onOpenSites={() => openView("sites")} defaultClientId={formClientId} busy={Boolean(activeAction)} onSaveMeta={(input) => post("/api/meta/connections", input, "Conexão Meta salva com segurança.")} onTestMeta={(clientId) => post(`/api/meta/connections/${clientId}/test`, undefined, "Conexão com a Meta validada.")} />;
      case "conversations": return <ConversationsPage {...common} />;
      case "leads": return <LeadsPage {...common} />;
      case "pipeline": return <PipelinePage {...common} />;
      case "sales": return <SalesPage {...common} />;
      case "team": return <TeamPage {...common} />;
      case "attribution": return <AttributionPage data={currentData} onNotify={notify} />;
      case "reports": return <ReportsPage data={currentData} onNotify={notify} />;
      case "events": return <EventsPage data={currentData} onNotify={notify} onRetry={(eventId) => post(`/api/events/${eventId}/retry`, undefined, "Evento reenviado para processamento.")} />;
      case "goals": return <GoalsPage data={currentData} onNotify={notify} />;
      case "companies": return <CompaniesPage data={data} onNotify={notify} busy={Boolean(activeAction)} onCreateClient={(input) => post("/api/clients", input, "Empresa adicionada com a jornada padrão.")} onSelectClient={(clientId) => { setSelectedClient(clientId); setView("dashboard"); router.push(dashboardHref("dashboard", clientId), { scroll: false }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />;
      case "users": return <UsersPage data={currentData} onNotify={notify} />;
      case "settings": return <SettingsPage data={currentData} onNotify={notify} busy={Boolean(activeAction)} onSaveJourney={(input) => post("/api/journey", input, "Jornada e eventos salvos.")} onSaveQualification={(clientId, threshold) => post(`/api/clients/${clientId}/qualification`, { threshold }, "Regra de qualificação salva.")} />;
      case "billing": return <BillingPage data={currentData} onNotify={notify} />;
    }
  }

  const meta = viewMeta[view];
  return (
    <div className={`product-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen ? <button className="mobile-overlay" type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`product-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <header className="product-brand">
          <button className="brand-button" type="button" onClick={() => openView("dashboard")} aria-label="Ir para o dashboard"><span className="brand-mark"><i /><i /><i /></span><strong>PulseCamp</strong></button>
          <button className="collapse-button" type="button" aria-label={collapsed ? "Expandir menu" : "Recolher menu"} onClick={() => setCollapsed((value) => !value)}><Icon name="arrow" /></button>
        </header>

        <div className="company-picker">
          <label htmlFor="sidebar-company">Empresa</label>
          <select id="sidebar-company" value={selectedClient} onChange={(event) => selectClient(event.target.value)}>
            <option value="all">Órbita Growth</option>
            {data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>

        <nav className="product-nav" aria-label="Navegação principal">
          {navigationSections.map((section) => <div className="nav-group" key={section.label}><span>{section.label}</span>{section.items.map((item) => <button key={item.id} type="button" className={view === item.id ? "active" : ""} aria-label={item.label} aria-current={view === item.id ? "page" : undefined} onClick={() => openView(item.id)}><Icon name={item.icon} /><strong>{item.label}</strong>{item.id === "conversations" && currentData.leads.length ? <em>{currentData.leads.length}</em> : item.badge ? <em>{item.badge}</em> : null}</button>)}</div>)}
        </nav>

        <div className="plan-card">
          <header><div><small>Plano</small><strong>Pro Agência</strong></div><Icon name="arrow" /></header>
          <div><i style={{ width: "38%" }} /></div>
          <span>Uso: 38% da capacidade</span>
        </div>
        <footer className="sidebar-user"><span>CP</span><div><strong>Cauã Petry</strong><small>Administrador</small></div><button type="button" aria-label="Opções do perfil" onClick={() => notify("Opções do perfil abertas.")}>•••</button></footer>
      </aside>

      <div className="product-main">
        <header className="product-header">
          <button className="mobile-menu-button" type="button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><span /><span /><span /></button>
          <div className="page-heading">
            <h1>{view === "dashboard" ? "Boa tarde, Cauã!" : meta.title}</h1>
            <p>{view === "dashboard" ? "Aqui está o resumo do desempenho do seu marketing hoje." : meta.description}</p>
          </div>
          <div className="header-actions">
            <button className="date-button" type="button" onClick={() => notify("Seletor de período aberto.")}><Icon name="calendar" /><span>01/05/2026 - 30/05/2026</span><i>⌄</i></button>
            <button className="filter-button" type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}><Icon name="filter" /><span>Filtros</span></button>
            <span className="sync-label"><i />Sincronizado há 2 min</span>
            <button className="header-icon" type="button" aria-label="Notificações" onClick={() => notify("Você tem 5 alertas operacionais.")}><Icon name="bell" /><em>5</em></button>
            <button className="header-icon" type="button" aria-label="Ajuda" onClick={() => notify("Central de ajuda aberta.")}><Icon name="help" /></button>
            <div className="quick-create"><button className="quick-button" type="button" aria-label="Criar" aria-expanded={quickOpen} onClick={() => setQuickOpen((value) => !value)}><Icon name="plus" /></button>{quickOpen ? <div className="quick-menu"><button type="button" disabled={!demoClientId || Boolean(activeAction)} onClick={() => { setQuickOpen(false); post("/api/demo/lead", { clientId: demoClientId }, "Novo lead recebido, classificado e sincronizado."); }}><Icon name="lead" />Simular novo lead</button><button type="button" onClick={() => { setQuickOpen(false); openView("links"); }}><Icon name="link" />Criar link rastreável</button><button type="button" onClick={() => { setQuickOpen(false); openView("users"); }}><Icon name="user" />Convidar usuário</button></div> : null}</div>
          </div>
        </header>

        {filtersOpen ? <div className="global-filter-bar"><label>Empresa<select value={selectedClient} onChange={(event) => selectClient(event.target.value)}><option value="all">Todas as empresas</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Canal<select><option>Todos os canais</option><option>Meta Ads</option><option>Google Ads</option></select></label><label>Status<select><option>Todos os status</option><option>Ativo</option><option>Com atenção</option></select></label><button className="text-button" type="button" onClick={() => { selectClient("all"); setFiltersOpen(false); }}>Limpar filtros</button><button className="primary-button" type="button" onClick={() => setFiltersOpen(false)}>Aplicar</button></div> : null}

        <div className="workspace-banner"><span className={data.runtime.capiDryRun ? "demo" : "live"}>{data.runtime.capiDryRun ? "Ambiente de demonstração" : "Produção"}</span><strong>{currentCompany?.name || "Todas as empresas"}</strong><small>{currentData.totals.conversations} leads no período</small></div>
        <main className="product-content">{renderPage()}</main>
      </div>

      {notice ? <div className="product-toast" role="status" aria-live="polite"><Icon name="check" />{notice}</div> : null}
      {isRefreshing ? <div className="refresh-progress" /> : null}
    </div>
  );
}
