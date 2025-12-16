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

// ⑤：プロダクトスクショ（3枚）
const PRODUCT_SCREENSHOTS: string[] = [
  "/lp1/product/screen1.png",
  "/lp1/product/screen2.png",
  "/lp1/product/screen3.png",
];

// CTAボタン（SPは小さめ、PCは大きめ）
function CtaButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href={SIGNUP_URL}
      className={[
        // size: SP small, PC large
        "inline-flex items-center justify-center rounded-xl bg-orange-500 font-semibold text-white shadow-sm hover:bg-orange-600",
        "px-6 py-3 text-sm",
        "md:px-10 md:py-5 md:text-base",
        className,
      ].join(" ")}
    >
      {CTA_LABEL}
    </Link>
  );
}

export default function Lp1Page() {
  return (
    <main className="bg-white text-slate-900">
      {/* =====================
          ① Hero：画像内テキスト（背景なし）
          - PCでサブ文を大きく（見やすさ）
          - CTAもSPは小さく、PCは大きく
         ===================== */}
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

            {/* サブメッセージ：PCだけサイズUP */}
            <p className="mt-4 text-sm leading-relaxed text-slate-700 md:text-lg md:leading-relaxed">
              給与・当直・教育体制等の情報を整理し、比較から申し込みまでを一気通貫で。
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <CtaButton />
              <Link
                href="#worry"
                className="inline-flex items-center justify-center rounded-xl bg-white/70 font-semibold text-slate-900 hover:bg-white
                           px-6 py-3 text-sm md:px-10 md:py-5 md:text-base"
              >
                悩みを見る
              </Link>
            </div>
          </div>
        </div>
      </BgSection>

      {/* =====================
          ② CTA（白帯：縦余白やや詰め）
         ===================== */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center md:py-9">
          <h2 className="text-xl font-extrabold md:text-2xl">
            あなたに合う研修病院を見つけよう
          </h2>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            完全無料・最短3分で完了します
          </p>

          <div className="mt-5 flex justify-center">
            <CtaButton />
          </div>
        </div>
        <div className="h-10 bg-white md:h-14" />
      </section>

      {/* =====================
          ③ お悩み：画像内テキスト（背景なし）
          - サブ箇条書き：PCだけ大きく
          - 下部中央に追加メッセージを入れる
         ===================== */}
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
            <h3 className="text-2xl font-extrabold leading-snug md:text-4xl">
              病院によって
              <br />
              待遇・働き方の記載がまちまち。
              <br />
              働き方がイメージできない。
              <br />
              こんなお悩みありませんか？
            </h3>

            {/* 箇条書き：PCだけサイズUP */}
            <ul className="mt-6 space-y-3 text-sm text-white/90 md:text-lg md:leading-relaxed">
              <li>・額面が高いけど当直回数や残業が多い</li>
              <li>・当直料が安いのに回数が多い</li>
              <li>・詳細は先輩に聞く/口コミでしか知れない</li>
            </ul>
          </div>

          {/* 下部中央の追加メッセージ */}
          <div className="mt-10 flex justify-center">
            <div className="max-w-3xl text-center text-white/90 text-sm md:text-lg md:leading-relaxed">
              待遇と経験両方重視したいのにあまりにも時間と手間がかかる。<br />
              妥協して選んだ研修病院で後悔するケースも。
            </div>
          </div>
        </div>
      </BgSection>

      {/* =====================
          ④ 解決：見出しを大きく、補足を小さくしない（逆転）
         ===================== */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 md:pb-14">
          {/* 目立たせたい文章をメイン見出しに */}
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-4xl">
            Resimatchなら、検索・応募・スカウトまでワンストップで完結。
          </h2>

          {/* サブは控えめ */}
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            比較→応募→スカウト受領までを一箇所で。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { t: "病院一括比較", d: "必要な情報を同じ形式で整理" },
              { t: "AIレジュメ生成", d: "応募準備を最短化" },
              { t: "ダイレクトスカウト", d: "あなたに合う研修先から声が届く" },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">{x.t}</h3>
                <p className="mt-2 text-sm text-slate-600 md:text-base">{x.d}</p>
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

      {/* =====================
          ⑤ 実際の画面：タイトル大きく、説明は控えめ
         ===================== */}
      <section id="screenshots" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-12 md:pb-16">
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-4xl">
            実際の画面
          </h2>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            年収・当直・教育体制など、比較に必要な情報を同じ見方で整理。
          </p>

          <div className="mt-6">
            <ScreenCarousel images={PRODUCT_SCREENSHOTS} />
          </div>
        </div>
        <div className="h-10 bg-white md:h-14" />
      </section>

      {/* =====================
          ⑥ Before→After：タイトル大きく、説明は控えめ
         ===================== */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 md:pb-14">
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-4xl">
            Before → After
          </h2>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
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

      {/* =====================
          ⑦ クロージング：SPはテキスト上寄せ＆CTA削除 / PCはCTA維持
         ===================== */}
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
          {/* SP：上寄せ（pt）、PC：中央 */}
          <div className="flex min-h-[70vh] items-start pt-8 md:min-h-0 md:items-center md:pt-0">
            <div className="max-w-3xl text-white">
              <p className="text-sm font-semibold text-white/90 md:text-base">
                学生最後の一年、今すぐ理想の研修先のために行動したい。
              </p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight md:text-4xl">
                Resimatchで頑張らずに
                <br />
                キャリア・遊び・勉強を掴り取る。
              </h2>

              {/* PCのみCTA（SPは削除） */}
              <div className="mt-6 hidden md:flex">
                <CtaButton />
              </div>
            </div>
          </div>
        </div>
      </BgSection>

      {/* =====================
          ⑧ QA：画像なし
         ===================== */}
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

      {/* =====================
          ⑨ FinalCTA：ボタンだけ
          - SPでボタンをさらに下へ（被り回避）
          - md以上は現状維持
         ===================== */}
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
          {/* translate-yはSPだけ強め、PCは今まで通り */}
          <div className="translate-y-24 md:translate-y-14">
            <CtaButton />
          </div>
        </div>
      </BgSection>
    </main>
  );
}