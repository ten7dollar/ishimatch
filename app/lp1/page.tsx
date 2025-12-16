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

// ⑤ 追加のプロダクトスクショ（あるならここに並べる）
const PRODUCT_SCREENSHOTS: string[] = [
  // "/lp1/product/1.png",
  // "/lp1/product/2.png",
];

export default function Lp1Page() {
  return (
    <main className="bg-white text-slate-900">
      {/* ① Hero */}
      <BgSection
        id="hero"
        pcSrc={IMG.hero.pc}
        spSrc={IMG.hero.sp}
        alt="Hero"
        minHeightClassName="min-h-[78vh]"
        overlayStrength="none" // 画像を灰色にしない
        withSeparator={true}
      >
        <div className="flex justify-start">
          {/* 左端から少し間をあける（重要要件） */}
          <div className="w-full max-w-2xl pl-2 md:pl-0">
            <div className="rounded-2xl bg-white/85 p-6 backdrop-blur">
              <h1 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-5xl">
                実質時給で選ぶ。
                <br />
                次世代EBM型初期研修
                <br />
                マッチング。
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-700 md:text-base">
                給与・当直・教育体制などの公開情報を整理し、比較から検討までを一気通貫で。
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/student/onboarding?from=lp1"
                  className="rounded-xl bg-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
                >
                  無料で診断する →
                </Link>
                <Link
                  href="#worry"
                  className="rounded-xl bg-slate-100 px-7 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                >
                  悩みを見る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </BgSection>

      {/* ② CTA（帯：画像と画像の間に“白帯”を明確に入れる） */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <h2 className="text-xl font-extrabold md:text-2xl">
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
        <div className="h-10 bg-white md:h-14" />
      </section>

      {/* ③ お悩み */}
      <BgSection
        id="worry"
        pcSrc={IMG.worry.pc}
        spSrc={IMG.worry.sp}
        alt="Worry"
        minHeightClassName="min-h-[72vh]"
        overlayStrength="soft" // ほんのりだけ
        withSeparator={true}
      >
        <div className="pl-2 md:pl-0">
          <div className="max-w-2xl rounded-2xl bg-black/35 p-6 text-white backdrop-blur">
            <h3 className="text-2xl font-extrabold leading-snug md:text-3xl">
              病院によって待遇・働き方の記載方法がまちまち。
              <br />
              実際の働き方がイメージできない。
              <br />
              こんなお悩みありませんか？
            </h3>

            <ul className="mt-6 space-y-3 text-sm text-white/90 md:text-base">
              <li>・面談が多いけど当直回数や実態が多い</li>
              <li>・当直料が安いのに回数が多い</li>
              <li>・詳しいOBに面談してメロついてしまわない</li>
            </ul>

            <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm text-white/90">
              <span className="font-semibold">待遇と働き方</span>を探して選びたいのに、
              <span className="font-semibold">時間と手間がかかりすぎる</span>。
            </div>
          </div>
        </div>
      </BgSection>

      {/* ④ 解決 */}
      <BgSection
        id="solve"
        pcSrc={IMG.solve.pc}
        spSrc={IMG.solve.sp}
        alt="Solve"
        minHeightClassName="min-h-[72vh]"
        overlayStrength="none"
        withSeparator={true}
      >
        <div className="pl-2 md:pl-0">
          <div className="max-w-3xl rounded-2xl bg-white/85 p-6 backdrop-blur">
            <p className="text-sm font-semibold text-slate-700">
              Resimatchなら、検索・応募・スカウトまでワンストップで完結。
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">
              Resimatchなら
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { t: "病院一括比較", d: "必要な情報を同じ形式で整理" },
                { t: "AIレジュメ生成", d: "応募準備を最短化" },
                { t: "ダイレクトスカウト", d: "あなたに合う研修先から声が届く" },
              ].map((x) => (
                <div key={x.t} className="rounded-2xl border bg-white p-5">
                  <h3 className="font-bold">{x.t}</h3>
                  <p className="mt-2 text-sm text-slate-600">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BgSection>

      {/* ⑤ 実際の画面（背景画像＋文字＋スクショ） */}
      <BgSection
        id="screen"
        pcSrc={IMG.screen.pc}
        spSrc={IMG.screen.sp}
        alt="Screen"
        minHeightClassName="min-h-[78vh]"
        overlayStrength="soft"
        withSeparator={true}
      >
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="pl-2 md:pl-0">
            <div className="max-w-xl rounded-2xl bg-black/30 p-6 text-white backdrop-blur">
              <h2 className="text-2xl font-extrabold md:text-3xl">実際の画面</h2>
              <p className="mt-3 text-sm text-white/90 md:text-base">
                年収・当直・教育体制など、比較に必要な情報を同じ見方で整理。
              </p>
              <ul className="mt-5 space-y-2 text-sm text-white/90">
                <li>✓ 条件で比較</li>
                <li>✓ 気になる病院を保存</li>
                <li>✓ 次の行動がすぐ分かる</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-white/70 p-4 backdrop-blur">
            {PRODUCT_SCREENSHOTS.length > 0 ? (
              <ScreenCarousel images={PRODUCT_SCREENSHOTS} />
            ) : (
              <div className="rounded-xl bg-white p-6 text-sm text-slate-700">
                ここにプロダクトのスクショ（横スクロール）を入れられます。
                <div className="mt-2 text-xs text-slate-500">
                  public/lp1/product/ に画像を置いて、PRODUCT_SCREENSHOTS にパス追加。
                </div>
              </div>
            )}
          </div>
        </div>
      </BgSection>

      {/* ⑥ Before→After */}
      <BgSection
        id="beforeafter"
        pcSrc={IMG.beforeAfter.pc}
        spSrc={IMG.beforeAfter.sp}
        alt="Before After"
        minHeightClassName="min-h-[72vh]"
        overlayStrength="none"
        withSeparator={true}
      >
        <div className="pl-2 md:pl-0">
          <div className="max-w-3xl rounded-2xl bg-white/85 p-6 backdrop-blur">
            <h2 className="text-2xl font-extrabold md:text-3xl">Before → After</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm font-bold text-slate-700">Before</p>
                <p className="mt-2 text-sm text-slate-600">
                  情報が散らばって比較できない／何から始めればいいか分からない
                </p>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm font-bold text-slate-700">After</p>
                <p className="mt-2 text-sm text-slate-600">
                  比較→保存→次の行動まで一本化。迷いが減って動ける
                </p>
              </div>
            </div>
          </div>
        </div>
      </BgSection>

      {/* ⑦ クロージング */}
      <BgSection
        id="closing"
        pcSrc={IMG.closing.pc}
        spSrc={IMG.closing.sp}
        alt="Closing"
        minHeightClassName="min-h-[70vh]"
        overlayStrength="soft"
        withSeparator={true}
      >
        <div className="pl-2 md:pl-0">
          <div className="max-w-2xl rounded-2xl bg-black/35 p-6 text-white backdrop-blur">
            <p className="text-sm font-semibold text-white/90">
              学生最後の一年、今すぐ理想の研修先のために行動したい。
            </p>
            <h2 className="mt-3 text-2xl font-extrabold md:text-4xl">
              Resimatchで頑張らずに
              <br />
              キャリア・遊び・勉強を掴り取る。
            </h2>

            <div className="mt-6">
              <Link
                href="/student/onboarding?from=lp1"
                className="inline-flex rounded-xl bg-orange-500 px-8 py-4 text-sm font-semibold text-white hover:bg-orange-600"
              >
                無料で診断する →
              </Link>
            </div>
          </div>
        </div>
      </BgSection>

      {/* ⑧ QA（背景画像あり） */}
      <BgSection
        id="qa"
        pcSrc={IMG.finalCta.pc}
        spSrc={IMG.finalCta.sp}
        alt="QA"
        minHeightClassName="min-h-[72vh]"
        overlayStrength="medium"
        withSeparator={true}
      >
        <div className="pl-2 md:pl-0">
          <div className="max-w-6xl">
            <div className="inline-flex rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white">
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
                <div key={x.q} className="rounded-2xl bg-white/90 p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">Q{i + 1}.</p>
                  <h3 className="mt-2 text-sm font-bold">{x.q}</h3>
                  <p className="mt-3 text-sm text-slate-700">{x.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BgSection>

      {/* ⑨ Final CTA */}
      <BgSection
        id="final"
        pcSrc={IMG.finalCta.pc}
        spSrc={IMG.finalCta.sp}
        alt="Final CTA"
        minHeightClassName="min-h-[60vh]"
        overlayStrength="soft"
        withSeparator={false}
      >
        <div className="pl-2 md:pl-0 text-center">
          <div className="mx-auto max-w-3xl rounded-2xl bg-black/30 p-7 text-white backdrop-blur">
            <h2 className="text-2xl font-extrabold md:text-3xl">
              理想の研修病院を見つけよう
            </h2>
            <p className="mt-2 text-sm text-white/90">
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
        </div>
      </BgSection>
    </main>
  );
}