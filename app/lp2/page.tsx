// app/lp2/page.tsx
import Link from "next/link";

export const metadata = {
  title: "病院向け｜ResiMatch（レジマッチ）｜初期研修医採用を“見つけられ・攻められ・回せる”に",
  description:
    "Z世代特化の初期研修マッチング支援プラットフォーム。学生が使いたくなる導線（比較・AI・オンライン応募）で、病院の採用成果を伸ばします。",
};

const CTA_URL = "/contact"; // TODO: 実際の問い合わせURLに合わせて変更してください
const CTA_LABEL = "30分の無料相談を申し込む";

const navItems = [
  { label: "特徴", href: "#features" },
  { label: "料金", href: "#pricing" },
  { label: "導入まで", href: "#onboarding" },
  { label: "FAQ", href: "#faq" },
];

const painPoints = [
  { title: "掲載しているのに応募が来ない", desc: "情報過多で埋もれ、候補にすら入らない。" },
  { title: "条件を上げても母集団が増えない", desc: "“知られていない”がボトルネック。" },
  { title: "新しい施策が続かない", desc: "ノウハウ不足で改善サイクルが回らない。" },
  { title: "忙しくて採用に時間が割けない", desc: "現場負担が増えて手が止まる。" },
];

const studentReasons = [
  { title: "比較しやすい", desc: "情報が整理され、短時間で候補を絞れる。" },
  { title: "応募が速い", desc: "見学応募までオンラインで完結し、行動のハードルが低い。" },
  { title: "発見がある", desc: "AIレコメンドで、自分では探さない病院にも出会える。" },
];

const hospitalReasons = [
  { title: "見つけられる", desc: "学生が集まる導線上で、貴院の露出が増える。" },
  { title: "攻められる", desc: "待つだけでなく、スカウトで狙った学生にアプローチできる。" },
  {
    title: "回せる",
    desc: "煩雑な運用を支援し、担当者は面談・見学に集中できる。",
  },
];

const strengths = [
  {
    kicker: "強み① 応募数最大化",
    title: "待つ採用から、攻める採用へ",
    bullets: ["狙った学生に直接アプローチ", "認知の“きっかけ”を作る", "応募母集団の増加を狙える"],
  },
  {
    kicker: "強み② 応募管理・振り返り",
    title: "応募〜内定を一元管理し、改善が回る",
    bullets: [
      "応募者情報と選考状況を整理",
      "反応を可視化し、次年度に活きる",
      "辞退・早期離脱リスクを抑える打ち手が立てやすい",
    ],
  },
  {
    kicker: "強み③ 工数削減",
    title: "スカウト運用の煩雑作業を最小化",
    bullets: ["検索・文面・送付管理・調整を支援", "現場負担を増やさず新施策が回る", "工数80%以上削減を狙える※"],
    footnote: "※工数削減効果は運用状況により変動します。",
  },
];

const pricing = [
  {
    name: "Light",
    price: "120,000",
    unit: "円 / 月",
    points: ["まずは掲載・運用の土台づくりに", "必要に応じて上位プランへ拡張"],
    tag: "はじめて向け",
    highlight: false,
  },
  {
    name: "Basic",
    price: "200,000",
    unit: "円 / 月",
    points: ["スカウト 300通", "運用を回しながら改善したい病院向け"],
    tag: "人気",
    highlight: true,
  },
  {
    name: "Premium",
    price: "320,000",
    unit: "円 / 月",
    points: ["スカウト 500通", "専任サポーター付きで手厚く運用"],
    tag: "伴走重視",
    highlight: false,
  },
];

