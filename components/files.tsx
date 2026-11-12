"use client";

import { useEffect, useRef, useState } from "react";
import { apiBlob, download, openFile } from "@/lib/api";

/** <img> for a private screenshot: loaded with the session when scrolled into view, shown via a blob: URL. */
export function AuthImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const el = ref.current;
    const load = () => apiBlob(path).then(({ blob }) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    }).catch(() => !cancelled && setFailed(true));
    let io: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io?.disconnect(); load(); }
      }, { rootMargin: "300px" });
      io.observe(el);
    } else {
      load();
    }
    return () => { cancelled = true; io?.disconnect(); if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (failed) return <span className="small dim">нет изображения</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src ?? "data:image/gif;base64,R0lGODlhAQABAAAAACw="} alt={alt} className={className} />;
}

export function DownloadButton({ path, name, label = "Скачать PDF", className = "small" }:
  { path: string; name?: string; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <button type="button" className={className} disabled={busy} title={err ?? undefined}
      onClick={async () => {
        setBusy(true); setErr(null);
        try { await download(path, name); } catch (e) { setErr((e as Error).message); alert("Не удалось скачать файл."); }
        finally { setBusy(false); }
      }}>{busy ? "Загрузка…" : label}</button>
  );
}

export function OpenFileLink({ path, children, className }: { path: string; children: React.ReactNode; className?: string }) {
  return (
    <a href="#" className={className} onClick={(e) => { e.preventDefault(); openFile(path).catch(() => alert("Не удалось открыть файл.")); }}>
      {children}
    </a>
  );
}
