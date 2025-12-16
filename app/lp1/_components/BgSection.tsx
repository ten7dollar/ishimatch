import Image from "next/image";
import { ReactNode } from "react";

type OverlayStrength = "none" | "soft" | "medium" | "strong";
type Fit = "cover" | "contain";

type Props = {
  id?: string;

  pcSrc: string;
  spSrc?: string;
  alt?: string;

  children: ReactNode;

  minHeightClassName?: string;
  contentClassName?: string;

  overlayStrength?: OverlayStrength;
  withSeparator?: boolean;

  // 追加：画像の見え方を調整
  fit?: Fit; // default cover
  position?: string; // default "center" (例: "top", "center", "bottom")
  scaleClassName?: string; // 例: "scale-[0.96]" で少しズームアウト
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
  fit = "cover",
  position = "center",
  scaleClassName = "scale-[0.9]", // ほんの少しズームアウト（見切れ緩和）
}: Props) {
  const mobileSrc = spSrc ?? pcSrc;
  const ov = overlayClass(overlayStrength);

  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  const posClass =
    position === "top"
      ? "object-top"
      : position === "bottom"
      ? "object-bottom"
      : "object-center";

  return (
    <section id={id} className="bg-white">
      <div className={`relative overflow-hidden ${minHeightClassName}`}>
        <Image
          src={mobileSrc}
          alt={alt}
          fill
          priority={id === "hero"}
          className={`md:hidden ${fitClass} ${posClass} ${scaleClassName}`}
        />
        <Image
          src={pcSrc}
          alt={alt}
          fill
          priority={id === "hero"}
          className={`hidden md:block ${fitClass} ${posClass} ${scaleClassName}`}
        />

        {ov ? <div className={`absolute inset-0 ${ov}`} /> : null}

        <div className={`relative ${contentClassName}`}>
          <div className="mx-auto w-full max-w-6xl px-4">{children}</div>
        </div>
      </div>

      {withSeparator ? <div className="h-10 bg-white md:h-14" /> : null}
    </section>
  );
}