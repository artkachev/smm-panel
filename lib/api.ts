"use client";

import { useCallback, useEffect, useState } from "react";

/** Backend origin (e.g. https://api.1-2-3-4.sslip.io). Empty = same origin (local dev through the Next.js proxy). */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
/** Sub-path the panel is served from (GitHub Pages project site: /<repo>). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const TOKEN_KEY = "smm_token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode: the session lives only in memory for this page */ }
}

/** In cross-origin mode the session is a Bearer token; without it there is nothing to ask the API. */
export function hasSession(): boolean {
  return !API_BASE || !!getToken();
}

export function goToLogin() {
  const here = window.location.pathname.slice(BASE_PATH.length) || "/";
  const next = here === "/" || here.startsWith("/login") ? "" : `?next=${encodeURIComponent(here + window.location.search)}`;
  window.location.href = `${BASE_PATH}/login/${next}`;
}

function csrf(): string {
  const m = document.cookie.match(/(?:^|;\s*)smm_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function request(path: string, init: RequestInit & { json?: unknown } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else if (!API_BASE && method !== "GET") headers.set("X-CSRF-Token", csrf());   // same-origin cookie session (local dev)
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      ...init, method, headers, body, cache: "no-store",
      credentials: API_BASE ? "omit" : "same-origin", referrerPolicy: "no-referrer",
    });
  } catch {
    throw new ApiError(0, "Сервер мониторинга недоступен. Проверьте подключение к интернету и повторите.");
  }
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    setToken(null);
    goToLogin();
    throw new ApiError(401, "not authenticated");
  }
  return res;
}

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const res = await request(path, init);
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) {
    const detail = data?.detail;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail ?? res.statusText));
  }
  return data as T;
}

/** Private files (screenshots, PDFs) are fetched with the session and shown via blob: URLs, never public links. */
export async function apiBlob(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const res = await request(path);
  if (!res.ok) throw new ApiError(res.status, res.statusText || "download failed");
  const cd = res.headers.get("content-disposition") ?? "";
  const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
  return { blob: await res.blob(), filename: m ? decodeURIComponent(m[1]) : null };
}

export async function download(path: string, fallbackName = "report.pdf") {
  const { blob, filename } = await apiBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Open a private file (e.g. full-size screenshot) in a new tab. */
export async function openFile(path: string) {
  const win = window.open("", "_blank");
  try {
    const { blob } = await apiBlob(path);
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url; else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (e) {
    win?.close();
    throw e;
  }
}

/** GET with loading/error state and a reload() for after mutations. */
export function useApi<T = any>(path: string | null, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      if ((e as ApiError).status !== 401) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setLoading(true);
    reload();
    if (!refreshMs) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") reload(); }, refreshMs);
    return () => clearInterval(t);
  }, [reload, refreshMs]);
  return { data, error, loading, reload };
}
