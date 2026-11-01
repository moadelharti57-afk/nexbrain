"use client";

import { useEffect, useState } from "react";

/** Compteur animé (respecte « réduire les animations »). */
export function CountUp({ value, durationMs = 700 }: { value: number; durationMs?: number }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return <span className="tabular-nums">{n}</span>;
}
