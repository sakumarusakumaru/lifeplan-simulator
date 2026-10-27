// ver4 Lite の結果: ver4 の計算エンジンで試算し、はじめての人向けの数字だけを取り出す（金額は今の価値）
import { toRealValue } from "@/lib/v4/calc/realValue";
import { simulate } from "@/lib/v4/calc/simulate";
import type { YearlyResult } from "@/lib/v4/calc/types";

import { liteToPlan } from "./toPlan";
import type { LiteInput } from "./types";

// 現金・預金と投資（NISA・特定口座・DCなど）の合計。家やローンは入れない
export const finOf = (r: YearlyResult) => r.ass.c + r.ass.nisa + r.ass.toku + r.ass.k + r.ass.g + r.ass.dc;

function run(q: LiteInput) {
  const plan = liteToPlan(q);
  const sim = toRealValue(simulate(plan), plan);
  const at = (age: number) => sim.rows.find((r) => r.age === age) ?? sim.rows[sim.rows.length - 1];
  const last = sim.rows[sim.rows.length - 1];
  return {
    plan,
    rows: sim.rows,
    shortfallAge: sim.shortfallAge,
    retire: finOf(at(Math.max(q.age, q.retireAge))),
    final: last ? finOf(last) : 0,
    peak: Math.max(0, ...sim.rows.map(finOf)),
    nowBalance: sim.rows[0] ? sim.rows[0].income - sim.rows[0].exp : 0,
  };
}

export interface LiteTip {
  label: string;
  shortfallAge: number | null;
  final: number;
  gain: number; // 100歳時点のお金の増え方（今の価値）
}

export function liteResult(q: LiteInput) {
  const base = run(q);
  // 3つの小さな行動で、どれだけ変わるか
  const variants: { label: string; q: LiteInput; ok: boolean }[] = [
    { label: "生活費を月1万円へらす", q: { ...q, livingM: Math.max(0, q.livingM - 1) }, ok: q.livingM >= 1 },
    { label: "積立を月1万円ふやす", q: { ...q, investM: q.investM + 1 }, ok: q.investM + 1 <= 30 },
    { label: "2年長く働く", q: { ...q, retireAge: q.retireAge + 2 }, ok: q.retireAge + 2 <= 75 },
  ];
  const tips: LiteTip[] = variants
    .filter((v) => v.ok)
    .map((v) => {
      const r = run(v.q);
      return { label: v.label, shortfallAge: r.shortfallAge, final: r.final, gain: r.final - base.final };
    });
  return { ...base, tips };
}

export type LiteResult = ReturnType<typeof liteResult>;
