// ★ サーバーコンポーネント（"use client" は書かない）
import ApplyClient from "./ApplyClient";

// ここなら dynamic/revalidate を export しても安全（サーバー側）
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return <ApplyClient />;
}