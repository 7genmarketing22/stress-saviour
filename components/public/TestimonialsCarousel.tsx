"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Testimonial {
  quote: string;
  name: string;
  city: string;
  rating: number;
  role?: string;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  autoPlayMs?: number;
}

const AVATAR_COLORS = [
  "bg-brand-50 text-brand-600",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
];

export function TestimonialsCarousel({
  testimonials,
  autoPlayMs = 4500,
}: TestimonialsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePerView = () => {
      if (window.innerWidth < 640) setPerView(1);
      else if (window.innerWidth < 1024) setPerView(2);
      else setPerView(3);
    };
    updatePerView();
    window.addEventListener("resize", updatePerView);
    return () => window.removeEventListener("resize", updatePerView);
  }, []);

  const pageCount = Math.max(1, testimonials.length - perView + 1);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(((index % pageCount) + pageCount) % pageCount);
    },
    [pageCount]
  );

  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (paused || pageCount <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % pageCount);
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [paused, pageCount, autoPlayMs]);

  useEffect(() => {
    if (activeIndex > pageCount - 1) setActiveIndex(0);
  }, [pageCount, activeIndex]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div ref={containerRef} className="overflow-hidden px-1 py-2">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{
            transform: `translateX(-${activeIndex * (100 / perView)}%)`,
          }}
        >
          {testimonials.map((t, i) => (
            <div
              key={`${t.name}-${i}`}
              className="shrink-0 px-3"
              style={{ width: `${100 / perView}%` }}
            >
              <figure className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-100 hover:shadow-lg">
                <Quote className="h-7 w-7 text-brand-100" />
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      AVATAR_COLORS[i % AVATAR_COLORS.length]
                    )}
                  >
                    {t.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.role ? `${t.role} · ` : ""}
                      {t.city}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous reviews"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-brand-200 hover:text-brand-600"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to review group ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === activeIndex ? "w-6 bg-brand-500" : "w-2 bg-slate-300 hover:bg-slate-400"
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="Next reviews"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-brand-200 hover:text-brand-600"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
