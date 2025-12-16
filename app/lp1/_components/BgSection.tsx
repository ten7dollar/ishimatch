import Image from "next/image";
import { ReactNode } from "react";

type Props = {
  id?: string;

  // PC/SPで背景画像を分ける
  pcSrc: string;
  spSrc?: string; // なければ pcSrc を使う
  alt?: string;

  children: ReactNode;

  // 見た目調整
  minHeightClassName?: string; // 例: "min-h-[70vh]"
  overlayClassName?: string;   // 例: "bg-black/50"
  contentClassName?: string;   // 例: "py-20"

  // 任意（将来レイアウト反転などで使える）
  reverse?: boolean;
};

export function BgSection({
  id,
  pcSrc,
  spSrc,
  alt = "",
  children,
  minHeightClassName = "min-h-[60vh]",
  overlayClassName = "bg-black/55",
  contentClassName = "py-16 md:py-24",
  reverse = false,
}: Props) {
  const mobileSrc = spSrc ?? pcSrc;

  return (
    <section
      id={id}
      className={`relative overflow-hidden ${minHeightClassName}`}
      data-reverse={reverse ? "true" : "false"}
    >
      {/* SP背景 */}
      <Image
        src={mobileSrc}
        alt={alt}
        fill
        priority={id === "hero"}
        className="object-cover md:hidden"
      />

      {/* PC背景 */}
      <Image
        src={pcSrc}
        alt={alt}
        fill
        priority={id === "hero"}
        className="hidden object-cover md:block"
      />

      {/* Overlay */}
      <div className={`absolute inset-0 ${overlayClassName}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/55" />

      {/* Content */}
      <div className={`relative ${contentClassName}`}>
        <div className="mx-auto w-full max-w-6xl px-4">{children}</div>
      </div>
    </section>
  );
}