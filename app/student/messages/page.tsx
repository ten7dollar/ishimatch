export default function StudentMessagesPage() {
  return (
    <main className="p-8">
      <h1>メッセージ</h1>
      <p className="text-text-muted mb-6">
        病院とのメッセージのやり取りを確認します。
      </p>

      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="card hover:shadow-md transition">
            <p className="font-semibold text-primary-700">市中A病院</p>
            <p className="text-text-muted text-sm">
              ご応募ありがとうございます。今週の木曜に面談いかがでしょうか？
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}