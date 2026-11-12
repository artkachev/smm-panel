"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { EVENTS, fmtDateTime } from "@/lib/format";
import { Badge, Empty, ErrorNote, PageHeader } from "@/components/ui";

export default function Notifications() {
  const [type, setType] = useState("");
  const { data, error } = useApi<any>(`/notifications${type ? `?event_type=${type}` : ""}`, 15000);
  const rows: any[] = data?.notifications ?? [];
  return (
    <>
      <PageHeader title="Notifications" subtitle="Журнал событий и их доставка в Telegram (события постов группируются в одно сообщение)."
        actions={<label>Тип события<select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Все</option>{Object.entries(EVENTS).map(([k, [v]]) => <option key={k} value={k}>{v}</option>)}</select></label>} />
      <ErrorNote error={error} />
      <section className="card">
        {rows.length === 0 ? <Empty>Событий нет.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Время</th><th>Событие</th><th>Источник / ссылка</th><th>Подробности</th><th>Telegram</th></tr></thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id}>
                    <td className="small dim" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(n.created_at)}</td>
                    <td><Badge map={EVENTS} value={n.event_type} /></td>
                    <td>{n.source_name ?? n.payload?.source ?? ""}
                      {(n.post_url || n.payload?.url) && <div><a className="url" href={n.post_url || n.payload.url} target="_blank" rel="noreferrer noopener">{n.post_url || n.payload.url}</a></div>}</td>
                    <td className="detail">{n.payload?.error ?? (n.event_type === "pdf_sent" ? `получателей: ${n.payload.recipients}` : n.payload?.period ? `период ${n.payload.period.join(" – ")}, v${n.payload.version}, постов ${n.payload.posts}${n.payload.missing_screenshots ? `, без скриншота ${n.payload.missing_screenshots}` : ""}` : n.payload?.status ?? "")}</td>
                    <td className="small dim" title={n.error ?? undefined}>{{ pending: "ожидает", batched: "сгруппировано", sent: "отправлено", failed: "ошибка", suppressed: "не отправлено" }[n.status as string] ?? n.status}
                      {n.status === "sent" && n.delivered_to > 0 && <> · {n.delivered_to} получ.</>}
                      {n.status === "suppressed" && n.error && <div>{{ "repeated error within 6h": "повтор ошибки за 6 ч", "no Telegram recipients": "нет получателей", "older than 24h when delivery became possible": "устарело", "no matching recipients": "нет подходящих получателей", "on-demand send (log only)": "по запросу" }[n.error as string] ?? n.error}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
