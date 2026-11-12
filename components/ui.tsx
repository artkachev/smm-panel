"use client";

import type { ReactNode } from "react";

export function Badge({ map, value, title }: { map: Record<string, [string, string]>; value?: string | null; title?: string | null }) {
  const [label, tone] = (value && map[value]) || [value ?? "—", "muted"];
  return <span className={`badge ${tone}`} title={title ?? undefined}>{label}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function ErrorNote({ error }: { error?: string | null }) {
  return error ? <div className="note bad" role="alert">{error}</div> : null;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Stat({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: string; hint?: ReactNode }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
