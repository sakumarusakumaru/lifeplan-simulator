// 「今のお金の価値」への換算。
// 将来の金額を、物価上昇率で今の価値に割り戻す: 金額 ÷ (1 + 物価上昇率)^(経過年数)
// 計算エンジンは名目額のまま動かし、表示の直前で換算する。
import type { PlanInput, SimulationSummary, YearlyResult } from "./types";

export function deflator(plan: Pick<PlanInput, "infl" | "curAge">, age: number): number {
  return Math.pow(1 + plan.infl / 100, Math.max(0, age - plan.curAge));
}

// 数値はすべて金額として割り戻す（age だけは年齢なのでそのまま）
function scale<T>(v: T, f: number): T {
  if (typeof v === "number") return (v / f) as T;
  if (Array.isArray(v)) return v.map((x) => scale(x, f)) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      out[k] = k === "age" ? x : scale(x, f);
    }
    return out as T;
  }
  return v;
}

export function toRealValue(
  summary: SimulationSummary,
  plan: Pick<PlanInput, "infl" | "curAge">,
): SimulationSummary {
  const rows: YearlyResult[] = summary.rows.map((r) => scale(r, deflator(plan, r.age)));
  return {
    ...summary,
    rows,
    finalNetWorth: rows.length ? rows[rows.length - 1].nw : 0,
    minCash: rows.length ? Math.min(...rows.map((r) => r.ass.c)) : 0,
    maxEdu: rows.length ? Math.max(...rows.map((r) => r.edu)) : 0,
    totalHome: rows.reduce((a, r) => a + r.home, 0),
  };
}
