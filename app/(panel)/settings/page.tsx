"use client";

import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/api";
import { ErrorNote, PageHeader } from "@/components/ui";
import { useCan } from "@/components/session";

type Msg = { tone: string; text: string } | null;

function Schedule({ canEdit }: { canEdit: boolean }) {
  const { data, reload } = useApi<any>("/settings");
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { if (data) setS(data.settings); }, [data]);
  if (!s) return null;
  const num = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/settings", { method: "PUT", json: s });
      setMsg({ tone: "ok", text: "Настройки сохранены." }); reload();
    } catch (err) { setMsg({ tone: "bad", text: (err as Error).message }); }
  }
  return (
    <>
      <form className="card" onSubmit={save}>
        <h2>Расписание</h2>
        {msg && <div className={`note ${msg.tone}`}>{msg.text}</div>}
        <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="form-row">
            <label>Проверка аккаунтов (раз в сутки)<input type="time" required value={s.monitoring_time}
              onChange={(e) => setS({ ...s, monitoring_time: e.target.value })} /></label>
            <label>Время ежедневного отчёта<input type="time" required value={s.daily_report_time}
              onChange={(e) => setS({ ...s, daily_report_time: e.target.value })} /></label>
            <label>Часовой пояс<input required value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })} /></label>
            <label>Ждать завершения проверки, мин<input type="number" min={0} max={1440} value={s.report_max_wait_minutes} onChange={num("report_max_wait_minutes")} /></label>
            <label>Догонять пропущенные дни<input type="number" min={0} max={31} value={s.report_catchup_days} onChange={num("report_catchup_days")} /></label>
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="checkbox"><input type="checkbox" checked={!!s.late_post_regenerate}
              onChange={(e) => setS({ ...s, late_post_regenerate: e.target.checked })} />Новая версия отчёта, если пост за отчитанный день нашёлся позже</label>
            <label>Задержка перед новой версией, мин<input type="number" min={0} max={720} value={s.late_post_regenerate_delay_minutes} onChange={num("late_post_regenerate_delay_minutes")} /></label>
            <label className="checkbox"><input type="checkbox" checked={!!s.notify_new_posts}
              onChange={(e) => setS({ ...s, notify_new_posts: e.target.checked })} />Отдельные уведомления о каждом найденном посте (кроме ежедневной сводки)</label>
          </div>
          <p className="small dim">Раз в сутки в указанное время все аккаунты проверяются одним циклом (один платный запуск Apify на аккаунт).
            Затем формируется PDF за предыдущие календарные сутки; если проверка ещё идёт, отчёт её дожидается. Пропущенные из-за простоя
            дни формируются после следующей проверки. Повторного цикла в тот же день не бывает, в том числе после перезапуска или смены часового пояса.</p>
          {canEdit && <button className="primary">Сохранить</button>}
        </fieldset>
      </form>
      <section className="card">
        <h2>Интеграции</h2>
        <table><tbody>
          <tr><td>Meta access token</td><td>{data.integrations.meta_access_token ? <span className="badge ok">Задан</span> : <span className="badge bad">Не задан</span>}</td></tr>
          <tr><td>Instagram business account id</td><td>{data.integrations.ig_business_account_id ? <span className="badge ok">Задан</span> : <span className="badge bad">Не задан</span>}</td></tr>
          <tr><td>Apify token (поиск постов)</td><td>{data.integrations.apify_token ? <span className="badge ok">Задан</span> : <span className="badge bad">Не задан</span>}</td></tr>
          <tr><td>Источник обнаружения по умолчанию</td><td><code>{data.integrations.discovery_provider}</code></td></tr>
          <tr><td>Telegram bot token</td><td>{data.integrations.telegram_bot_token ? <span className="badge ok">Задан</span> : <span className="badge bad">Не задан</span>}</td></tr>
          <tr><td>Хранилище файлов</td><td><code>{data.integrations.storage_backend}</code></td></tr>
        </tbody></table>
        <p className="small dim" style={{ marginBottom: 0 }}>Секреты задаются только переменными окружения сервера и в панели не отображаются.</p>
      </section>
    </>
  );
}

