"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, FileText, Bell } from "lucide-react";

const items = [
  { href: "/student/dashboard", label: "ホーム", icon: Home },
  { href: "/student/browse", label: "探す", icon: Search },
  { href: "/student/saved", label: "検討", icon: Heart },
  { href: "/student/applications", label: "応募", icon: FileText },
  { href: "/student/scouts", label: "スカウト", icon: Bell },
];

export default function StudentMobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5"
                aria-label={label}
              >
                <Icon className={`w-5 h-5 ${active ? "text-primary-600" : "text-gray-500"}`} />
                <span className={`text-[10px] ${active ? "text-primary-700" : "text-gray-500"}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}