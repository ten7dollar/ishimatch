import Link from "next/link";
import { BgSection } from "./_components/BgSection";
import { ScreenCarousel } from "./_components/ScreenCarousel";

const SIGNUP_URL = "https://www.resi-match.com/signup";

const IMG = {
  hero: { pc: "/lp1/hero_pc.jpg", sp: "/lp1/hero_sp.jpg" },
  worry: { pc: "/lp1/worry_pc.jpg", sp: "/lp1/worry_sp.jpg" },
  solve: { pc: "/lp1/solve_pc.jpg", sp: "/lp1/solve_sp.jpg" },
  screen: { pc: "/lp1/screen_pc.jpg", sp: "/lp1/screen_sp.jpg" },
  beforeAfter: { pc: "/lp1/beforeafter_pc.jpg", sp: "/lp1/beforeafter_sp.jpg" },
  closing: { pc: "/lp1/closing_pc.jpg", sp: "/lp1/closing_sp.jpg" },
  finalCta: { pc: "/lp1/finalcta_pc.jpg", sp: "/lp1/finalcta_sp.jpg" },
};

// ⑤：追加のプロダクトスクショ（任意）
const PRODUCT_SCREENSHOTS: string[] = [];

export default function Lp1Page() {
  return (
    <main className="bg-white text-slate-900">
      {/* ① Hero：画像内テキスト（背景なし） */}
      <BgSection
        id="hero"
        pcSrc={IMG.hero.pc}
        spSrc={IMG.hero.sp}
        alt="Hero"
        minHeightClassName="min-h-[78vh]"
        overlayStrength="none"
        withSeparator={true}
        fit="cover"
        position="center"
        scaleClassName="scale-100"
      >
        <div className="pl-2 md:pl-0">
          <div className="max-w-2xl">
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
                href={SIGNUP_URL}
                className="rounded-xl bg-orange-500 px-7 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                無料で診断する →
              </Link>
              <Link
                href="#worry"
                className="rounded-xl bg-white/70 px-7 py-3.5 text-base font-semibold text-slate-900 hover:bg-white"
              >
                悩みを見る
              </Link>
            </div>
          </div>
        </div>
      </BgSection>

      {/* ② CTA（白帯：縦余白を少し詰める） */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center md:py-9">
          <h2 className="text-xl font-extrabold md:text-2xl">
            あなたに合う研修病院を見つけよう
          </h2>
          <p className="mt-2 text-sm text-slate-600">完全無料・最短3分で完了します</p>

          <div className="mt-5 flex justify-center">
            <Link
              href={SIGNUP_URL}
              className="rounded-xl bg-orange-500 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              無料で診断する →
            </Link>
          </div>
        </div>
        <div className="h-10 bg-white md:h-14" />
      </section>

      {/* ③ お悩み：画像内テキスト（背景なし） */}
      <BgSection
        id="worry"
        pcSrc={IMG.worry.pc}
        spSrc={IMG.worry.sp}
        alt="Worry"
        minHeightClassName="min-h-[72vh]"
        overlayStrength="soft"
        withSeparator={true}
        fit="cover"
        position="center"
        scaleClassName="scale-100"
      >
        <div className="pl-2 md:pl-0">
          <div className="max-w-2xl text-white">
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
          </div>
        </div>
      </BgSection>

      {/* ④ 解決：テキストは画像外（上） + 画像（常に全体表示＝contain） */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 md:pb-14">
          <p className="text-sm font-semibold text-slate-600">
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

        <BgSection
          id="solve"
          pcSrc={IMG.solve.pc}
          spSrc={IMG.solve.sp}
          alt="Solve"
          minHeightClassName="min-h-[56vh]"
          overlayStrength="none"
          withSeparator={true}
          contentClassName="py-10 md:py-14"
          fit="contain"
          position="center"
          bgClassName="bg-white"
          scaleClassName="scale-100"
        >
          <div />
        </BgSection>
      </section>

      {/* ⑤ 実際の画面：テキスト外 + 画像（contain） */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 md:pb-14">
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
            実際の画面
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            年収・当直・教育体制など、比較に必要な情報を同じ見方で整理。
          </p>

          {PRODUCT_SCREENSHOTS.length > 0 ? (
            <div className="mt-6">
              <ScreenCarousel images={PRODUCT_SCREENSHOTS} />
            </div>
          ) : null}
        </div>

        <BgSection
          id="screen"
          pcSrc={IMG.screen.pc}
          spSrc={IMG.screen.sp}
          alt="Screen"
          minHeightClassName="min-h-[56vh]"
          overlayStrength="none"
          withSeparator={true}
          contentClassName="py-10 md:py-14"
          fit="contain"
          position="center"
          bgClassName="bg-white"
          scaleClassName="scale-100"
        >
          <div />
        </BgSection>
      </section>

      {/* ⑥ Before→After：テキスト外 + 画像（contain） */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 md:pb-14">
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
            Before → After
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            「探し方が分からない」「比較が大変」を、最短で解決する。
          </p>
        </div>

        <BgSection
          id="beforeafter"
          pcSrc={IMG.beforeAfter.pc}
          spSrc={IMG.beforeAfter.sp}
          alt="Before After"
          minHeightClassName="min-h-[56vh]"
          overlayStrength="none"
          withSeparator={true}
          contentClassName="py-10 md:py-14"
          fit="contain"
          position="center"
          bgClassName="bg-white"
          scaleClassName="scale-100"
        >
          <div />
        </BgSection>
      </section>

      {/* ⑦ クロージング：画像内テキスト */}
      <BgSection
        id="closing"
        pcSrc={IMG.closing.pc}
        spSrc={IMG.closing.sp}
        alt="Closing"
        minHeightClassName="min-h-[70vh]"
        overlayStrength="soft"
        withSeparator={true}
        fit="cover"
        position="center"
        scaleClassName="scale-100"
      >
        <div className="pl-2 md:pl-0">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-semibold text-white/90">
              学生最後の一年、今すぐ理想の研修先のために行動したい。
            </p>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight md:text-4xl">
              Resimatchで頑張らずに
              <br />
              キャリア・遊び・勉強を掴り取る。
            </h2>

            <div className="mt-6">
              <Link
                href={SIGNUP_URL}
                className="inline-flex rounded-xl bg-orange-500 px-10 py-5 text-base font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                無料で診断する →
              </Link>
            </div>
          </div>
        </div>
      </BgSection>

      {/* ⑧ QA：画像なし */}
      <section id="qa" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
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
              <div key={x.q} className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">Q{i + 1}.</p>
                <h3 className="mt-2 text-sm font-bold">{x.q}</h3>
                <p className="mt-3 text-sm text-slate-600">{x.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑨ FinalCTA：画像上にボタンだけ */}
      <BgSection
        id="final"
        pcSrc={IMG.finalCta.pc}
        spSrc={IMG.finalCta.sp}
        alt="Final CTA"
        minHeightClassName="min-h-[60vh]"
        overlayStrength="none"
        withSeparator={false}
        fit="cover"
        position="center"
        scaleClassName="scale-100"
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="translate-y-10 md:translate-y-14">
            <Link
              href={SIGNUP_URL}
              className="inline-flex rounded-xl bg-orange-500 px-10 py-5 text-base font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              無料で診断する →
            </Link>
          </div>
        </div>
      </BgSection>
    </main>
  );
}