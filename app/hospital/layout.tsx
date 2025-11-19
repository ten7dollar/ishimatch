"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { ScoutsOutboxProvider } from "./_providers/scout-outbox";
import { FavoriteStudentsProvider } from "./_providers/favorite-students";
import HospitalMobileTabBar from "./MobileTabBar";
import LogoutButton from "../components/LogoutButton";
import UserProfileProvider, { useUserProfile } from "../_providers/user-profile";

const navItems = [
  { href: "/hospital/dashboard",    label: "ホーム" },
  { href: "/hospital/students",     label: "学生検索" },
  { href: "/hospital/applications", label: "応募管理" },
  { href: "/hospital/scouts",       label: "スカウトステータス" },
  { href: "/hospital/pr",           label: "PRページ編集" },
  { href: "/hospital/account",      label: "アカウント管理" },
];

function HospitalHeaderName() {
  const { displayName, loading } = useUserProfile();
  return (
    <Link
      href="/hospital/dashboard"
      className="text-lg font-semibold text-primary-700 hover:underline"
    >
      {loading ? "…" : displayName || "アカウント"}
    </Link>
  );
}

export default function HospitalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ScoutsOutboxProvider>
      <FavoriteStudentsProvider>
        <UserProfileProvider>
          <div className="min-h-screen flex bg-background">
            {/* サイドバー */}
            <aside className="hidden md:flex flex-col w-64 border-r bg-white">
              <div className="px-6 py-4 border-b">
                <Link href="/hospital/dashboard" className="inline-flex items-center">
                  {/* ★ ロゴサイズは h-12 を基準に調整（h-14 / h-16 など） */}
                  <Image
                    src="/brand/regimatch-logo.svg"
                    alt="レジマッチ"
                    width={160}
                    height={52}
                    priority={false}
                    className="h-16 w-auto"
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
              <header className="w-full bg-white border-b flex justify-between items-center px-8 py-3">
                {/* ヘッダーは名前のみ（ロゴなし） */}
                <HospitalHeaderName />

                <div className="flex items-center gap-6">
                  {/* ステータス（装飾） */}
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-text-muted">公開中</span>
                  </div>

                  {/* 通知 → 応募管理へ */}
                  <Link
                    href="/hospital/applications"
                    title="応募管理へ"
                    className="relative p-2 rounded-full hover:bg-primary-50 transition"
                  >
                    <Bell className="w-5 h-5 text-primary-600" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  </Link>

                  {/* アカウント */}
                  <Link
                    href="/hospital/account"
                    className="text-primary-600 hover:underline text-sm font-medium"
                  >
                    マイアカウント
                  </Link>

                  {/* ログアウト */}
                  <LogoutButton className="text-sm text-gray-600 hover:underline" />
                </div>
              </header>

              {/* コンテンツ */}
              <main className="flex-1 p-8 md:pb-0 pb-24">{children}</main>
              <HospitalMobileTabBar />
            </div>
          </div>
        </UserProfileProvider>
      </FavoriteStudentsProvider>
    </ScoutsOutboxProvider>
  );
}