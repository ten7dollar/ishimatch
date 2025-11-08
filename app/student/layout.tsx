"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, UserRound } from "lucide-react";

import { FavoriteHospitalsProvider } from "./_providers/favorite-hospitals";
import { ScoutsProvider, useScouts } from "./_providers/scouts";
import StudentMobileTabBar from "./MobileTabBar"; // ★ 追加

const navItems = [
  { href: "/student/dashboard", label: "ホーム" },
  { href: "/student/browse", label: "病院を探す" },
  { href: "/student/saved", label: "検討リスト" },
  { href: "/student/resume", label: "レジュメを作る" },
  { href: "/student/applications", label: "応募履歴" },
  { href: "/student/scouts", label: "スカウト" },
  { href: "/student/contact", label: "お問い合わせ" },
  { href: "/student/account", label: "アカウント" },
];

function BellWithBadge() {
  const { unreadCount } = useScouts();
  return (
    <Link href="/student/scouts" title="スカウト" className="relative p-2 rounded-full hover:bg-primary-50 transition">
      <Bell className="w-5 h-5 text-primary-600" />
      {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
    </Link>
  );
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ScoutsProvider>
      <FavoriteHospitalsProvider>
        <div className="min-h-screen flex bg-background">
          {/* サイドバー（PC） */}
          <aside className="hidden md:flex flex-col w-64 border-r bg-white">
            <div className="px-6 py-4 border-b">
              <h1 className="font-bold text-lg text-primary-700">医志MATCH student</h1>
            </div>
            <nav className="flex-1 p-2 space-y-1">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition ${
                      active ? "bg-primary-500 text-white" : "text-text hover:bg-primary-50 hover:text-primary-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* メイン */}
          <div className="flex-1 flex flex-col">
            {/* ヘッダー */}
            <header className="w-full bg-white border-b flex items-center justify-between px-4 md:px-8 py-3">
              <div className="flex items-center gap-2">
                <Link href="/student/dashboard" className="text-lg font-semibold text-primary-700 hover:underline">
                医学 太郎
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <BellWithBadge />
                <Link href="/student/account" title="アカウント" className="p-2 rounded-full hover:bg-primary-50 transition">
                  <UserRound className="w-5 h-5 text-primary-600" />
                </Link>
                <button
                  onClick={async () => {
                    await fetch("/api/session", { method: "DELETE" });
                    location.href = "/"; // middleware経由で /login に誘導
                  }}
                  className="text-sm text-gray-600 hover:underline"
                >
                  ログアウト
                </button>
              </div>
            </header>

            {/* コンテンツ（モバイルのみ下余白） */}
            <main className="flex-1 px-4 md:px-8 py-6 md:pb-0 pb-24">{children}</main>
            {/* モバイルタブバー */}
            <StudentMobileTabBar />
          </div>
        </div>
      </FavoriteHospitalsProvider>
    </ScoutsProvider>
  );
}