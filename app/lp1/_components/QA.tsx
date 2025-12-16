const faqs = [
  { q: "無料ですか？", a: "（仮）基本機能は無料で使えます。" },
  { q: "どの学年向け？", a: "（仮）主に4〜6年生を想定しています。" },
  { q: "情報はどこから？", a: "（仮）公式情報・公開情報を元に整備しています。" },
];

export function QA() {
  return (
    <div className="divide-y rounded-2xl border bg-white">
      {faqs.map((f) => (
        <details key={f.q} className="p-5">
          <summary className="cursor-pointer font-semibold">{f.q}</summary>
          <p className="mt-2 text-sm text-slate-700">{f.a}</p>
        </details>
      ))}
    </div>
  );
}