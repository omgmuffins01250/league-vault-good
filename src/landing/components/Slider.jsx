import { useRef, useState, useEffect } from "react";

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
      <div className="vault-card rounded-2xl overflow-hidden">
        <div
          ref={ref}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {images.map((src, i) => (
            <div key={i} className="w-full flex-shrink-0 snap-center">
              <img
                src={src}
                alt={`slide ${i + 1}`}
                className="w-full object-cover"
                style={{ height }}
              />
            </div>
          ))}
        </div>
      </div>

      {max > 0 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 btn btn-sm btn-keycard"
            aria-label="Previous screenshot"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-sm btn-keycard"
            aria-label="Next screenshot"
          >
            ›
          </button>
          <div className="mt-3 flex justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === idx ? "bg-amber-400" : "bg-slate-500/60"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
