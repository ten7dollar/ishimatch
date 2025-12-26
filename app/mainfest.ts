// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "レジマッチ",
    short_name: "レジマッチ",
    description: "実質時給で選ぶ。次世代EBM型初期研修マッチング。",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b5bd3",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}