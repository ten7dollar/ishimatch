"use client";

import Image from "next/image";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white shadow-card rounded-xl p-8">
        {/* ブランド（ログインと統一） */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/brand/regimatch-logo.svg"
            alt="レジマッチ"
            height={44}
            width={123}
            priority
          />
          <p className="text-text-muted text-sm mt-2">初期研修医マッチングプラットフォーム</p>
        </div>

        <h2 className="text-lg font-semibold mb-3 text-primary-700 text-center">
          現在、新規登録はクローズドβのため停止中です
        </h2>
        <p className="text-sm text-text-muted text-center mb-6">
          すでに発行済みのアカウントをお持ちの方は、ログイン画面からそのままご利用いただけます。
        </p>

        <div className="flex flex-col gap-3">
          <a href="/login" className="btn-primary w-full text-center">
            ログイン画面へ
          </a>
          <p className="text-xs text-center text-text-muted">
            新規登録の再開については、運営からのご案内をお待ちください。
          </p>
        </div>
      </div>
    </main>
  );
}