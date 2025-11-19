"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, UserRound } from "lucide-react";

import { FavoriteHospitalsProvider } from "./_providers/favorite-hospitals";
import { ScoutsProvider, useScouts } from "./_providers/scouts";
import StudentMobileTabBar from "./MobileTabBar";
import LogoutButton from "../components/LogoutButton";
import UserProfileProvider, { useUserProfile } from "../_providers/user-profile";

const navItems = [
  { href: "/student/dashboard", label: "ホーム" },
  { href: "/student/browse",   label: "病院を探す" },
  { href: "/student/saved",    label: "検討リスト" },
  { href: "/student/resume",   label: "レジュメを作る" },
  { href: "/student/applications", label: "応募履歴" },
  { href: "/student/scouts",   label: "スカウト" },
  { href: "/student/contact",  label: "お問い合わせ" },
  { href: "/student/account",  label: "アカウント" },
];

function BellWithBadge() {
  const { unreadCount } = useScouts();
  return (
    <Link
      href="/student/scouts"
      title="スカウト"
      className="relative p-2 rounded-full hover:bg-primary-50 transition"
    >
      <Bell className="w-5 h-5 text-primary-600" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </Link>
  );
}

function HeaderBrand() {
  // ロゴ + ユーザー表示名（小さめ）
  const { displayName, loading } = useUserProfile();

  return (
    <div className="flex items-center gap-3">
      <Link href="/student/dashboard" className="inline-flex items-center">
        <Image
          src="/brand/regimatch-logo.svg"
          alt="レジマッチ"
          width={112}
          height={40}
          priority={false}
          className="h-8 w-auto"
        />
      </Link>
      <Link
        href="/student/dashboard"
        className="text-sm md:text-base font-medium text-primary-700 hover:underline"
      >
        {loading ? "…" : displayName || "アカウント"}
      </Link>
    </div>
  );
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ScoutsProvider>
      <FavoriteHospitalsProvider>
        <UserProfileProvider>
          <div className="min-h-screen flex bg-background">
            {/* サイドバー（PC） */}
            <aside className="hidden md:flex flex-col w-64 border-r bg-white">
              <div className="px-6 py-4 border-b">
                <Link href="/student/dashboard" className="inline-flex items-center">
                  <Image
                    src="/brand/regimatch-logo.svg"
                    alt="レジマッチ"
                    width={128}
                    height={44}
                    priority={false}
                    className="h-9 w-auto"
                  />
                </Link>
              </div>
              <nav className="flex-1 p-2 space-y-1">
                {navItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-sm font-medium transition ${
                        active
                          ? "bg-primary-500 text-white"
                          : "text-text hover:bg-primary-50 hover:text-primary-700"
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
                <HeaderBrand />
                <div className="flex items-center gap-4">
                  <BellWithBadge />
                  <Link
                    href="/student/account"
                    title="アカウント"
                    className="p-2 rounded-full hover:bg-primary-50 transition"
                  >
                    <UserRound className="w-5 h-5 text-primary-600" />
                  </Link>
                  <LogoutButton className="text-sm text-gray-600 hover:underline" />
                </div>
              </header>

              {/* コンテンツ */}
              <main className="flex-1 px-4 md:px-8 py-6 md:pb-0 pb-24">
                {children}
              </main>

              {/* モバイルタブバー */}
              <StudentMobileTabBar />
            </div>
          </div>
        </UserProfileProvider>
      </FavoriteHospitalsProvider>
    </ScoutsProvider>
  );
}