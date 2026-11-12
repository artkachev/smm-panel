"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/api";
import { ACCESS, JOB_KIND, PLATFORM, REPORT, SHOT, fmtDate, fmtDateTime, relative } from "@/lib/format";
import { Badge, ErrorNote, PageHeader, Stat } from "@/components/ui";
import { DownloadButton } from "@/components/files";
import { useCan } from "@/components/session";

const CYCLE: Record<string, [string, string]> = {
  running: ["Идёт", "info"], succeeded: ["Успешно", "ok"], partial: ["Частично", "warn"], failed: ["Ошибка", "bad"], skipped: ["Пропущена", "muted"],
};

export default function Dashboard() {
  const { data, error, reload } = useApi<any>("/dashboard", 15000);
  const canOperate = useCan("operator");
  const [msg, setMsg] = useState<string | null>(null);

  async function yesterday() {
    const d = data?.next_daily_report?.for_day;
    const day = new Date(Date.parse(d) - 86400000).toISOString().slice(0, 10);
    await api("/reports", { method: "POST", json: { start: day, end: day } });
    setMsg(`Отчёт за ${fmtDate(day)} поставлен в очередь.`);
  }

  const sources: any[] = data?.sources ?? [];
  const cycles: any[] = data?.cycles ?? [];
  const lastCost = cycles.find((c) => c.apify_cost != null)?.apify_cost != null ? Number(cycles.find((c) => c.apify_cost != null).apify_cost) : null;
  const by = (s: string) => sources.filter((x) => x.is_enabled && x.access_status === s).length;
  const shotProblems = (data?.screenshot_problems ?? []).reduce((a: number, r: any) => a + (r.status === "pending" ? 0 : r.n), 0);
  const queued = (data?.jobs ?? []).filter((j: any) => j.status !== "dead").reduce((a: number, j: any) => a + j.n, 0);
  const dead = (data?.jobs ?? []).filter((j: any) => j.status === "dead").reduce((a: number, j: any) => a + j.n, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={data ? <>Проверка аккаунтов раз в сутки в {data.schedule.monitoring_time}, отчёт в {data.schedule.report_time} ({data.timezone}) ·
          следующая проверка {fmtDateTime(data.schedule.next_cycle, data.timezone)} · следующий отчёт за {fmtDate(data.next_daily_report.for_day)}</> : "Загрузка…"}
        actions={canOperate && <button className="primary" onClick={yesterday}>Отчёт за вчера</button>}
      />
      <ErrorNote error={error} />
      {data && !(data.services ?? []).some((x: any) => x.name.startsWith("worker:") && x.alive) && (
        <div className="note bad" role="alert">
          Фоновый обработчик не отвечает{(data.services ?? []).length ? ` (последний сигнал ${relative(data.services[0].last_seen)})` : ""}:
          мониторинг, скриншоты и отчёты не выполняются. Проверьте сервис <code>worker</code>.
        </div>
      )}
      {data && (data.services ?? []).some((x: any) => x.alive && !x.details?.telegram) && (
        <div className="note warn">Telegram-бот не настроен (TELEGRAM_BOT_TOKEN): уведомления и PDF не отправляются.</div>
      )}
      {msg && <div className="note info">{msg}</div>}
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Stat label="Источники работают" value={`${by("ok")} / ${sources.filter((s) => s.is_enabled).length}`}
              hint={`${by("unavailable")} недоступны · ${by("limited")} ручной ввод`} tone={by("unavailable") ? "warn" : ""} />
        <Stat label="Расходы Apify в этом месяце"
              value={data?.apify?.usage_usd != null ? `$${Number(data.apify.usage_usd).toFixed(2)}` : "—"}
              hint={data?.apify ? `лимит $${Number(data.apify.budget_usd).toFixed(2)}${data.apify.plan_limit_usd != null ? ` · тариф $${Number(data.apify.plan_limit_usd).toFixed(2)}` : ""}${lastCost != null ? ` · последний цикл $${lastCost.toFixed(3)}` : ""}` : undefined}
              tone={data?.apify?.usage_usd != null && data.apify.usage_usd >= data.apify.budget_usd * 0.9 ? "bad" : ""} />
        <Stat label="Проблемы со скриншотами" value={shotProblems} tone={shotProblems ? "bad" : ""}
              hint={<Link href="/posts?status=failed">Открыть</Link>} />
        <Stat label="Задачи в очереди" value={queued} tone={dead ? "bad" : ""} hint={dead ? `${dead} не выполнены после всех повторов` : "без ошибок"} />
      </div>

      <div className="grid cols-2">
        <section className="card">
          <h2>Источники <Link className="small" href="/sources">Все →</Link></h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Аккаунт</th><th>Статус</th><th>Проверен</th></tr></thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div>{s.display_name}</div>
                      <div className="small dim">{PLATFORM[s.platform]}{!s.is_enabled && " · выключен"}</div>
                    </td>
                    <td>
                      <Badge map={ACCESS} value={s.access_status} />
                      {(s.last_error || (s.access_status !== "ok" && s.access_detail)) &&
                        <div className="detail">{s.last_error || s.access_detail}</div>}
                    </td>
                    <td className="small dim">{relative(s.last_checked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div>
          <section className="card">
            <h2>Последние отчёты <Link className="small" href="/reports">Все →</Link></h2>
            {(data?.latest_reports ?? []).length === 0 ? <div className="dim">Отчётов пока нет.</div> : (
              <table>
                <thead><tr><th>Период</th><th>Статус</th><th className="num">Постов</th><th></th></tr></thead>
                <tbody>
                  {data.latest_reports.map((r: any) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.period_start)}{r.period_end !== r.period_start && ` – ${fmtDate(r.period_end)}`} <span className="small dim">v{r.version}</span></td>
                      <td><Badge map={REPORT} value={r.status} />{r.posts_missing_screenshot > 0 && <div className="detail">без скриншота: {r.posts_missing_screenshot}</div>}</td>
                      <td className="num">{r.posts_total}</td>
                      <td>{r.status !== "failed" && r.status !== "generating" && <DownloadButton path={`/report-versions/${r.id}/pdf`} label="PDF" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="card">
            <h2>Ежедневные проверки</h2>
            {cycles.length === 0 ? <div className="dim">Проверок ещё не было.</div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Дата</th><th>Статус</th><th className="num">Источники</th><th className="num">Новых</th><th className="num">Apify</th></tr></thead>
                  <tbody>
                    {cycles.slice(0, 7).map((c) => (
                      <tr key={c.id}>
                        <td>{fmtDate(c.cycle_date)} <span className="small dim">{fmtDateTime(c.started_at, data.timezone).slice(-5)}{c.trigger !== "schedule" && " · после простоя"}</span></td>
                        <td><Badge map={CYCLE} value={c.status} /></td>
                        <td className="num">{c.sources_ok}/{c.sources_total}{c.sources_failed > 0 && <span style={{ color: "var(--bad)" }}> ({c.sources_failed} ошибка)</span>}</td>
                        <td className="num">{c.posts_new}</td>
                        <td className="num small">{c.apify_cost != null ? `$${Number(c.apify_cost).toFixed(3)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="card">
            <h2>Очередь задач</h2>
            {(data?.jobs ?? []).length === 0 ? <div className="dim">Очередь пуста.</div> : (
              <table>
                <tbody>
                  {data.jobs.map((j: any) => (
                    <tr key={j.kind + j.status}><td>{JOB_KIND[j.kind] ?? j.kind}</td>
                      <td><Badge map={{ queued: ["В очереди", "muted"], running: ["Выполняется", "info"], dead: ["Не выполнено", "bad"] }} value={j.status} /></td>
                      <td className="num">{j.n}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {(data?.recent_failures ?? []).map((f: any) => (
              <div key={f.id} className="note bad small">{JOB_KIND[f.kind] ?? f.kind} #{f.id}: {f.last_error}</div>
            ))}
          </section>
          {(data?.screenshot_problems ?? []).length > 0 && (
            <section className="card">
              <h2>Скриншоты</h2>
              {data.screenshot_problems.map((p: any) => (
                <div key={p.status}><Link href={`/posts?status=${p.status}`}><Badge map={SHOT} value={p.status} /></Link> {p.n}</div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
