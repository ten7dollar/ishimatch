// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "レジマッチ",
  description: "実質時給で選ぶ。次世代EBM型初期研修マッチング。",
  metadataBase: new URL("https://www.resi-match.com"),

  openGraph: {
    title: "レジマッチ",
    description: "実質時給で選ぶ。次世代EBM型初期研修マッチング。",
    url: "https://www.resi-match.com/lp1",
    siteName: "レジマッチ",
    type: "website",
    // images: [{ url: "/ogp.png", width: 1200, height: 630, alt: "レジマッチ" }],
  },

  twitter: {
    card: "summary_large_image",
    title: "レジマッチ",
    description: "実質時給で選ぶ。次世代EBM型初期研修マッチング。",
    // images: ["/ogp.png"],
  },

  // ★ PWA / iOSホーム追加アイコン
  // iOSは apple-touch-icon を優先することが多い
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  // ★ iOSで「ホーム画面に追加」したときの挙動を少し整える
  appleWebApp: {
    title: "レジマッチ",
    capable: true,
    statusBarStyle: "default",
  },

  // ★ manifest の参照（app/manifest.ts がある前提）
  manifest: "/manifest.webmanifest",
};

// ★ 追加：スマホでPC幅が縮小表示されるのを防ぐ（最重要）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b5bd3", // manifest の theme_color と合わせると見た目が安定
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}