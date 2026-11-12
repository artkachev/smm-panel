"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, goToLogin, hasSession, setToken, useApi } from "@/lib/api";
import { SessionContext, type Me } from "@/components/session";

const NAV = [
  { href: "/", label: "Dashboard", hint: "Состояние мониторинга" },
  { href: "/sources", label: "Sources", hint: "Аккаунты" },
  { href: "/posts", label: "Posts", hint: "Публикации и скриншоты" },
  { href: "/reports", label: "Reports", hint: "PDF-отчёты" },
  { href: "/notifications", label: "Notifications", hint: "Журнал событий" },
  { href: "/settings", label: "Settings", hint: "Расписание и доступы" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { if (hasSession()) setReady(true); else goToLogin(); }, []);
  if (!ready) return null;                  // static site: nothing is rendered before the session check
  return <Panel>{children}</Panel>;
}

function Panel({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data: me } = useApi<Me>("/auth/me");
  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    goToLogin();
  }
  return (
    <SessionContext.Provider value={me}>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark" aria-hidden>◎</span>
            <span>Post Monitoring</span>
          </div>
          <nav>
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} className={active ? "active" : ""}>
                  <span className="nav-label">{n.label}</span>
                  <span className="nav-hint">{n.hint}</span>
                </Link>
              );
            })}
          </nav>
          <div className="whoami">
            <button onClick={logout} style={{ width: "100%" }}>Выйти</button>
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
    </SessionContext.Provider>
  );
}
