import React, { useRef, useState, useEffect } from "react";

export default function Slider({ images = [], height = 256 }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  const max = images.length - 1;

  const scrollToIndex = (i) => {
    if (!ref.current) return;
    const el = ref.current;
    el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
    setIdx(i);
  };

  const prev = () => scrollToIndex(Math.max(0, idx - 1));
  const next = () => scrollToIndex(Math.min(max, idx + 1));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== idx) setIdx(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [idx]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-xl border bg-white"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((src, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center">
            <img src={src} alt={`slide ${i + 1}`} className="w-full" style={{ height }} />
          </div>
        ))}
      </div>

      {max > 0 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-sm">‹</button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-sm">›</button>
          <div className="mt-2 flex justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`w-2.5 h-2.5 rounded-full ${i === idx ? "bg-indigo-600" : "bg-slate-300"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