function Recipients() {
  const { data, reload } = useApi<any>("/telegram-recipients");
  const [form, setForm] = useState({ telegram_user_id: "", label: "" });
  const [msg, setMsg] = useState<Msg>(null);
  async function act(fn: () => Promise<any>, ok: string) {
    try { await fn(); setMsg({ tone: "ok", text: ok }); reload(); } catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); }
  }
  return (
    <section className="card">
      <h2>Telegram: разрешённые ID</h2>
      <p className="small dim">Бот отвечает и присылает уведомления и отчёты только этим пользователям.</p>
      {msg && <div className={`note ${msg.tone}`}>{msg.text}</div>}
      <table><tbody>
        {(data?.recipients ?? []).filter((r: any) => r.is_active).map((r: any) => (
          <tr key={r.id}><td><code>{r.telegram_user_id}</code></td><td>{r.label}</td>
            <td><button className="small danger" onClick={() => act(() => api(`/telegram-recipients/${r.id}`, { method: "DELETE" }), "Доступ отозван.")}>Отозвать</button></td></tr>
        ))}
      </tbody></table>
      <form className="form-row" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); act(() => api("/telegram-recipients", { method: "POST", json: { telegram_user_id: Number(form.telegram_user_id), label: form.label || null } }), "ID добавлен.").then(() => setForm({ telegram_user_id: "", label: "" })); }}>
        <label>Telegram user ID<input required inputMode="numeric" pattern="-?[0-9]+" value={form.telegram_user_id} onChange={(e) => setForm({ ...form, telegram_user_id: e.target.value })} /></label>
        <label className="wide">Комментарий<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
        <button>Добавить</button>
      </form>
    </section>
  );
}

function PanelPassword() {
  const { data: me } = useApi<any>("/auth/me");
  const [f, setF] = useState({ current_password: "", new_password: "", repeat: "" });
  const [msg, setMsg] = useState<Msg>(null);
  if (me?.password_source === "env") {
    return (
      <section className="card">
        <h2>Пароль панели</h2>
        <p className="small dim" style={{ margin: 0 }}>Пароль задан переменной окружения сервера
          (<code>SMM_PANEL_PASSWORD_HASH</code> / <code>SMM_PANEL_PASSWORD</code>) и меняется там.</p>
      </section>
    );
  }
  return (
    <form className="card" onSubmit={async (e) => {
      e.preventDefault();
      if (f.new_password !== f.repeat) { setMsg({ tone: "bad", text: "Пароли не совпадают." }); return; }
      try {
        await api("/auth/password", { method: "POST", json: { current_password: f.current_password, new_password: f.new_password } });
        setMsg({ tone: "ok", text: "Пароль изменён. Остальные открытые сессии завершены." });
        setF({ current_password: "", new_password: "", repeat: "" });
      } catch (err) { setMsg({ tone: "bad", text: (err as Error).message.includes("current") ? "Текущий пароль неверен." : (err as Error).message }); }
    }}>
      <h2>Пароль панели</h2>
      {msg && <div className={`note ${msg.tone}`}>{msg.text}</div>}
      <div className="form-row">
        <label>Текущий пароль<input type="password" required autoComplete="current-password" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} /></label>
        <label>Новый пароль<input type="password" required minLength={6} autoComplete="new-password" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} /></label>
        <label>Повторите<input type="password" required minLength={6} autoComplete="new-password" value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} /></label>
        <button>Сменить</button>
      </div>
    </form>
  );
}

export default function Settings() {
  const isAdmin = useCan("admin");
  return (
    <>
      <PageHeader title="Settings" subtitle="Расписание, интеграции, Telegram и пароль панели." />
      <Schedule canEdit={isAdmin} />
      {isAdmin && <Recipients />}
      <PanelPassword />
    </>
  );
}
