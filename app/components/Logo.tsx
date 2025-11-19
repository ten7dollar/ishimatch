"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  href?: string;
  size?: number;         // 高さ(px)
  withText?: boolean;    // 視覚外のテキストを付けるか（アクセシビリティ）
  className?: string;
};

export default function Logo({
  href = "/",
  size = 28,
  withText = true,
  className = "",
}: Props) {
  // SVG は Next/Image 経由でもOK（最適化はスキップされますが、SWR は付与されます）
  // width は高さに対して横長比を少し広めに（ここでは × 2.8）
  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/brand/regimatch-logo.svg"
        alt="レジマッチ"
        height={size}
        width={Math.round(size * 2.8)}
        priority
      />
      {withText && <span className="sr-only">レジマッチ</span>}
    </Link>
  );
}