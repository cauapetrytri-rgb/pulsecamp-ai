import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { EmptyState, MetricStrip, PanelHeader, StatusBadge } from "@/components/ui/page-parts";
import { initials, money, number } from "@/lib/presentation";
import type { DashboardData, MetaStandardEvent } from "@/lib/types";

type ClientInput = { name: string; niche: string; qualificationThreshold: number };
type CommonProps = {
  data: DashboardData;
  onNotify: (message: string) => void;
  onSelectClient?: (id: string) => void;
  onCreateClient?: (input: ClientInput) => Promise<boolean>;
  onSaveJourney?: (input: unknown) => Promise<boolean>;
  onSaveQualification?: (clientId: string, threshold: number) => Promise<boolean>;
  busy?: boolean;
};

export function CompaniesPage({ data, onSelectClient, onCreateClient, busy }: CommonProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const clients = useMemo(() => data.clients.filter((client) => {
    const matchesSearch = `${client.name} ${client.niche} ${client.slug}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"));
    const matchesStatus = status === "all" || client.status === status;
    return matchesSearch && matchesStatus;
  }), [data.clients, search, status]);

  return <div className="stack-page">
    <MetricStrip items={[
      { label: "Empresas contratadas", value: "10", detail: "Limite do plano" },
      { label: "Empresas ativas", value: String(data.clients.length), detail: "Em operação" },
      { label: "Disponíveis", value: String(Math.max(0, 10 - data.clients.length)), detail: "Podem ser ativadas" },
      { label: "Com atenção", value: String(data.clients.filter((client) => client.status !== "connected").length), detail: "Revisar configuração" },
    ]} />
    <section className="surface-panel data-page">
      <div className="page-toolbar">
        <label className="search-control"><Icon name="search" /><input aria-label="Pesquisar empresas" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome da empresa" /></label>
        <select aria-label="Status da empresa" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os status</option><option value="connected">Ativas</option><option value="attention">Com atenção</option><option value="setup">Em configuração</option></select>
        <div className="toolbar-spacer" />
        <button className="primary-button" type="button" disabled={data.clients.length >= 10} onClick={() => setShowForm(true)}><Icon name="plus" />Adicionar empresa</button>
      </div>
      {clients.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Empresa</th><th>Status</th><th>Segmento</th><th>WhatsApp</th><th>Meta Ads</th><th>Eventos</th><th>Qualificação</th><th>Ações</th></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><div className="person-cell company"><span>{initials(client.name)}</span><div><strong>{client.name}</strong><small>{client.slug}</small></div></div></td><td><StatusBadge tone={client.status === "connected" ? "success" : client.status === "attention" ? "warning" : "neutral"}>{client.status === "connected" ? "Ativa" : client.status === "attention" ? "Revisar" : "Configurar"}</StatusBadge></td><td>{client.niche}</td><td>{client.phone_number_id ? "Configurado" : "Pendente"}</td><td>{client.meta_dataset_id ? "Configurado" : "Pendente"}</td><td>{data.events.filter((event) => event.client_id === client.id).length}</td><td>Score ≥ {client.qualification_threshold}</td><td><button className="text-action" type="button" onClick={() => onSelectClient?.(client.id)}>Visualizar</button></td></tr>)}</tbody></table></div> : <EmptyState title="Nenhuma empresa encontrada" description="Ajuste a busca ou o filtro de status." action="Limpar filtros" onAction={() => { setSearch(""); setStatus("all"); }} />}
    </section>
    {showForm ? <><button className="drawer-overlay" type="button" aria-label="Fechar formulário" onClick={() => setShowForm(false)} /><aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="new-company-title"><header><div><small>Novo cliente</small><h2 id="new-company-title">Adicionar empresa</h2><p>A jornada comercial será criada pronta para configuração.</p></div><button type="button" aria-label="Fechar" onClick={() => setShowForm(false)}>×</button></header><form className="drawer-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const created = await onCreateClient?.({ name: String(form.get("name")), niche: String(form.get("niche")), qualificationThreshold: Number(form.get("qualificationThreshold")) }); if (created) setShowForm(false); }}><label>Nome da empresa<input name="name" autoFocus required minLength={2} maxLength={80} placeholder="Ex.: Clínica Horizonte" /></label><label>Segmento<input name="niche" required minLength={2} maxLength={80} placeholder="Ex.: Saúde" /></label><label>Score mínimo para qualificação<input name="qualificationThreshold" type="number" min="0" max="100" defaultValue="70" required /></label><div className="form-note"><Icon name="check" /><span>A empresa começa em modo de configuração. Depois, conecte Meta e WhatsApp em Integrações.</span></div><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}>Adicionar empresa</button></div></form></aside></> : null}
  </div>;
}

export function UsersPage({ onNotify }: CommonProps) {
  const users = [
    { name: "Cauã Petry", email: "caua@orbitagrowth.com", role: "Administrador", companies: "Todas", status: "Ativo", last: "Agora" },
    { name: "Lucas Ferreira", email: "lucas@orbitagrowth.com", role: "Comercial", companies: "Solar Prime", status: "Ativo", last: "Há 8 min" },
    { name: "Ana Martins", email: "ana@orbitagrowth.com", role: "Gestora de tráfego", companies: "3 empresas", status: "Ativo", last: "Há 21 min" },
    { name: "Rafael Costa", email: "rafael@orbitagrowth.com", role: "Comercial", companies: "Alfa Imóveis", status: "Convite pendente", last: "Nunca" },
  ];
  return <section className="surface-panel data-page"><div className="page-toolbar"><label className="search-control"><Icon name="search" /><input aria-label="Pesquisar usuários" placeholder="Nome ou e-mail" /></label><select aria-label="Papel do usuário"><option>Todos os papéis</option></select><div className="toolbar-spacer"/><button className="primary-button" type="button" onClick={() => onNotify("Convites serão liberados com a autenticação multiusuário.")}><Icon name="plus" />Convidar usuário</button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Usuário</th><th>Função</th><th>Empresas</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>{users.map((user) => <tr key={user.email}><td><div className="person-cell"><span>{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td>{user.role}</td><td>{user.companies}</td><td><StatusBadge tone={user.status === "Ativo" ? "success" : "warning"}>{user.status}</StatusBadge></td><td>{user.last}</td><td><button className="row-action" type="button" aria-label={`Abrir permissões de ${user.name}`} onClick={() => onNotify(`Permissões de ${user.name} abertas.`)}>•••</button></td></tr>)}</tbody></table></div></section>;
}

export function SettingsPage({ data, onSaveJourney, onSaveQualification, busy }: CommonProps) {
  const [tab, setTab] = useState("pipeline");
  const [clientId, setClientId] = useState(data.journeyStages[0]?.client_id || data.clients[0]?.id || "");
  const stages = data.journeyStages.filter((stage) => stage.client_id === clientId);
  const selectedClient = data.clients.find((client) => client.id === clientId);
  const tabs = [
    { id: "pipeline", label: "Etapas comerciais" },
    { id: "qualification", label: "Qualificação" },
    { id: "events", label: "Eventos" },
    { id: "notifications", label: "Notificações" },
    { id: "security", label: "Segurança" },
  ];
  const eventOptions: Array<MetaStandardEvent> = ["Contact", "LeadSubmitted", "Schedule", "InitiateCheckout", "Purchase"];
  const clientPicker = data.clients.length > 1 ? <label className="settings-client-picker">Empresa<select value={clientId} onChange={(event) => setClientId(event.target.value)}>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label> : null;
  return <div className="settings-layout">
    <aside className="surface-panel settings-nav">{tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}<Icon name="arrow" /></button>)}</aside>
    <section className="surface-panel settings-content">
      {tab === "pipeline" ? <><PanelHeader title="Jornada comercial" description="Cada mudança de etapa pode devolver uma conversão diferente para a Meta." />{clientPicker}<div className="stage-settings">{stages.map((stage, index) => <div key={stage.id}><span aria-hidden="true">⋮⋮</span><i>{index + 1}</i><strong>{stage.label}</strong><small>{stage.event_name || "Sem evento"}</small></div>)}</div></> : null}
      {tab === "qualification" ? <><PanelHeader title="Regras de qualificação" description="O limite é aplicado por empresa ao webhook e à classificação automática." />{clientPicker}<form key={clientId} className="settings-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); await onSaveQualification?.(clientId, Number(form.get("threshold"))); }}><label>Score mínimo para qualificação<input name="threshold" type="number" defaultValue={selectedClient?.qualification_threshold ?? 70} min="0" max="100" required /></label><label>Modelo de classificação<select value={data.runtime.openAiConfigured ? "openai" : "rules"} disabled><option value="rules">Regras locais</option><option value="openai">OpenAI</option></select></label><label className="toggle-row"><span><strong>Qualificar automaticamente</strong><small>Ativo no pipeline quando o score cruza o limite.</small></span><input type="checkbox" checked readOnly aria-label="Qualificação automática ativa" /></label><button className="primary-button" type="submit" disabled={busy || !clientId}>Salvar alterações</button></form></> : null}
      {tab === "events" ? <><PanelHeader title="Eventos de conversão" description="Mapeamento por empresa para cada etapa da jornada." />{clientPicker}<form key={clientId} className="journey-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); await onSaveJourney?.({ clientId, stages: stages.map((stage) => ({ stageKey: stage.stage_key, label: String(form.get(`label:${stage.stage_key}`)), eventName: form.get(`event:${stage.stage_key}`) || null, enabled: form.get(`enabled:${stage.stage_key}`) === "on" })) }); }}>{stages.map((stage) => <div className="journey-row" key={stage.id}><label>Nome da etapa<input name={`label:${stage.stage_key}`} defaultValue={stage.label} /></label><label>Evento Meta<select name={`event:${stage.stage_key}`} defaultValue={stage.event_name || ""}><option value="">Não enviar</option>{eventOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="journey-toggle"><input name={`enabled:${stage.stage_key}`} type="checkbox" defaultChecked={Boolean(stage.enabled)} /><span>Ativo</span></label>{stage.requires_value ? <StatusBadge tone="info">Exige valor</StatusBadge> : <span />}</div>)}<div className="journey-actions"><StatusBadge tone={data.runtime.capiDryRun ? "info" : "success"}>{data.runtime.capiDryRun ? "Modo teste" : "Produção"}</StatusBadge><button className="primary-button" type="submit" disabled={busy}>Salvar jornada</button></div></form></> : null}
      {tab === "notifications" ? <><PanelHeader title="Notificações" description="Preferências do painel para alertas operacionais." /><div className="settings-form">{["Lead sem resposta por 10 minutos", "Follow-up atrasado", "Falha de sincronização", "Evento Meta rejeitado"].map((label) => <label className="toggle-row" key={label}><span><strong>{label}</strong><small>Notificação dentro do produto.</small></span><input type="checkbox" defaultChecked /></label>)}</div></> : null}
      {tab === "security" ? <><PanelHeader title="Segurança e auditoria" description="Proteções do fluxo de conversões." /><div className="security-list"><div><Icon name="check"/><p><strong>Token criptografado</strong><span>AES-256-GCM com chave exclusiva do servidor; o token nunca volta para a interface.</span></p></div><div><Icon name="check"/><p><strong>Assinatura do webhook</strong><span>Validação HMAC quando META_APP_SECRET está configurado.</span></p></div><div><Icon name="check"/><p><strong>Autorização por empresa</strong><span>Sessão HttpOnly, papéis Admin/Analista e validação de client_id nas ações do servidor.</span></p></div><div className="warning"><Icon name="warning"/><p><strong>Infraestrutura de produção</strong><span>Troque as contas da demo, use PostgreSQL e rate limit distribuído antes de operar dados reais.</span></p></div></div></> : null}
    </section>
  </div>;
}

export function BillingPage({ data, onNotify }: CommonProps) {
  const used = Math.min(100, Math.round((data.totals.conversations / 2500) * 100));
  return <div className="billing-layout"><section className="surface-panel plan-overview"><header><div><small>Plano atual</small><h2>Pro Agência</h2><p>Para operações com múltiplas empresas e atribuição avançada.</p></div><StatusBadge tone="success">Ativo</StatusBadge></header><strong>R$ 497 <small>/ mês</small></strong><dl><div><dt>Próxima cobrança</dt><dd>12/08/2026</dd></div><div><dt>Forma de pagamento</dt><dd>•••• 4242</dd></div></dl><button className="secondary-button" type="button" onClick={() => onNotify("O portal de cobrança depende da configuração do provedor de pagamentos.")}>Gerenciar assinatura</button></section><section className="surface-panel usage-panel"><PanelHeader title="Uso do plano" description="Ciclo atual: 12/07 a 11/08" /><div className="usage-list"><div><header><span>Empresas</span><strong>{data.clients.length} de 10</strong></header><div><i style={{ width: `${Math.min(100, data.clients.length * 10)}%` }}/></div></div><div><header><span>Conversas rastreadas</span><strong>{number(data.totals.conversations)} de 2.500</strong></header><div><i style={{ width: `${used}%` }}/></div></div><div><header><span>Usuários</span><strong>4 de 15</strong></header><div><i style={{ width: "27%" }}/></div></div></div><small>Você será avisado antes de atingir qualquer limite.</small></section><section className="surface-panel invoice-panel"><PanelHeader title="Histórico de cobranças" /><div className="table-wrap"><table className="compact-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Status</th><th /></tr></thead><tbody>{["12/07/2026", "12/06/2026", "12/05/2026"].map((date) => <tr key={date}><td>{date}</td><td>Plano Pro Agência</td><td>{money(497)}</td><td><StatusBadge tone="success">Pago</StatusBadge></td><td><button className="text-action" type="button" onClick={() => onNotify("Recibo disponível após a configuração do provedor de cobrança.")}>Recibo</button></td></tr>)}</tbody></table></div></section></div>;
}
