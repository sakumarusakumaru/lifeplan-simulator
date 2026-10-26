"use client";

import { useEffect, useState } from "react";

// スマホ幅（640px未満）かどうか。グラフの吹き出しなどを小さくするのに使う
export function useIsNarrow(maxWidth = 639): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [maxWidth]);
  return narrow;
}
