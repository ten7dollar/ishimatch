import Image from "next/image";
import Link from "next/link";
import { BgSection } from "./_components/BgSection";
import { ScreenCarousel } from "./_components/ScreenCarousel";

const IMG = {
  hero: { pc: "/lp1/hero_pc.jpg", sp: "/lp1/hero_sp.jpg" },
  worry: { pc: "/lp1/worry_pc.jpg", sp: "/lp1/worry_sp.jpg" },
};

const ICON = {
  compare: "/lp1/icons/compare.png",
  ai: "/lp1/icons/ai.png",
  scout: "/lp1/icons/scout.png",
};

// ⑤の横スクロール：あなたの「実ファイル名」に合わせてここだけ編集
// ※ 0枚でもビルドは通る（その場合カルーセルは表示されません）
const CAROUSEL_IMAGES: string[] = [
  // 例:
  // "/lp1/screens/1.png",
  // "/lp1/screens/2.png",
  // "/lp1/screens/3.png",
];

export default function Lp1Page() {
  return (
    <main className="bg-white text-slate-900">
      {/* =====================
          ① Hero（背景画像＋右側テキスト）
         ===================== */}
      <section className="relative">
        <div className="relative h-[320px] w-full md:h-[420px]">
          {/* SP */}
          <Image
            src={IMG.hero.sp}
            alt="Hero"
            fill
            priority
            className="object-cover md:hidden"
          />
          {/* PC */}
          <Image
            src={IMG.hero.pc}
            alt="Hero"
            fill
            priority
            className="hidden object-cover md:block"
          />

          {/* テキストオーバーレイ */}
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-6xl items-center px-4">
              <div className="ml-auto max-w-xl">
                <h1 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-4xl">
                  実質時給で選ぶ。
                  <br />
                  次世代EBM型初期研修
                  <br />
                  マッチング。
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">
                  給与・当直・教育体制などの公開情報を整理し、比較から検討までを一気通貫で。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================
          ② CTA（白帯）
         ===================== */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <h2 className="text-xl font-bold md:text-2xl">
            あなたに合う研修病院を見つけよう
          </h2>
          <p className="mt-2 text-sm text-slate-600">完全無料・最短3分で完了します</p>

          <div className="mt-6 flex justify-center">
            <Link
              href="/student/onboarding?from=lp1"
              className="rounded-xl bg-orange-500 px-8 py-4 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              無料で診断する →
            </Link>
          </div>
        </div>
      </section>

      {/* =====================
          ③ お悩み（背景画像＋文字）
         ===================== */}
      <BgSection
        id="worry"
        pcSrc={IMG.worry.pc}
        spSrc={IMG.worry.sp}
        alt="Worry"
        minHeightClassName="min-h-[520px]"
        overlayClassName="bg-black/55"
      >
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h3 className="text-2xl font-extrabold leading-snug text-white md:text-3xl">
              病院によって待遇・働き方の
              <br />
              記載方法がまちまち。
              <br />
              実際の働き方がイメージできない。
              <br />
              こんなお悩みありませんか？
            </h3>

            <ul className="mt-6 space-y-3 text-sm text-white/85 md:text-base">
              <li>・面談が多いけど当直回数や実態が多い</li>
              <li>・当直料が安いのに回数が多い</li>
              <li>・詳しいOBに面談してメロついてしまわない</li>
            </ul>

            <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm text-white/85 backdrop-blur">
              <span className="font-semibold">待遇と働き方</span>
              を探して選びたいのに、あまりに
              <span className="font-semibold">時間と手間がかかりすぎる</span>。
              結果、受験で選んだ研修病院に配属され、
              <span className="font-semibold">理想のキャリアが得られない</span> なんてことも。
            </div>
          </div>

          <div className="hidden md:block" />
        </div>
      </BgSection>

      {/* =====================
          ④ 解決 ＋ ⑤ 実際の画面（横スクロール）
         ===================== */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-center text-sm font-semibold text-slate-600">
            Resimatchなら、検索・応募・スカウトまで
            <span className="text-blue-600"> 全てワンストップ</span>で完結。
          </p>
          <h2 className="mt-4 text-center text-3xl font-extrabold text-blue-700">
            Resimatchなら
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "病院一括比較機能",
                desc: "情報を同じフォーマットで整理。比較がラク。",
                icon: ICON.compare,
              },
              {
                title: "AIレジュメ生成",
                desc: "1クリックで応募に必要な情報を整える。",
                icon: ICON.ai,
              },
              {
                title: "ダイレクトスカウト",
                desc: "あなたに合う研修病院から声が届く。",
                icon: ICON.scout,
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                    <Image src={c.icon} alt="" fill className="object-contain p-2" />
                  </div>
                  <h3 className="font-bold">{c.title}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* ⑤ 実際の画面（横スクロール） */}
          {CAROUSEL_IMAGES.length > 0 ? (
            <div className="mt-14">
              <p className="text-center text-sm font-semibold text-slate-700">実際の画面</p>
              <p className="mt-2 text-center text-xs text-slate-500">
                ※年収・働き方など比較
              </p>

              <div className="mt-6">
                <ScreenCarousel images={CAROUSEL_IMAGES} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* =====================
          ⑥ Before→After ＋ ⑦ クロージング
         ===================== */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-3xl bg-slate-50 p-6 md:p-10">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-bold text-slate-700">行けても月10件訪問</p>
                <p className="mt-3 text-sm text-slate-600">
                  面談調整やアポ取りの時点で大変。病院をしっかり比較する前に時間切れ…。
                </p>
              </div>

              <div className="relative">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-bold text-blue-700">1〜2時間で比較</p>
                  <p className="mt-2 text-sm text-slate-600">
                    多角的に比較し、志望度や条件の優先順位が明確に。
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-xl bg-slate-100" />
                    <div className="h-16 rounded-xl bg-slate-100" />
                    <div className="h-16 rounded-xl bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* ⑦ クロージング */}
            <div className="mt-10 rounded-3xl bg-white p-6 md:p-10">
              <div className="grid gap-6 md:grid-cols-2 md:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    学生最後の一年、今すぐ理想の研修先のために行動したい。
                  </p>
                  <h3 className="mt-3 text-2xl font-extrabold">
                    Resimatchで頑張らずに
                    <br />
                    キャリア・遊び・勉強を掴り取る。
                  </h3>
                  <p className="mt-3 text-sm text-slate-600">
                    次世代EBM型初期研修マッチング
                  </p>
                </div>

                <div className="flex justify-start md:justify-end">
                  <Link
                    href="/student/onboarding?from=lp1"
                    className="rounded-xl bg-orange-500 px-8 py-4 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    無料で診断する →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================
          ⑧ QA ＋ ⑨ Final CTA
         ===================== */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white">
            よくある質問
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              {
                q: "研修病院はどこから探す？",
                a: "公開情報・公式情報を整備し、同じフォーマットで比較できます。",
              },
              {
                q: "このマッチングで病院に迷惑は？",
                a: "公開範囲の情報を元に、学生側の比較検討を支援します。",
              },
              {
                q: "病院選びを早くした方が良い？",
                a: "早めに軸を固めると、見学や準備を余裕を持って進められます。",
              },
              {
                q: "スカウトが来る仕組みは？",
                a: "希望条件などをもとに、合う研修病院から声が届きます。",
              },
            ].map((x, i) => (
              <div key={x.q} className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">Q{i + 1}.</p>
                <h3 className="mt-2 text-sm font-bold">{x.q}</h3>
                <p className="mt-3 text-sm text-slate-600">{x.a}</p>
              </div>
            ))}
          </div>

          {/* ⑨ Final CTA */}
          <div className="mt-10 text-center">
            <h2 className="text-2xl font-extrabold">理想の研修病院を見つけよう</h2>
            <p className="mt-2 text-sm text-slate-600">
              スカウト×レジュメ×比較で、あなたに合う研修先に最短で辿り着く
            </p>

            <div className="mt-6 flex justify-center">
              <Link
                href="/student/onboarding?from=lp1"
                className="rounded-xl bg-orange-500 px-8 py-4 text-sm font-semibold text-white hover:bg-orange-600"
              >
                無料で診断する →
              </Link>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              ※情報は公開情報・公式情報を元に整備しています
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}