"use client";

import Image from "next/image";

export function ScreenCarousel({ images }: { images: string[] }) {
  const id = "lp1-carousel";

  const scrollToIndex = (idx: number) => {
    const root = document.getElementById(id);
    if (!root) return;
    const container = root.querySelector<HTMLDivElement>("[data-scroll]");
    if (!container) return;

    const child = container.children.item(idx) as HTMLElement | null;
    if (!child) return;

    container.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  };

  const scrollByPage = (dir: -1 | 1) => {
    const root = document.getElementById(id);
    if (!root) return;
    const container = root.querySelector<HTMLDivElement>("[data-scroll]");
    if (!container) return;

    const w = container.clientWidth;
    container.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  return (
    <div id={id} className="relative">
      {/* 左右ボタン（PCのみ） */}
      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border bg-white/90 p-2 shadow-sm md:block"
        aria-label="prev"
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => scrollByPage(1)}
        className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border bg-white/90 p-2 shadow-sm md:block"
        aria-label="next"
      >
        →
      </button>

      {/* スクロール本体 */}
      <div
        data-scroll
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth rounded-2xl border bg-white p-4"
        style={{ WebkitOverflowScrolling: "touch" as any }}
      >
        {images.map((src) => (
          <div
            key={src}
            className="relative w-[85%] flex-none snap-center md:w-[70%]"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-100">
              <Image src={src} alt="Screenshot" fill className="object-cover" />
            </div>
          </div>
        ))}
      </div>

      {/* ドット */}
      <div className="mt-4 flex justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            className="h-2 w-2 rounded-full bg-slate-300 hover:bg-slate-400"
            aria-label={`go-${i}`}
          />
        ))}
      </div>
    </div>
  );
}