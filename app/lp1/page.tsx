import Link from "next/link";
import { BgSection } from "./_components/BgSection";
import { ScreenCarousel } from "./_components/ScreenCarousel";

const SIGNUP_URL = "https://www.resi-match.com/signup";
const CTA_LABEL = "無料で登録する →";

const IMG = {
  hero: { pc: "/lp1/hero_pc.jpg", sp: "/lp1/hero_sp.jpg" },
  worry: { pc: "/lp1/worry_pc.jpg", sp: "/lp1/worry_sp.jpg" },
  solve: { pc: "/lp1/solve_pc.jpg", sp: "/lp1/solve_sp.jpg" },
  beforeAfter: { pc: "/lp1/beforeafter_pc.jpg", sp: "/lp1/beforeafter_sp.jpg" },
  closing: { pc: "/lp1/closing_pc.jpg", sp: "/lp1/closing_sp.jpg" },
  finalCta: { pc: "/lp1/finalcta_pc.jpg", sp: "/lp1/finalcta_sp.jpg" },
};

const PRODUCT_SCREENSHOTS: string[] = [
  "/lp1/product/screen1.png",
  "/lp1/product/screen2.png",
  "/lp1/product/screen3.png",
];

// --------- helpers ---------
function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-4 ${className}`}>{children}</div>;
}

function CtaButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href={SIGNUP_URL}
      className={[
        "inline-flex items-center justify-center rounded-xl bg-orange-500 font-semibold text-white shadow-sm hover:bg-orange-600",
        // SP small / PC larger
        "px-6 py-3 text-sm",
        "md:px-10 md:py-5 md:text-base",
        className,
      ].join(" ")}
    >
      {CTA_LABEL}
    </Link>
  );
}

// タイポ（崩れ防止）
// - 見出し：SPは大きすぎない、行間 tight、最大幅固定
// - 本文：SPは14px前後、PCで16〜18px
const TYPO = {
  h1: "text-[28px] leading-tight font-extrabold md:text-5xl md:leading-tight",
  h2: "text-[24px] leading-tight font-extrabold md:text-4xl md:leading-tight",
  h3: "text-[22px] leading-tight font-extrabold md:text-4xl md:leading-tight",
  p: "text-[14px] leading-relaxed md:text-base md:leading-relaxed",
  pLg: "text-[14px] leading-relaxed md:text-lg md:leading-relaxed",
  bullet: "text-[13px] leading-relaxed md:text-lg md:leading-relaxed",
};

export default function Lp1Page() {
  return (
    <main className="bg-white text-slate-900">
      {/* =====================
          ① Hero（画像内テキスト・崩れにくい）
         ===================== */}
      <BgSection
        id="hero"
        pcSrc={IMG.hero.pc}
        spSrc={IMG.hero.sp}
        alt="Hero"
        minHeightClassName="min-h-[520px] md:min-h-[560px]"
        overlayStrength="none"
        withSeparator={false}
        fit="cover"
        position="center"
        scaleClassName="scale-100"
      >
        <div className="pl-2 md:pl-0">
          {/* max-w を固定して折り返しを安定 */}
          <div className="max-w-[560px]">
            {/* 不自然な <br/> を減らして自然折り返しに寄せる */}
            <h1 className={TYPO.h1}>
              実質時給で選ぶ。次世代EBM型初期研修マッチング。
            </h1>

            <p className={`mt-4 text-slate-700 ${TYPO.pLg}`}>
              給与・当直・教育体制等の情報を整理し、比較から申し込みまでを一気通貫で。
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <CtaButton />
              <Link
                href="#worry"
                className={[
                  "inline-flex items-center justify-center rounded-xl bg-white/70 font-semibold text-slate-900 hover:bg-white",
                  "px-6 py-3 text-sm",
                  "md:px-10 md:py-5 md:text-base",
                ].join(" ")}
              >
                悩みを見る
              </Link>
            </div>
          </div>
        </div>
      </BgSection>

      {/* ② CTA（余白を締める） */}
      <section className="bg-white">
        <Container className="py-7 md:py-8 text-center">
          <h2 className={`text-slate-900 ${TYPO.h2}`}>あなたに合う研修病院を見つけよう</h2>
          <p className={`mt-2 text-slate-600 ${TYPO.p}`}>完全無料・最短3分で完了します</p>
          <div className="mt-5 flex justify-center">
            <CtaButton />
          </div>
        </Container>
      </section>

      {/* =====================
          ③ お悩み（全体崩れ防止：SP用タイポ + 下部固定）
         ===================== */}
      <BgSection
        id="worry"
        pcSrc={IMG.worry.pc}
        spSrc={IMG.worry.sp}
        alt="Worry"
        minHeightClassName="min-h-[560px] md:min-h-[600px]"
        overlayStrength="soft"
        withSeparator={false}
        fit="cover"
        position="center"
        scaleClassName="scale-100"
      >
        <div className="relative pl-2 md:pl-0 min-h-[560px] md:min-h-[600px]">
          <div className="max-w-[560px] text-white">
            <h3 className={TYPO.h3}>
              病院によって待遇・働き方の記載がまちまち。働き方がイメージできない。
              こんなお悩みありませんか？
            </h3>

            <ul className={`mt-5 space-y-2 text-white/90 ${TYPO.bullet}`}>
              <li>・額面が高いけど当直回数や残業が多い</li>
              <li>・当直料が安いのに回数が多い</li>
              <li>・詳細は先輩に聞く／口コミでしか知れない</li>
            </ul>
          </div>

          {/* 下部メッセージ：下固定（SPでも安定） */}
          <div className="absolute inset-x-0 bottom-5 md:bottom-10 flex justify-center">
            <p
              className={[
                "max-w-[92%] md:max-w-3xl text-center font-extrabold text-orange-200 drop-shadow",
                "text-[15px] leading-relaxed md:text-xl md:leading-relaxed",
              ].join(" ")}
            >
              待遇と経験両方重視したいのに、あまりにも時間と手間がかかる。
              <br />
              <span className="text-orange-300">妥協して選んだ研修先で後悔することも。</span>
            </p>
          </div>

          {/* 下部固定分の余白（被り防止） */}
          <div className="h-36 md:h-40" />
        </div>
      </BgSection>

      {/* =====================
          ④ 機能（背景を交互にして区切りを自然に）
         ===================== */}
      <section className="bg-slate-50">
        <Container className="py-12 md:py-14">
          <h2 className={`text-slate-900 ${TYPO.h2}`}>
            Resimatchなら、検索・比較・応募までワンストップで完結。
          </h2>
          <p className={`mt-3 text-slate-600 ${TYPO.p}`}>
            比較→応募→スカウト受領までを一箇所で。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { t: "病院一括比較", d: "必要な情報を同じ形式で整理" },
              { t: "AIレジュメ生成", d: "応募準備を最短化" },
              { t: "ダイレクトスカウト", d: "あなたに合う研修先から声が届く" },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">{x.t}</h3>
                <p className={`mt-2 text-slate-600 ${TYPO.p}`}>{x.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <BgSection
              id="solve"
              pcSrc={IMG.solve.pc}
              spSrc={IMG.solve.sp}
              alt="Solve"
              minHeightClassName="min-h-[320px] md:min-h-[420px]"
              overlayStrength="none"
              withSeparator={false}
              contentClassName="py-6 md:py-8"
              fit="contain"
              position="center"
              bgClassName="bg-white"
              scaleClassName="scale-100"
            >
              <div />
            </BgSection>
          </div>
        </Container>
      </section>

      {/* =====================
          ⑤ 実際の画面
         ===================== */}
      <section id="screenshots" className="bg-white">
        <Container className="py-12 md:py-14">
          <h2 className={`text-slate-900 ${TYPO.h2}`}>実際の画面</h2>
          <p className={`mt-3 text-slate-600 ${TYPO.p}`}>
            年収・当直・教育体制など、比較に必要な情報を同じ見方で整理。
          </p>
          <div className="mt-6">
            <ScreenCarousel images={PRODUCT_SCREENSHOTS} />
          </div>
        </Container>
      </section>

      {/* =====================
          ⑥ Before→After
         ===================== */}
      <section className="bg-slate-50">
        <Container className="py-12 md:py-14">
          <h2 className={`text-slate-900 ${TYPO.h2}`}>Before → After</h2>
          <p className={`mt-3 text-slate-600 ${TYPO.p}`}>
            「探し方が分からない」「比較が大変」を、最短で解決する。
          </p>

          <div className="mt-8">
            <BgSection
              id="beforeafter"
              pcSrc={IMG.beforeAfter.pc}
              spSrc={IMG.beforeAfter.sp}
              alt="Before After"
              minHeightClassName="min-h-[320px] md:min-h-[420px]"
              overlayStrength="none"
              withSeparator={false}
              contentClassName="py-6 md:py-8"
              fit="contain"
              position="center"
              bgClassName="bg-white"
              scaleClassName="scale-100"
            >
              <div />
            </BgSection>
          </div>
        </Container>
      </section>

      {/* =====================
          ⑦ クロージング（SP CTAなし / PC CTAあり）
         ===================== */}
      <BgSection
        id="closing"
        pcSrc={IMG.closing.pc}
        spSrc={IMG.closing.sp}
        alt="Closing"
        minHeightClassName="min-h-[520px] md:min-h-[560px]"
        overlayStrength="soft"
        withSeparator={false}
        fit="cover"
        position="center"
        scaleClassName="scale-100"
      >
        <div className="pl-2 md:pl-0">
          <div className="flex min-h-[520px] items-start pt-8 md:min-h-[560px] md:items-center md:pt-0">
            <div className="max-w-[680px] text-white">
              <p className={`text-white/90 ${TYPO.p}`}>学生最後の一年、理想の研修先のために行動したい。</p>
              <h2 className={`mt-2 ${TYPO.h2}`}>
                Resimatchで頑張らずにキャリア・遊び・勉強を掴り取る。
              </h2>

              <div className="mt-6 hidden md:flex">
                <CtaButton />
              </div>
            </div>
          </div>
        </div>
      </BgSection>

      {/* =====================
          ⑧ QA
         ===================== */}
      <section id="qa" className="bg-white">
        <Container className="py-12 md:py-14">
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
                <h3 className="mt-2 text-sm font-bold text-slate-900">{x.q}</h3>
                <p className={`mt-3 text-slate-600 ${TYPO.p}`}>{x.a}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* =====================
          ⑨ FinalCTA（ボタンのみ）
         ===================== */}
      <BgSection
        id="final"
        pcSrc={IMG.finalCta.pc}
        spSrc={IMG.finalCta.sp}
        alt="Final CTA"
        minHeightClassName="min-h-[440px] md:min-h-[520px]"
        overlayStrength="none"
        withSeparator={false}
        fit="cover"
        position="center"
        scaleClassName="scale-100"
      >
        <div className="flex min-h-[440px] items-center justify-center md:min-h-[520px]">
          <div className="translate-y-20 md:translate-y-14">
            <CtaButton />
          </div>
        </div>
      </BgSection>
    </main>
  );
}