"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/api";
import { REPORT, fmtDate, fmtDateTime } from "@/lib/format";
import { Badge, Empty, ErrorNote, PageHeader } from "@/components/ui";
import { DownloadButton } from "@/components/files";

const PART: Record<string, string> = { summary: "сводка", document: "PDF", links: "ссылки", message: "ошибка" };
function Deliveries({ list, tz }: { list: any[]; tz: string }) {
  const auto = list.filter((d) => !d.on_demand);
  if (!list.length) return null;
  const sentPdf = auto.filter((d) => d.kind === "document" && d.status === "sent");
  const failed = list.filter((d) => d.status === "failed");
  return (
    <details className="small">
      <summary>Telegram: {sentPdf.length ? `PDF отправлен (${sentPdf.length})` : failed.length ? "ошибка отправки" : "отправка частичная"}</summary>
      <ul>
        {list.map((d, k) => (
          <li key={k}>{fmtDateTime(d.created_at, tz)} · {d.recipient} · {PART[d.kind] ?? d.kind}{d.part ? ` ${d.part}` : ""}
            {d.on_demand && " (по запросу)"} · {d.status === "sent" ? "отправлено" : <span style={{ color: "var(--bad)" }}>ошибка: {d.error}</span>}</li>
        ))}
      </ul>
    </details>
  );
}
import { useCan } from "@/components/session";

const KIND: Record<string, string> = { daily: "Ежедневный", manual_day: "За день (вручную)", range: "За период" };

export default function Reports() {
  const { data, error, reload } = useApi<any>("/reports", 10000);
  const canOperate = useCan("operator");
  const [mode, setMode] = useState<"day" | "range">("day");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);

  async function request(s: string, e: string) {
    try {
      const r = await api("/reports", { method: "POST", json: { start: s, end: e } });
      setMsg(r.queued ? { tone: "ok", text: `Отчёт ${fmtDate(s)}${s !== e ? ` – ${fmtDate(e)}` : ""} поставлен в очередь.` }
                      : { tone: "info", text: "Такой отчёт уже формируется." });
      reload();
    } catch (err) { setMsg({ tone: "bad", text: (err as Error).message }); }
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Каждая генерация — новая версия; предыдущие сохраняются." />
      <ErrorNote error={error} />
      {msg && <div className={`note ${msg.tone}`}>{msg.text}</div>}

      {canOperate && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); request(start, mode === "day" ? start : end); }}>
          <h2>Сформировать отчёт</h2>
          <div className="form-row">
            <label>Период<select value={mode} onChange={(e) => setMode(e.target.value as "day" | "range")}>
              <option value="day">Один день</option><option value="range">Диапазон дат</option></select></label>
            <label>{mode === "day" ? "День" : "С"}<input type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></label>
            {mode === "range" && <label>По<input type="date" required value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></label>}
            <button className="primary">Сформировать</button>
          </div>
        </form>
      )}

      {(data?.pending ?? []).length > 0 && (
        <section className="card">
          <h2>В работе</h2>
          {data.pending.map((j: any) => (
            <div key={j.id} className="small" style={{ marginBottom: 4 }}>
              {KIND[j.payload.kind]} {fmtDate(j.payload.start)}{j.payload.end !== j.payload.start && ` – ${fmtDate(j.payload.end)}`}
              {" · "}<Badge map={{ queued: ["В очереди", "muted"], running: ["Формируется", "info"] }} value={j.status} />
              {j.last_error?.startsWith("deferred") && <span className="dim"> · ждёт: {j.last_error.replace("deferred: ", "")}</span>}
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h2>История</h2>
        {(data?.reports ?? []).length === 0 ? <Empty>Отчётов пока нет.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Период</th><th>Тип</th><th>Версия</th><th>Статус</th><th className="num">Страниц</th>
                <th className="num">Постов</th><th>Сформирован</th><th></th></tr></thead>
              <tbody>
                {data.reports.flatMap((r: any) => r.versions.map((v: any, i: number) => (
                  <tr key={v.id} style={i > 0 ? { color: "var(--muted)" } : undefined}>
                    <td>{i === 0 && <><strong>{fmtDate(r.period_start)}{r.period_end !== r.period_start && ` – ${fmtDate(r.period_end)}`}</strong>
                      <div className="small dim">{r.filename}</div></>}</td>
                    <td className="small">{i === 0 && KIND[r.kind]}</td>
                    <td>v{v.version}{i === 0 && r.versions.length > 1 && <span className="small dim"> (последняя)</span>}</td>
                    <td><Badge map={REPORT} value={v.status} />
                      {(v.details?.missing_screenshots?.length || v.details?.source_problems?.length || v.details?.undated_posts?.length || v.details?.error) ? (
                        <details>
                          <summary>Подробности</summary>
                          <ul>
                            {v.details.error && <li>Ошибка: {v.details.error}</li>}
                            {v.details.missing_screenshots?.map((m: any) => <li key={m.post_id}>Нет скриншота: <a href={m.url} target="_blank" rel="noreferrer">{m.url}</a> ({m.error ?? m.status})</li>)}
                            {v.details.undated_posts?.map((m: any) => <li key={m.id}>Не указана дата: <a href={m.url} target="_blank" rel="noreferrer">{m.url}</a></li>)}
                            {v.details.source_problems?.map((m: any, k: number) => <li key={k}>Источник {m.source ?? `#${m.source_id}`}: {m.detail}</li>)}
                          </ul>
                        </details>) : null}
                    </td>
                    <td className="num">{v.page_count ?? "—"}</td>
                    <td className="num">{v.posts_total}{v.posts_missing_screenshot > 0 && <span style={{ color: "var(--bad)" }}> ({v.posts_missing_screenshot} без скр.)</span>}</td>
                    <td className="small dim">{fmtDateTime(v.generated_at, r.timezone)}{v.delivered_at && <div>отправлен в Telegram {fmtDateTime(v.delivered_at, r.timezone)}</div>}
                      <Deliveries list={v.deliveries ?? []} tz={r.timezone} /></td>
                    <td><div className="actions">
                      {v.status !== "failed" && v.status !== "generating" && <DownloadButton path={`/report-versions/${v.id}/pdf`} name={r.filename} />}
                      {canOperate && v.status !== "failed" && v.status !== "generating" && <button className="small" onClick={async () => {
                        try { const x = await api(`/report-versions/${v.id}/send`, { method: "POST" });
                              setMsg(x.queued ? { tone: "ok", text: "PDF поставлен в очередь на отправку в Telegram." } : { tone: "info", text: "Отправка уже в очереди." }); }
                        catch (err) { setMsg({ tone: "bad", text: (err as Error).message.includes("TELEGRAM") ? "Telegram-бот не настроен (TELEGRAM_BOT_TOKEN)." : (err as Error).message }); }
                      }}>В Telegram</button>}
                      {i === 0 && canOperate && <button className="small" onClick={() => request(r.period_start, r.period_end)}>Сформировать заново</button>}
                    </div></td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
