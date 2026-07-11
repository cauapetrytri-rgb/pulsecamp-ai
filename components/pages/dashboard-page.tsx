import { Icon } from "@/components/ui/icon";
import { PanelHeader } from "@/components/ui/page-parts";
import type { AppView, IconName } from "@/lib/navigation";
import { campaignMetrics, channelRows, funnelRows, money, number, previousRevenueSeries, rate, revenueSeries } from "@/lib/presentation";
import type { DashboardData } from "@/lib/types";

type Props = {
  data: DashboardData;
  onOpenView: (view: AppView) => void;
  onNotify: (message: string) => void;
};

function linePoints(values: number[], width = 780, height = 215) {
  const max = Math.max(...revenueSeries, ...previousRevenueSeries) * 1.08;
  return values.map((value, index) => `${(index / (values.length - 1)) * width},${height - (value / max) * height}`).join(" ");
}
function KpiCard({ label, value, delta, positive, icon, tone, detail }: { label: string; value: string; delta: string; positive: boolean; icon: IconName; tone: string; detail: string }) {
  return (
    <article className="executive-kpi">
      <header><span>{label}</span><i className={tone}><Icon name={icon} /></i></header>
      <strong>{value}</strong>
      <footer><em className={positive ? "positive" : "negative"}>{positive ? "↗" : "↘"} {delta}</em><span>vs. período anterior</span></footer>
      <small>{detail}</small>
    </article>
  );
}

