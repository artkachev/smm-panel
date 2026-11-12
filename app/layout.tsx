import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Post Monitoring", robots: { index: false, follow: false } };

// Static hosting (GitHub Pages) cannot send headers, so the policy is a <meta> tag: scripts only from this site,
// network requests only to this site and the monitoring API, images from blob:/data: (private files).
const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const CSP = [
  "default-src 'self'",
  `connect-src 'self'${API ? ` ${API}` : ""}`,
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <meta name="referrer" content="no-referrer" />
      </head>
      <body>{children}</body>
    </html>
  );
}
