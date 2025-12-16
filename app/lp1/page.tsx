import Link from "next/link";
import { BgSection } from "./_components/BgSection";
import { ScreenCarousel } from "./_components/ScreenCarousel";

const IMG = {
  hero: { pc: "/lp1/hero_pc.jpg", sp: "/lp1/hero_sp.jpg" },
  worry: { pc: "/lp1/worry_pc.jpg", sp: "/lp1/worry_sp.jpg" },
  solve: { pc: "/lp1/solve_pc.jpg", sp: "/lp1/solve_sp.jpg" },
  screen: { pc: "/lp1/screen_pc.jpg", sp: "/lp1/screen_sp.jpg" },
  beforeAfter: { pc: "/lp1/beforeafter_pc.jpg", sp: "/lp1/beforeafter_sp.jpg" },
  closing: { pc: "/lp1/closing_pc.jpg", sp: "/lp1/closing_sp.jpg" },
  finalCta: { pc: "/lp1/finalcta_pc.jpg", sp: "/lp1/finalcta_sp.jpg" },
};

// ⑤「追加のプロダクトスクショ」用（いまは空でOK）
// 例：public/lp1/product/1.png を置いたら "/lp1/product/1.png"
const PRODUCT_SCREENSHOTS: string[] = [];

export default function Lp1Page() {
  return (
    <main className="bg-white text-slate-900">
      {/* =====================
          ① Hero（背景画像＋文字）
         ===================== */}
      <BgSection
        id="hero"
        pcSrc={IMG.hero.pc}
        spSrc={IMG.hero.sp}
        alt="Hero"
        minHeightClassName="min-h-[78vh]"
        overlayClassName="bg-black/10"
        contentClassName="py-16 md:py-24"
      >
        <div className="flex justify-end">
          {/* 右寄せカード：文字ズレしにくい */}
          <div className="w-full max-w-xl rounded-2xl bg-white/80 p-5 backdrop-blur md:bg-white/0 md:p-0 md:backdrop-blur-0">
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

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/student/onboarding?from=lp1"
                className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                無料で診断する →
              </Link>
              <Link
                href="#worry"
                className="rounded-xl border border-slate-900/15 bg-white/50 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-white"
              >
                悩みを見る
              </Link>
            </div>
          </div>
        </div>
      </BgSection>

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
        minHeightClassName="min-h-[70vh]"
        overlayClassName="bg-black/55"
      >
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h3 className="text-2xl font-extrabold leading-snug text-white md:text-3xl">
              病院によって待遇・働き方の記載方法がまちまち。
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
              結果、理想のキャリアが得られないなんてことも。
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
      </BgSection>

      {/* =====================
          ④ 解決（背景画像＋文字）
         ===================== */}
      <BgSection
        id="solve"
        pcSrc={IMG.solve.pc}
        spSrc={IMG.solve.sp}
        alt="Solve"
        minHeightClassName="min-h-[70vh]"
        overlayClassName="bg-black/15"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-white/85">
            Resimatchなら、検索・応募・スカウトまで
            <span className="text-white"> ワンストップ</span>で完結。
          </p>
          <h2 className="mt-4 text-3xl font-extrabold text-white md:text-4xl">
            Resimatchなら
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { t: "病院一括比較", d: "情報を同じフォーマットで整理" },
              { t: "AIレジュメ生成", d: "応募準備を一気に短縮" },
              { t: "ダイレクトスカウト", d: "合う研修先から声が届く" },
            ].map((x) => (
              <div
                key={x.t}
                className="rounded-2xl border border-white/20 bg-white/10 p-5 text-left text-white backdrop-blur"
              >
                <h3 className="font-bold">{x.t}</h3>
                <p className="mt-2 text-sm text-white/85">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </BgSection>

      {/* =====================
          ⑤ 実際の画面（背景画像＋文字 ＋ スクショ横スクロール）
         ===================== */}
      <BgSection
        id="screen"
        pcSrc={IMG.screen.pc}
        spSrc={IMG.screen.sp}
        alt="Screen"
        minHeightClassName="min-h-[75vh]"
        overlayClassName="bg-black/25"
      >
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-white md:text-3xl">
              実際の画面で、迷いを減らす
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/85 md:text-base">
              必要な情報を同じ見方で比較して、次の行動までスムーズに。
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/85">
              <li>✓ 年収・当直などの比較</li>
              <li>✓ 気になる病院を保存</li>
              <li>✓ 次にやることが明確</li>
            </ul>
          </div>

          {/* 追加スクショ（あれば横スクロール表示） */}
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            {PRODUCT_SCREENSHOTS.length > 0 ? (
              <ScreenCarousel images={PRODUCT_SCREENSHOTS} />
            ) : (
              <div className="rounded-xl bg-white/10 p-6 text-sm text-white/80">
                プロダクトスクショを追加すると、ここに横スクロールで表示されます。
                <div className="mt-2 text-xs text-white/60">
                  例：public/lp1/product/1.png → &quot;/lp1/product/1.png&quot;
                </div>
              </div>
            )}
          </div>
        </div>
      </BgSection>

      {/* =====================
          ⑥ Before→After（背景画像＋文字）
         ===================== */}
      <BgSection
        id="beforeafter"
        pcSrc={IMG.beforeAfter.pc}
        spSrc={IMG.beforeAfter.sp}
        alt="Before After"
        minHeightClassName="min-h-[70vh]"
        overlayClassName="bg-black/10"
      >
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="rounded-2xl bg-white/80 p-5 backdrop-blur md:bg-white/0 md:p-0 md:backdrop-blur-0">
            <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
              Before → After
            </h2>
            <p className="mt-4 text-sm text-slate-700 md:text-base">
              「探し方が分からない」「比較が大変」を、最短で解決する。
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border bg-white/90 p-5">
              <p className="text-sm font-bold text-slate-700">Before</p>
              <p className="mt-2 text-sm text-slate-600">
                情報が散らばって比較できない / 何から始めればいいか分からない
              </p>
            </div>
            <div className="rounded-2xl border bg-white/90 p-5">
              <p className="text-sm font-bold text-slate-700">After</p>
              <p className="mt-2 text-sm text-slate-600">
                比較→保存→次の行動まで一本化。迷いが減って動ける
              </p>
            </div>
          </div>
        </div>
      </BgSection>

      {/* =====================
          ⑦ クロージング（背景画像＋文字）
         ===================== */}
      <BgSection
        id="closing"
        pcSrc={IMG.closing.pc}
        spSrc={IMG.closing.sp}
        alt="Closing"
        minHeightClassName="min-h-[60vh]"
        overlayClassName="bg-black/25"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-white/85">
            学生最後の一年、今すぐ理想の研修先のために行動したい。
          </p>
          <h2 className="mt-3 text-2xl font-extrabold text-white md:text-4xl">
            Resimatchで頑張らずに
            <br />
            キャリア・遊び・勉強を掴り取る。
          </h2>
          <p className="mt-4 text-sm text-white/85">
            次世代EBM型初期研修マッチング
          </p>

          <div className="mt-7">
            <Link
              href="/student/onboarding?from=lp1"
              className="inline-flex rounded-xl bg-orange-500 px-8 py-4 text-sm font-semibold text-white hover:bg-orange-600"
            >
              無料で診断する →
            </Link>
          </div>
        </div>
      </BgSection>

      {/* =====================
          ⑧ QA（背景画像＋カード）
          ※ QA用画像が無いので、いまは finalcta を背景として流用
         ===================== */}
      <BgSection
        id="qa"
        pcSrc={IMG.finalCta.pc}
        spSrc={IMG.finalCta.sp}
        alt="QA"
        minHeightClassName="min-h-[70vh]"
        overlayClassName="bg-black/35"
      >
        <div className="mx-auto max-w-6xl">
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
              <div key={x.q} className="rounded-2xl border bg-white/95 p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">Q{i + 1}.</p>
                <h3 className="mt-2 text-sm font-bold">{x.q}</h3>
                <p className="mt-3 text-sm text-slate-600">{x.a}</p>
              </div>
            ))}
          </div>
        </div>
      </BgSection>

      {/* =====================
          ⑨ FinalCTA（背景画像＋文字）
         ===================== */}
      <BgSection
        id="final"
        pcSrc={IMG.finalCta.pc}
        spSrc={IMG.finalCta.sp}
        alt="Final CTA"
        minHeightClassName="min-h-[55vh]"
        overlayClassName="bg-black/25"
      >
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-white md:text-3xl">
            理想の研修病院を見つけよう
          </h2>
          <p className="mt-2 text-sm text-white/85">
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

          <p className="mt-3 text-xs text-white/70">
            ※情報は公開情報・公式情報を元に整備しています
          </p>
        </div>
      </BgSection>
    </main>
  );
}