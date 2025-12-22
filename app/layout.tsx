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
    // OGP画像を用意できるなら推奨（public/ogp.png）
    // images: [{ url: "/ogp.png", width: 1200, height: 630, alt: "レジマッチ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "レジマッチ",
    description: "実質時給で選ぶ。次世代EBM型初期研修マッチング。",
    // images: ["/ogp.png"],
  },
};

// ★ 追加：スマホでPC幅が縮小表示されるのを防ぐ（最重要）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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