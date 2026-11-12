"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/api";
import { ACCESS, PLATFORM, relative } from "@/lib/format";
import { Badge, ErrorNote, PageHeader } from "@/components/ui";
import { useCan } from "@/components/session";

const KINDS: Record<string, string> = {
  page: "Страница Facebook", profile: "Личный профиль Facebook", business_account: "Instagram: бизнес-аккаунт",
  creator_account: "Instagram: аккаунт автора", personal_account: "Instagram: личный аккаунт", unknown: "Не знаю",
};

export default function Sources() {
  const { data, error, reload } = useApi<any>("/sources");
  const canOperate = useCan("operator");
  const [form, setForm] = useState({ url: "", display_name: "", short_name: "", kind: "unknown" });
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);

  async function act(fn: () => Promise<any>, ok: string) {
    try { await fn(); setMsg({ tone: "ok", text: ok }); reload(); }
    catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); }
  }
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    act(() => api("/sources", { method: "POST", json: { ...form, short_name: form.short_name || null } }),
        "Источник добавлен. Он будет проверен в ближайшем ежедневном цикле.")
      .then(() => setForm({ url: "", display_name: "", short_name: "", kind: "unknown" }));
  };

  const sources: any[] = data?.sources ?? [];
  return (
    <>
      <PageHeader title="Sources" subtitle="Отслеживаемые аккаунты. Все проверяются одним циклом раз в сутки; порядок внутри соцсети — порядок в PDF." />
      <ErrorNote error={error} />
      {msg && <div className={`note ${msg.tone}`}>{msg.text}</div>}

      {canOperate && (
        <form className="card" onSubmit={add}>
          <h2>Добавить аккаунт</h2>
          <div className="form-row">
            <label className="wide">Ссылка на профиль<input required placeholder="https://www.instagram.com/issf_official/"
              value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
            <label className="wide">Название (как в отчёте)<input required value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
            <label>Короткое имя для колонтитула<input placeholder="авто" value={form.short_name}
              onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></label>
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label>Тип аккаунта<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <button className="primary">Добавить</button>
          </div>
        </form>
      )}

      {["facebook", "instagram"].map((p) => {
        const list = sources.filter((s) => s.platform === p);
        if (!list.length) return null;
        return (
          <section className="card" key={p}>
            <h2>{PLATFORM[p]}</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Аккаунт</th><th>Способ получения</th><th>Статус</th>
                  <th>Проверен</th><th className="num">Постов</th><th></th></tr></thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} style={{ opacity: s.is_enabled ? 1 : 0.55 }}>
                      <td>
                        <div><strong>{s.display_name}</strong>{s.short_name && <span className="dim"> · {s.short_name}</span>}</div>
                        <a className="url" href={s.profile_url} target="_blank" rel="noreferrer noopener">{s.profile_url}</a>
                      </td>
                      <td className="small" title={data.adapters[s.adapter]}>{{
                        instagram_business_discovery: "Instagram Graph API", facebook_page_graph: "Facebook Graph API", manual: "Ручное добавление", apify: "Apify (сторонний провайдер)",
                      }[s.adapter as string] ?? s.adapter}</td>
                      <td><Badge map={ACCESS} value={s.access_status} />
                        {s.access_status !== "ok" && s.access_detail && <div className="detail">{s.access_detail}</div>}
                        {s.last_error && <div className="detail" style={{ color: "var(--bad)" }}>{s.last_error}</div>}</td>
                      <td className="small dim">{relative(s.last_checked_at)}</td>
                      <td className="num">{s.posts_count}</td>
                      <td>
                        {canOperate && <div className="actions">
                          {s.is_enabled && s.last_error && <button className="small"
                            title="Платный запуск Apify. Доступен, только если ежедневная проверка этого источника завершилась ошибкой."
                            onClick={() => confirm(`Повторить проверку «${s.display_name}»? Это платный запуск Apify.`) &&
                              act(() => api(`/sources/${s.id}/monitor`, { method: "POST" }), `Повторная проверка «${s.display_name}» поставлена в очередь.`)}>Повторить проверку</button>}
                          <button className="small" onClick={() => act(() => api(`/sources/${s.id}`, { method: "PATCH", json: { is_enabled: !s.is_enabled } }),
                            s.is_enabled ? "Мониторинг выключен." : "Мониторинг включён.")}>{s.is_enabled ? "Выключить" : "Включить"}</button>
                        </div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {data && (
        <section className="card">
          <h2>Ограничения способов получения</h2>
          <ul className="small dim" style={{ margin: 0, paddingLeft: 18 }}>
            {Object.entries(data.adapters as Record<string, string>).map(([k, v]) => <li key={k}><code>{k}</code>: {v}</li>)}
          </ul>
        </section>
      )}
    </>
  );
}
