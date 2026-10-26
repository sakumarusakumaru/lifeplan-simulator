"use client";

import { useMemo } from "react";

import { toRealValue } from "@/lib/v4/calc/realValue";
import { simulate, type SimulateOptions } from "@/lib/v4/calc/simulate";
import type { PlanInput, SimulationSummary } from "@/lib/v4/calc/types";
import { useUiStore } from "@/store/v4/ui-store";

// 表示用のシミュレーション結果。「今の価値で表示」がオンなら物価で割り戻す
export function useDisplayConverter() {
  const real = useUiStore((s) => s.realValue);
  return useMemo(
    () => ({
      real,
      convert: (r: SimulationSummary, plan: PlanInput) => (real ? toRealValue(r, plan) : r),
    }),
    [real],
  );
}

export function useSimResult(plan: PlanInput, opts?: SimulateOptions): SimulationSummary {
  const real = useUiStore((s) => s.realValue);
  const death = opts?.death;
  const extra = opts?.extraInsurance;
  return useMemo(() => {
    const r = simulate(plan, { death, extraInsurance: extra });
    return real ? toRealValue(r, plan) : r;
  }, [plan, real, death, extra]);
}
