import Image from "next/image";
import { ReactNode } from "react";

type OverlayStrength = "none" | "soft" | "medium" | "strong";

type Props = {
  id?: string;

  pcSrc: string;
  spSrc?: string;
  alt?: string;

  children: ReactNode;

  minHeightClassName?: string;
  contentClassName?: string;

  overlayStrength?: OverlayStrength;
  withSeparator?: boolean; // セクション間に帯（白背景）を入れる
};

function overlayClass(strength: OverlayStrength) {
  switch (strength) {
    case "none":
      return "";
    case "soft":
      return "bg-black/10";
    case "medium":
      return "bg-black/22";
    case "strong":
      return "bg-black/40";
  }
}

export function BgSection({
  id,
  pcSrc,
  spSrc,
  alt = "",
  children,
  minHeightClassName = "min-h-[70vh]",
  contentClassName = "py-16 md:py-24",
  overlayStrength = "none",
  withSeparator = true,
}: Props) {
  const mobileSrc = spSrc ?? pcSrc;
  const ov = overlayClass(overlayStrength);

  return (
    <section id={id} className="bg-white">
      <div className={`relative overflow-hidden ${minHeightClassName}`}>
        {/* Background image (SP/PC) */}
        <Image
          src={mobileSrc}
          alt={alt}
          fill
          priority={id === "hero"}
          className="object-cover md:hidden"
        />
        <Image
          src={pcSrc}
          alt={alt}
          fill
          priority={id === "hero"}
          className="hidden object-cover md:block"
        />

        {/* Optional overlay (薄く) */}
        {ov ? <div className={`absolute inset-0 ${ov}`} /> : null}

        {/* Content */}
        <div className={`relative ${contentClassName}`}>
          <div className="mx-auto w-full max-w-6xl px-4">{children}</div>
        </div>
      </div>

      {/* Separator band */}
      {withSeparator ? <div className="h-10 bg-white md:h-14" /> : null}
    </section>
  );
}