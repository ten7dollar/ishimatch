import Link from "next/link";

export function CTA({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isLight = variant === "light";

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/student/onboarding?from=lp1"
        className={
          isLight
            ? "rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
            : "rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        }
      >
        無料で試す
      </Link>

      <Link
        href="/student/hospitals?from=lp1"
        className={
          isLight
            ? "rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur"
            : "rounded-xl border px-5 py-3 text-sm font-semibold"
        }
      >
        病院を見てみる
      </Link>
    </div>
  );
}