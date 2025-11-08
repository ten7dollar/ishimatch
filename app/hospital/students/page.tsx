// ★ サーバーコンポーネント（"use client" は書かない）
import StudentsClient from "./StudentsClient";

// ここで “動的CSR寄せ” を宣言（サーバー側にあるので安全）
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return <StudentsClient />;
}