export function DashboardPage({ data, onOpenView, onNotify }: Props) {
  const { totals } = data;
  const cpl = totals.conversations ? totals.spend / totals.conversations : 0;
  const roas = totals.spend ? totals.revenue / totals.spend : 0;
  const channels = channelRows(totals);
  const funnel = funnelRows(totals);
  const topCampaigns = data.campaigns.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const alerts: Array<{ tone: "danger" | "warning" | "info"; title: string; detail: string; action: string; view: AppView }> = [
    { tone: "danger", title: "14 leads sem resposta há mais de 2 horas", detail: "Impacto potencial: R$ 8.400", action: "Ver leads", view: "leads" },
    { tone: "warning", title: "Vista Parque consumiu verba sem gerar nova venda", detail: "Investimento no período: R$ 2.980", action: "Ver campanha", view: "campaigns" },
    { tone: "warning", title: "Taxa de qualificação caiu 8,3%", detail: "Comparado ao período anterior", action: "Ver relatório", view: "reports" },
    { tone: "warning", title: "6 follow-ups comerciais estão atrasados", detail: "Impacto potencial: R$ 11.300", action: "Ver pipeline", view: "pipeline" },
    { tone: "info", title: "Google Ads ainda não está conectado", detail: "Dados desta origem não são importados", action: "Configurar", view: "integrations" },
  ];

  return (
    <div className="dashboard-page">
      <section className="kpi-row" aria-label="Indicadores principais">
        <KpiCard label="Investimento" value={money(totals.spend, 2)} delta="18,2%" positive icon="billing" tone="blue" detail="Total investido em mídia" />
        <KpiCard label="Leads" value={number(totals.conversations)} delta="15,7%" positive icon="lead" tone="green" detail="Conversas iniciadas" />
        <KpiCard label="Custo por lead" value={money(cpl, 2)} delta="2,3%" positive={false} icon="creative" tone="purple" detail="Investimento ÷ leads" />
        <KpiCard label="Vendas" value={number(totals.sales)} delta="23,4%" positive icon="sale" tone="orange" detail={`${rate(totals.sales / Math.max(totals.conversations, 1))} de conversão`} />
        <KpiCard label="Receita" value={money(totals.revenue, 2)} delta="28,6%" positive icon="report" tone="green" detail="Vendas atribuídas" />
        <KpiCard label="ROAS" value={`${roas.toFixed(2).replace(".", ",")}x`} delta="8,7%" positive icon="goal" tone="blue" detail="Receita ÷ investimento" />
      </section>

      <section className="dashboard-primary-grid">
        <article className="surface-panel revenue-panel">
          <div className="chart-toolbar">
            <PanelHeader title="Evolução de receita" description="Receita atribuída no período selecionado" />
            <div><select aria-label="Agrupamento do gráfico" defaultValue="daily"><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select><button type="button" className="icon-button" aria-label="Mais opções" onClick={() => onNotify("Opções do gráfico disponíveis no relatório completo.")}>•••</button></div>
          </div>
          <div className="chart-legend"><span><i className="current" />Receita</span><span><i className="previous" />Período anterior</span></div>
          <div className="line-chart">
            <div className="y-axis"><span>R$ 20k</span><span>R$ 15k</span><span>R$ 10k</span><span>R$ 5k</span><span>R$ 0</span></div>
            <svg viewBox="0 0 780 215" preserveAspectRatio="none" role="img" aria-label="Receita diária comparada ao período anterior">
              <g className="chart-grid"><line x1="0" y1="0" x2="780" y2="0"/><line x1="0" y1="54" x2="780" y2="54"/><line x1="0" y1="108" x2="780" y2="108"/><line x1="0" y1="162" x2="780" y2="162"/><line x1="0" y1="214" x2="780" y2="214"/></g>
              <polyline className="previous-line" points={linePoints(previousRevenueSeries)} />
              <polyline className="current-line" points={linePoints(revenueSeries)} />
            </svg>
            <div className="x-axis"><span>01/05</span><span>05/05</span><span>09/05</span><span>13/05</span><span>17/05</span><span>21/05</span><span>25/05</span><span>30/05</span></div>
          </div>
        </article>

        <article className="surface-panel attention-panel">
          <PanelHeader title="Atenção necessária" action="Ver todas (5)" onAction={() => onOpenView("ai-insights")} />
          <div className="attention-list">
            {alerts.map((alert) => <div key={alert.title}><Icon name={alert.tone === "info" ? "help" : "warning"} className={alert.tone} /><div><strong>{alert.title}</strong><small>{alert.detail}</small></div><button type="button" className="secondary-button compact" onClick={() => onOpenView(alert.view)}>{alert.action}</button></div>)}
          </div>
        </article>
      </section>

      <section className="dashboard-secondary-grid">
        <article className="surface-panel channel-panel">
          <PanelHeader title="Desempenho por canal" action="Ver relatório completo" onAction={() => onOpenView("origins")} />
          <div className="table-wrap"><table className="compact-table"><thead><tr><th>Canal</th><th>Investimento</th><th>Leads</th><th>Vendas</th><th>Receita</th><th>ROAS</th></tr></thead><tbody>{channels.map((row) => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{money(row.spend)}</td><td>{row.leads}</td><td>{row.sales}</td><td>{money(row.revenue)}</td><td>{row.roas ? `${row.roas.toFixed(2)}x` : "—"}</td></tr>)}</tbody></table></div>
        </article>

        <article className="surface-panel funnel-panel">
          <PanelHeader title="Funil de vendas" action="Ver funil completo" onAction={() => onOpenView("pipeline")} />
          <div className="funnel-visual">{funnel.map((step, index) => <div key={step.label} style={{ width: `${100 - index * 11}%` }}><span>{step.label}</span><strong>{step.value}</strong><small>{rate(step.conversion)}</small></div>)}</div>
        </article>

        <article className="surface-panel top-campaigns-panel">
          <PanelHeader title="Receita por campanha" action="Ver campanhas" onAction={() => onOpenView("campaigns")} />
          <div className="rank-list">{topCampaigns.map((campaign, index) => { const metric = campaignMetrics(campaign); return <div key={campaign.id}><span>{index + 1}</span><div><strong>{campaign.campaign_name}</strong><small>{campaign.ad_name}</small></div><b>{money(campaign.revenue)}</b><em>{metric.roas.toFixed(1)}x</em></div>; })}</div>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="surface-panel sales-preview">
          <PanelHeader title="Últimas vendas atribuídas" action="Ver todas" onAction={() => onOpenView("sales")} />
          <div className="table-wrap"><table className="compact-table"><thead><tr><th>Cliente</th><th>Origem</th><th>Campanha</th><th>Valor</th><th>Data</th></tr></thead><tbody>{topCampaigns.slice(0, 4).map((campaign, index) => <tr key={campaign.id}><td><strong>{["Mariana Silva", "Paulo Vieira", "Carla Souza", "Diego Martins"][index]}</strong></td><td><span className="channel-pill">Meta Ads</span></td><td>{campaign.campaign_name}</td><td><strong>{money(campaign.revenue / Math.max(campaign.sales, 1))}</strong></td><td>Hoje, {11 - index}:3{index}</td></tr>)}</tbody></table></div>
        </article>

        <aside className="right-column-stack">
          <article className="surface-panel insight-preview">
            <PanelHeader title="Insights da IA" action="Ver todos" onAction={() => onOpenView("ai-insights")} />
            <div className="insight-callout"><span><Icon name="sparkles" /></span><div><h3>Demora no atendimento reduz a conversão</h3><p>Leads atendidos em até 10 minutos convertem 2,4x mais do que os atendidos depois de uma hora.</p><small>Impacto estimado</small><strong>R$ 12.800 / mês</strong></div></div>
            <div className="insight-actions"><button type="button" className="secondary-button" onClick={() => onOpenView("leads")}>Ver leads afetados</button><button type="button" className="primary-button" onClick={() => onNotify("Automação criada em modo de rascunho.")}>Criar automação</button></div>
          </article>
          <article className="surface-panel activity-preview">
            <PanelHeader title="Atividade da equipe" action="Ver todas" onAction={() => onOpenView("team")} />
            <div className="activity-list"><div><span>LF</span><p><strong>Lucas Ferreira</strong> moveu um lead para Qualificado<small>Há 8 minutos</small></p></div><div><span>AM</span><p><strong>Ana Martins</strong> registrou uma venda de R$ 3.450<small>Há 21 minutos</small></p></div></div>
          </article>
        </aside>
      </section>
    </div>
  );
}
