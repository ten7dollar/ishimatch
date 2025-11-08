"use client";
import { useState } from "react";

export default function StudentFindPage() {
  const [step, setStep] = useState(1);

  return (
    <main className="p-8">
      <h1>診断で探す</h1>

      {step === 1 && (
        <div className="card max-w-xl">
          <p className="text-text mb-4">Q1. 希望する勤務地を選択してください。</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {["東京", "大阪", "名古屋", "福岡"].map((city) => (
              <button
                key={city}
                className="px-4 py-2 bg-primary-50 text-primary-800 rounded-md hover:bg-primary-100 transition"
              >
                {city}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="bg-primary-500 text-white px-5 py-2 rounded-md hover:bg-primary-600 active:bg-primary-700 transition"
          >
            次へ
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card max-w-xl">
          <p className="text-text mb-4">Q2. 研修スタイルの希望を選んでください。</p>
          <div className="flex flex-col gap-2 mb-4">
            <button className="border rounded-md py-2 hover:bg-primary-50 hover:text-primary-800 transition">
              じっくり学びたい
            </button>
            <button className="border rounded-md py-2 hover:bg-primary-50 hover:text-primary-800 transition">
              多くの症例を経験したい
            </button>
            <button className="border rounded-md py-2 hover:bg-primary-50 hover:text-primary-800 transition">
              ワークライフバランス重視
            </button>
          </div>
          <button
            onClick={() => setStep(3)}
            className="bg-primary-500 text-white px-5 py-2 rounded-md hover:bg-primary-600 active:bg-primary-700 transition"
          >
            次へ
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="card max-w-xl text-center">
          <p className="text-text-muted mb-6">結果を分析しています...</p>
          <p className="text-2xl font-bold text-primary-600">
            あなたに合う病院を提案中！
          </p>
        </div>
      )}
    </main>
  );
}