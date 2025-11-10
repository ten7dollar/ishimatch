// next.config.ts
import type { NextConfig } from "next";

const nextConfig = {
  // 任意（残してもOK）
  reactStrictMode: true,

  // API レスポンスは全て no-cache（ブラウザ/中間CDN）
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma",        value: "no-cache" },
          { key: "Expires",       value: "0" },
          // CDN（Surrogate）レイヤにも確実に無効化を伝える
          { key: "Surrogate-Control", value: "no-store" },
        ],
      },
    ];
  },
} satisfies NextConfig;

export default nextConfig;