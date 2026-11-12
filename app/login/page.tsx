"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setToken } from "@/lib/api";

function PasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ token?: string }>("/auth/login", { method: "POST", json: { password } });
      setToken(r.token ?? null);
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err) {
      const msg = (err as Error).message;
      const status = (err as { status?: number }).status;
      setError(msg.includes("too many") || msg.includes("temporarily")
        ? "Слишком много неудачных попыток. Повторите позже."
        : status === 0 || (status ?? 0) >= 500 ? "Сервер мониторинга недоступен. Повторите позже." : "Неверный пароль.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div className="brand"><span className="brand-mark" aria-hidden>◎</span><span>Post Monitoring</span></div>
      <label>Пароль
        <input type="password" autoComplete="current-password" autoFocus required value={password}
               onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <div className="note bad" role="alert">{error}</div>}
      <button className="primary" disabled={busy || !password}>{busy ? "Проверка…" : "Войти"}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <Suspense><PasswordForm /></Suspense>
    </div>
  );
}