const faqs = [
  {
    q: "どんな病院が向いていますか？",
    a: "初期研修医の採用枠を安定的に埋めたい病院様、媒体掲載だけでは応募が伸びづらい病院様に向いています。",
  },
  {
    q: "スカウト文面や運用はどこまで支援してくれますか？",
    a: "学生検索・文面作成・送付管理・日程調整など、煩雑になりがちな運用を支援します。病院様は面談・見学対応に集中しやすくなります。",
  },
  {
    q: "応募管理は何ができますか？",
    a: "応募者の基本情報と選考状況を一元管理し、どの施策が反応につながったかを振り返りやすくします（改善・再現性の向上）。",
  },
  {
    q: "導入までに必要な準備は？",
    a: "掲載情報（病院紹介・研修内容・見学導線など）の整理が中心です。最短2〜3週間で導入開始を目指せます。",
  },
  {
    q: "途中でプラン変更できますか？",
    a: "状況に応じてご相談可能です。まずは現状を伺い、運用体制に合うプランをご提案します。",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
              <span className="text-sm font-bold">RM</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">ResiMatch</div>
              <div className="text-xs text-slate-600">病院向け 採用支援</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-slate-700 hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={CTA_URL}
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              {CTA_LABEL}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                病院向け
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                最短2〜3週間で導入
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                工数80%以上削減を狙える※
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              初期研修医採用を
              <span className="block">
                “見つけられ・攻められ・回せる”に変える
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-700 sm:text-lg">
              学生が使いたくなる導線（比較・AI・オンライン応募）が強いほど、
              病院は見つけられ、選ばれ、採用が前に進みます。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={CTA_URL}
                className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {CTA_LABEL}
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                特徴を見る
              </a>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              ※工数削減効果は運用状況により変動します。
            </p>
          </div>

          {/* UI Mock (no images) */}
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">学生画面（イメージ）</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  比較・AI・応募
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {["病院検索", "比較一覧", "AIレコメンド", "見学応募（オンライン完結）"].map((t) => (
                  <div key={t} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-900">{t}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-600">
                      迷わず次の行動へ
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">病院画面（イメージ）</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  スカウト・管理
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {["学生検索", "スカウト送信/管理", "応募一覧/ステータス", "反応（効果測定）"].map((t) => (
                  <div key={t} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-900">{t}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-600">
                      “攻め”と改善が回る
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              媒体だけでは、埋まらない理由があります
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              “条件”の問題ではなく、“知られていない・比べづらい・動きづらい”がボトルネックになることが増えています。
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {painPoints.map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">{p.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">{p.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">結果</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              空き枠が埋まらず、現場の負担だけが増える——この構造を変える必要があります。
            </p>
          </div>
        </div>
      </section>

      {/* What is */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              ResiMatchとは
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Z世代特化の初期研修マッチング支援プラットフォーム。
              学生の“使いたさ”が、病院の“採用しやすさ”につながります。
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-900">学生側</div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                {["検索・比較がしやすい", "見学応募までオンラインで完結", "AI適性レコメンドで発見が増える"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-slate-900" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-900">病院側</div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                {["スカウトで“攻め”の採用", "応募〜内定を一元管理", "振り返りで改善（採用の再現性）", "運用代行・サポート"].map(
                  (t) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-slate-900" />
                      <span>{t}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Flywheel */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              学生体験の強さが、そのまま採用成果に変換される
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              学生が集まるほど病院は見つけられ、病院の活動が情報を充実させ、さらに学生が選びやすくなる循環が生まれます。
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            {[
              { n: "1", t: "学生：比較しやすい / AI / 応募が速い" },
              { n: "2", t: "学生が集まる → 病院が“見つけられる”" },
              { n: "3", t: "病院：スカウトで“攻められる”" },
              { n: "4", t: "見学・応募が増える → 情報が充実" },
              { n: "5", t: "学生の選びやすさUP → 循環強化" },
            ].map((s, idx) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                    {s.n}
                  </div>
                  {idx < 4 ? (
                    <span className="text-slate-400" aria-hidden>
                      →
                    </span>
                  ) : (
                    <span className="text-slate-400" aria-hidden>
                      ↺
                    </span>
                  )}
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">{s.t}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-slate-900">キーワード</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["見つけられる", "攻められる", "回せる", "改善できる"].map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features intro */}
      <section id="features" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                学生と病院、両方に“使いやすい”から成果につながる
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                学生の行動が増える設計と、病院が運用を続けられる設計を両立します。
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-sm font-semibold text-slate-900">学生が使いたい理由</div>
                  <div className="mt-4 space-y-3">
                    {studentReasons.map((x) => (
                      <div key={x.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-sm font-semibold text-slate-900">{x.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-600">{x.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-sm font-semibold text-slate-900">病院が導入したい理由</div>
                  <div className="mt-4 space-y-3">
                    {hospitalReasons.map((x) => (
                      <div key={x.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-sm font-semibold text-slate-900">{x.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-600">{x.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <Link
                  href={CTA_URL}
                  className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  {CTA_LABEL}
                </Link>
              </div>
            </div>

            {/* Strengths */}
            <div className="grid gap-4">
              {strengths.map((s) => (
                <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="text-xs font-semibold text-slate-600">{s.kicker}</div>
                  <div className="mt-2 text-lg font-bold text-slate-900">{s.title}</div>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex gap-3">
                        <span className="mt-2 inline-block h-2 w-2 rounded-full bg-orange-500" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  {s.footnote ? (
                    <div className="mt-3 text-xs text-slate-500">{s.footnote}</div>
                  ) : null}
                </div>
              ))}

              {/* Comparison */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-slate-900">
                  従来（掲載待ち） vs ResiMatch（攻め＋運用支援）
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[620px] border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="rounded-tl-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-700">
                          観点
                        </th>
                        <th className="border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-700">
                          従来（掲載）
                        </th>
                        <th className="rounded-tr-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-700">
                          ResiMatch
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700">
                      {[
                        {
                          k: "認知獲得",
                          a: "待つ（見られないと始まらない）",
                          b: "攻める（スカウトで接点を作る）",
                        },
                        {
                          k: "運用継続",
                          a: "属人化しやすい",
                          b: "運用支援で回しやすい",
                        },
                        {
                          k: "改善",
                          a: "振り返りがしづらい",
                          b: "反応の可視化で改善が回る",
                        },
                      ].map((row, i) => (
                        <tr key={row.k}>
                          <td
                            className={cn(
                              "border border-slate-200 px-4 py-3 font-semibold text-slate-900",
                              i === 2 ? "rounded-bl-xl" : ""
                            )}
                          >
                            {row.k}
                          </td>
                          <td className="border border-slate-200 px-4 py-3">{row.a}</td>
                          <td
                            className={cn(
                              "border border-slate-200 px-4 py-3",
                              i === 2 ? "rounded-br-xl" : ""
                            )}
                          >
                            {row.b}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  ※採用成果は病院様の採用体制・運用状況により変動します。
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              料金プラン
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              病院様の体制に合わせて選べる3プラン。まずは現状を伺い、最適な進め方をご提案します。
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "rounded-2xl border p-6 shadow-sm",
                  p.highlight ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn("text-lg font-bold", p.highlight ? "text-white" : "text-slate-900")}>
                    {p.name}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      p.highlight ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    {p.tag}
                  </span>
                </div>

                <div className="mt-5 flex items-end gap-2">
                  <div className={cn("text-4xl font-extrabold tracking-tight", p.highlight ? "text-white" : "text-slate-900")}>
                    {p.price}
                  </div>
                  <div className={cn("text-sm font-semibold", p.highlight ? "text-white/80" : "text-slate-600")}>
                    {p.unit}
                  </div>
                </div>

                <ul className={cn("mt-5 space-y-2 text-sm leading-6", p.highlight ? "text-white/90" : "text-slate-700")}>
                  {p.points.map((x) => (
                    <li key={x} className="flex gap-3">
                      <span className={cn("mt-2 inline-block h-2 w-2 rounded-full", p.highlight ? "bg-orange-400" : "bg-orange-500")} />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Link
                    href={CTA_URL}
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2",
                      p.highlight
                        ? "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-300"
                        : "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300"
                    )}
                  >
                    {CTA_LABEL}
                  </Link>
                </div>

                <div className={cn("mt-3 text-xs", p.highlight ? "text-white/70" : "text-slate-500")}>
                  詳細はヒアリングで最適提案します。
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Onboarding */}
      <section id="onboarding" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              導入まで（最短2〜3週間）
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              約1週間×3工程を目安に、運用開始まで伴走します。
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              { step: "1", title: "申込・初回打ち合わせ", desc: "現状と採用目標を整理し、進め方を設計。" },
              { step: "2", title: "掲載情報準備・ページ作成", desc: "病院情報を整理し、見つけられる状態へ。" },
              { step: "3", title: "公開・運用開始", desc: "スカウト・応募対応を回し、改善へ。" },
            ].map((x) => (
              <div key={x.step} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                    {x.step}
                  </div>
                  <div className="text-base font-bold text-slate-900">{x.title}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{x.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">次の一手を一緒に整理します</div>
                <div className="mt-1 text-sm text-slate-700">
                  貴院の状況に合わせて、最短ルートをご提案します。
                </div>
              </div>
              <Link
                href={CTA_URL}
                className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {CTA_LABEL}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">FAQ</h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              よくある質問をまとめました。詳細は無料相談でご案内します。
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-slate-200 bg-white p-5 open:bg-slate-50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-900">{f.q}</span>
                  <span className="text-slate-500 group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>

          {/* Final CTA */}
          <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-900 p-7 text-white sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-2xl font-bold tracking-tight">まずは30分で現状を整理しませんか</div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
                  病院様の採用課題を伺い、「見つけられる / 攻められる / 回せる / 改善できる」導線を最短で設計します。
                </p>
                <p className="mt-3 text-xs text-white/70">
                  ※効果は病院様の採用体制・運用状況により変動します。
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href={CTA_URL}
                  className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  {CTA_LABEL}
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  料金を確認する
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 border-t border-slate-200 pt-8">
            <div className="flex flex-col gap-2 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">株式会社OpenYouth</div>
              <div className="text-slate-600">Web：openyouth.co.jp</div>
              <div className="text-xs text-slate-500">
                ResiMatch（レジマッチ）｜初期研修医採用支援
              </div>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}