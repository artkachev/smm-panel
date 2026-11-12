import type { NextConfig } from "next";

// Two build modes:
//  * STATIC_EXPORT=1 (GitHub Pages): plain static files; the browser calls the API at NEXT_PUBLIC_API_URL with a
//    Bearer token. NEXT_PUBLIC_BASE_PATH is the project sub-path ("/<repo>").
//  * default (local dev / Docker): Next.js server that proxies /api/* to the Python API on the same origin.
const STATIC = process.env.STATIC_EXPORT === "1";
const API_URL = process.env.SMM_API_URL ?? "http://127.0.0.1:8000";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = STATIC
  ? {
      output: "export",
      basePath: BASE_PATH || undefined,
      trailingSlash: true,                  // /login/ -> login/index.html on GitHub Pages
      images: { unoptimized: true },
      poweredByHeader: false,
    }
  : {
      output: "standalone",
      poweredByHeader: false,
      async rewrites() {
        return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
      },
      async headers() {
        return [{
          source: "/:path*",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Referrer-Policy", value: "same-origin" },
          ],
        }];
      },
    };

export default config;
