import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

export function PanelHeader({ title, description, action, onAction }: { title: string; description?: string; action?: string; onAction?: () => void }) {
  return (
    <header className="panel-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <button type="button" className="text-action" onClick={onAction}>{action}{onAction ? <Icon name="arrow" /> : null}</button> : null}
    </header>
  );
}
export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty-state">
      <span><Icon name="search" /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <button className="secondary-button" type="button" onClick={onAction}>{action}</button> : null}
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "success" | "warning" | "danger" | "info" | "neutral"; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}><i />{children}</span>;
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: string; detail?: string }> }) {
  return <div className="metric-strip">{items.map((item) => <div key={item.label}><small>{item.label}</small><strong>{item.value}</strong>{item.detail ? <span>{item.detail}</span> : null}</div>)}</div>;
}
