"use client";

import { useEffect, useRef, useState } from "react";

/** Fades `.reveal` elements in as they scroll into view. Content stays visible if JS is unavailable. */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("in"));
      return;
    }
    root.classList.add("reveal-ready");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
    }, { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
    return () => { observer.disconnect(); root.classList.remove("reveal-ready"); };
  }, []);
  return null;
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / 1200);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);
  return <strong ref={ref}>{shown}</strong>;
}

export function StatsBand({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="stats-band reveal">
      {items.map((item) => <div key={item.label}><CountUp value={item.value} /><span>{item.label}</span></div>)}
    </div>
  );
}
