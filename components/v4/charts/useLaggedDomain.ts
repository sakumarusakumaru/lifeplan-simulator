"use client";

import { useEffect, useRef, useState } from "react";

// グラフの縦軸を「一拍おいて、なめらかに」動かす。
// 入力を変えると線は先に（いまの目盛りのまま）動き、そのあと目盛りが伸び縮みして元の比率に戻る。
// 目盛りが一瞬で切り替わると、増えたのか減ったのかが分からなくなるため。
//   holdMs: 線のアニメーションを待つ時間 / tweenMs: 目盛りを動かす時間
export function useLaggedDomain(target: [number, number], holdMs = 450, tweenMs = 400): [number, number] {
  const [shown, setShown] = useState<[number, number]>(target);
  const shownRef = useRef<[number, number]>(target);
  const first = useRef(true);
  const [lo, hi] = target;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      shownRef.current = [lo, hi];
      setShown([lo, hi]);
      return;
    }
    if (shownRef.current[0] === lo && shownRef.current[1] === hi) return;
    let raf = 0;
    const from = shownRef.current;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / tweenMs);
        const e = 1 - Math.pow(1 - k, 3); // ease-out
        const cur: [number, number] = [from[0] + (lo - from[0]) * e, from[1] + (hi - from[1]) * e];
        shownRef.current = cur;
        setShown(cur);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, holdMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [lo, hi, holdMs, tweenMs]);

  return shown;
}

// 目盛りがきりのよい数になる範囲（0は必ず含める）
export function niceDomain(lo: number, hi: number): [number, number] {
  const l = Math.min(0, lo);
  const h = Math.max(0, hi);
  const span = Math.max(h - l, 1_000_000);
  const step = Math.pow(10, Math.floor(Math.log10(span / 4)));
  const unit = [1, 2, 2.5, 5, 10].map((m) => m * step).find((u) => span / u <= 5) ?? step * 10;
  return [Math.floor(l / unit) * unit, Math.ceil(h / unit) * unit];
}
