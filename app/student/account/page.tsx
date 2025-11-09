"use client";
import { useEffect, useState } from "react";
import { useUserProfile } from "@/app/_providers/user-profile";

export default function StudentAccountPage() {
  const { loading, student, update } = useUserProfile();
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [gradYear, setGradYear] = useState<number | "">("");

  useEffect(() => {
    if (!loading && student) {
      setName(student.name ?? "");
      setUniversity(student.university ?? "");
      setGradYear(student.grad_year ?? "");
    }
  }, [loading, student]);

  const onSave = async () => {
    await update({
      name: name || null,
      university: university || null,
      grad_year: gradYear === "" ? null : Number(gradYear),
    });
    alert("保存しました");
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1>アカウント</h1>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-primary-700">基本情報</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">氏名</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="例：山田 太郎"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">大学</label>
            <input
              value={university}
              onChange={(e)=>setUniversity(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="例：東京大学医学部"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">卒業年</label>
            <input
              value={gradYear}
              onChange={(e)=>setGradYear(e.target.value === "" ? "" : Number(e.target.value))}
              type="number"
              className="w-full border rounded px-3 py-2"
              placeholder="例：2026"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onSave} className="btn btn-primary">保存</button>
        </div>
      </section>
    </main>
  );
}