"use client";
import { useEffect, useState } from "react";
import { useUserProfile } from "@/app/_providers/user-profile";

export default function HospitalAccountPage() {
  const { loading, hospital, update } = useUserProfile();
  const [contactName, setContactName] = useState("");
  const [hospitalName, setHospitalName] = useState("");

  useEffect(() => {
    if (!loading && hospital) {
      setContactName(hospital.contact_name ?? "");
      setHospitalName(hospital.hospital_name ?? "");
    }
  }, [loading, hospital]);

  const onSave = async () => {
    await update({
      contact_name: contactName || null,
      hospital_name: hospitalName || null,
    });
    alert("保存しました");
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1>アカウント管理</h1>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-primary-700">基本情報</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">担当者名</label>
            <input
              value={contactName}
              onChange={(e)=>setContactName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="例：採用担当 佐藤"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">病院名</label>
            <input
              value={hospitalName}
              onChange={(e)=>setHospitalName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="例：東京中央医療センター"
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