import Image from "next/image";
import { ReactNode } from "react";

type Props = {
  id?: string;
  imageSrc: string;
  imageAlt?: string;
  children: ReactNode;

  // 見た目調整
  minHeightClassName?: string; // 例: "min-h-[70vh]"
  overlayClassName?: string;   // 例: "bg-black/50"
  contentClassName?: string;   // 例: "py-20"
};

export function BgSection({
  id,
  imageSrc,
  imageAlt = "",
  children,
  minHeightClassName = "min-h-[60vh]",
  overlayClassName = "bg-black/55",
  contentClassName = "py-16 md:py-24",
}: Props) {
  return (
    <section id={id} className={`relative overflow-hidden ${minHeightClassName}`}>
      {/* Background image */}
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        priority={id === "hero"}
        className="object-cover"
      />

      {/* Overlay (暗幕) */}
      <div className={`absolute inset-0 ${overlayClassName}`} />

      {/* Optional gradient (雰囲気出る) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/55" />

      {/* Content */}
      <div className={`relative ${contentClassName}`}>
        <div className="mx-auto w-full max-w-6xl px-4">
          {children}
        </div>
      </div>
    </section>
  );
}