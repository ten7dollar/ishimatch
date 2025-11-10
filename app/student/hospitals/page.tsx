// 学生の病院一覧は /student/browse に統一。
// 古い /student/hospitals にアクセス・プリフェッチされたときは即座に転送する。

import { redirect } from "next/navigation";

export const dynamic = "force-static"; // リダイレクトだけなので静的でOK
export default function LegacyStudentHospitalsIndex() {
  redirect("/student/browse");
}