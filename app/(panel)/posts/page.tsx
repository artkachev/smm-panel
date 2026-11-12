"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, useApi } from "@/lib/api";
import { AuthImage, OpenFileLink } from "@/components/files";
import { PLATFORM, SHOT, fmtDateTime } from "@/lib/format";
import { Badge, Empty, ErrorNote, PageHeader } from "@/components/ui";
import { useCan } from "@/components/session";

const PAGE = 24;

function PostsInner() {
  const params = useSearchParams();
  const canOperate = useCan("operator");
  const [filters, setFilters] = useState({ source_id: "", status: params.get("status") ?? "", date_from: "", date_to: "", q: "" });
  const [offset, setOffset] = useState(0);
  const qs = new URLSearchParams(Object.entries({ ...filters, limit: String(PAGE), offset: String(offset) }).filter(([, v]) => v)).toString();
  const { data, error, reload } = useApi<any>(`/posts?${qs}`, 20000);
  const { data: src } = useApi<any>("/sources");
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);
  const [add, setAdd] = useState({ source_id: "", url: "", published_at: "" });
  const upload = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<number | null>(null);
  const [tz, setTz] = useState("Europe/Moscow");
  useEffect(() => { api("/settings").then((s) => setTz(s.settings.timezone)).catch(() => undefined); }, []);
  useEffect(() => setOffset(0), [filters]);

  async function act(fn: () => Promise<any>, ok: string) {
    try { await fn(); setMsg({ tone: "ok", text: ok }); reload(); }
    catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); }
  }
  function addPost(e: React.FormEvent) {
    e.preventDefault();
    act(() => api("/posts", { method: "POST", json: { source_id: Number(add.source_id), url: add.url, published_at: add.published_at || null } }),
      "Пост поставлен в очередь: ссылка будет разрешена, скриншот снят через официальный embed.")
      .then(() => setAdd({ ...add, url: "", published_at: "" }));
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || uploadFor == null) return;
    const fd = new FormData();
    fd.append("file", f);
    await act(() => api(`/posts/${uploadFor}/screenshot`, { method: "POST", body: fd }), "Скриншот заменён.");
    e.target.value = "";
  }

  const sources: any[] = src?.sources ?? [];
  const posts: any[] = data?.posts ?? [];
  return (
    <>
      <PageHeader title="Posts" subtitle={data ? `Найдено публикаций: ${data.total}` : "Загрузка…"} />
      <ErrorNote error={error} />
      {msg && <div className={`note ${msg.tone}`}>{msg.text}</div>}

      {canOperate && (
        <form className="card" onSubmit={addPost}>
          <h2>Добавить пост по ссылке</h2>
          <div className="form-row">
            <label>Аккаунт<select required value={add.source_id} onChange={(e) => setAdd({ ...add, source_id: e.target.value })}>
              <option value="">—</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{PLATFORM[s.platform]} · {s.display_name}</option>)}</select></label>
            <label className="wide">Ссылка на пост<input required placeholder="https://www.facebook.com/share/p/…" value={add.url}
              onChange={(e) => setAdd({ ...add, url: e.target.value })} /></label>
            <label>Дата и время публикации ({tz})<input type="datetime-local" value={add.published_at}
              onChange={(e) => setAdd({ ...add, published_at: e.target.value })} /></label>
            <button className="primary">Добавить</button>
          </div>
          <p className="small dim" style={{ marginBottom: 0 }}>Без даты пост не попадёт в отчёт, пока дату не укажут (embed не сообщает точное время публикации).</p>
        </form>
      )}

      <div className="card">
        <div className="form-row">
          <label>Аккаунт<select value={filters.source_id} onChange={(e) => setFilters({ ...filters, source_id: e.target.value })}>
            <option value="">Все</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select></label>
          <label>Скриншот<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Любой</option>{Object.entries(SHOT).map(([k, [v]]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>С даты<input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></label>
          <label>По дату<input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></label>
          <label className="wide">Поиск по ссылке или тексту<input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></label>
        </div>
      </div>

      <input ref={upload} type="file" accept="image/png,image/jpeg" hidden onChange={onFile} />
      {posts.length === 0 ? <Empty>Публикаций не найдено.</Empty> : (
        <div className="posts">
          {posts.map((p) => (
            <article key={p.id} className={`post ${p.is_excluded ? "excluded" : ""}`}>
              {p.width_px ? (
                <OpenFileLink className="thumb" path={`/posts/${p.id}/screenshot`}>
                  <AuthImage path={`/posts/${p.id}/screenshot?w=480`} alt={`Скриншот поста ${p.platform_post_id}`} />
                </OpenFileLink>
              ) : <div className="thumb none">Скриншота нет</div>}
              <div className="post-body">
                <div className="post-date">{p.published_at ? fmtDateTime(p.published_at, tz) : <span style={{ color: "var(--warn)" }}>Дата не указана</span>}</div>
                <div className="small dim">{PLATFORM[p.platform]} · {p.source_name}{p.is_excluded && " · исключён из отчётов"}</div>
                <a className="url" href={p.url} target="_blank" rel="noreferrer noopener">{p.url}</a>
                <div><Badge map={SHOT} value={p.screenshot_status} />
                  {p.width_px && <span className="small dim"> {p.width_px}×{p.height_px}</span>}</div>
                {p.screenshot_error && <div className="detail">{p.screenshot_error}</div>}
                <div className="small dim">Обнаружен {fmtDateTime(p.detected_at, tz)}{p.published_at_source && ` · дата: ${{ api: "API", manual: "вручную", embed: "embed", page: "страница" }[p.published_at_source as string]}`}</div>
              </div>
              {canOperate && (
                <div className="post-actions">
                  <button className="small" onClick={() => act(() => api(`/posts/${p.id}/recapture`, { method: "POST" }), "Повторный снимок поставлен в очередь.")}>Переснять</button>
                  <button className="small" onClick={() => { setUploadFor(p.id); upload.current?.click(); }}>Загрузить скриншот</button>
                  <button className="small" onClick={() => {
                    const v = prompt(`Дата и время публикации (${tz}), формат 2026-11-12T14:30`, p.published_at ? new Date(p.published_at).toLocaleString("sv-SE", { timeZone: tz }).slice(0, 16).replace(" ", "T") : "");
                    if (v) act(() => api(`/posts/${p.id}`, { method: "PATCH", json: { published_at: v } }), "Дата сохранена.");
                  }}>Дата</button>
                  <button className="small" onClick={() => act(() => api(`/posts/${p.id}`, { method: "PATCH", json: { is_excluded: !p.is_excluded } }),
                    p.is_excluded ? "Пост возвращён в отчёты." : "Пост исключён из отчётов.")}>{p.is_excluded ? "Вернуть" : "Исключить"}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {data && data.total > PAGE && (
        <div className="pager">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>← Назад</button>
          <span className="small dim">{offset + 1}–{Math.min(offset + PAGE, data.total)} из {data.total}</span>
          <button disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>Вперёд →</button>
        </div>
      )}
    </>
  );
}

export default function Posts() {
  return <Suspense><PostsInner /></Suspense>;
}
