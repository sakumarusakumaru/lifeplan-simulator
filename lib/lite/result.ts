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

// 結果の要約だけ（スマホの下の帯用）
export const liteBase = (q: LiteInput) => run(q);

export interface LiteTip {
  label: string;
  shortfallAge: number | null;
  final: number;
  gain: number; // 100歳時点のお金の増え方（今の価値）
}

// 条件を満たす最小の値を、0.5万円きざみで二分探索する（ok(hi) が偽なら null）
function solve(ok: (x: number) => boolean, hi: number): number | null {
  if (!ok(hi)) return null;
  let lo = 0;
  while (hi - lo > 0.5) {
    const mid = Math.round(((lo + hi) / 2) * 2) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function liteResult(q: LiteInput) {
  const base = run(q);
  // 足りない人: 100歳まで足りるには、毎月の積立をあといくら増やせばよいか（働いている間）
  const needMonthly = base.shortfallAge !== null ? solve((x) => run({ ...q, investM: q.investM + x }).shortfallAge === null, 60) : null;
  // 足りる人: 生活費を月いくらまで増やしても100歳まで足りるか（余裕）
  const room =
    base.shortfallAge === null
      ? (() => {
          const fails = (x: number) => run({ ...q, livingM: q.livingM + x, retireLivingM: q.retireLivingM > 0 ? q.retireLivingM + x : 0 }).shortfallAge !== null;
          const firstFail = solve(fails, 50);
          return firstFail === null ? 50 : Math.max(0, firstFail - 0.5);
        })()
      : null;
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
  return { ...base, tips, needMonthly, room, accuracy: liteAccuracy(q) };
}

export type LiteResult = ReturnType<typeof liteResult>;

// 精度メーター: 必須の14問で60%。任意の項目に答えるほど上がる（「ない」と答えたのも答えたことにする）
export function liteAccuracy(q: LiteInput) {
  const items: { key: string; label: string; w: number; done: boolean }[] = [
    { key: "pension", label: "ねんきん定期便の見込み額", w: 12, done: q.pensionSelf > 0 },
    ...(q.hasSpouse ? [{ key: "pensionSpouse", label: "配偶者の年金の見込み額", w: 6, done: q.pensionSpouse > 0 }] : []),
    { key: "retireLiving", label: "働き終わったあとの生活費", w: 8, done: !!q.ans.retireLiving },
    { key: "dc", label: "iDeCo・企業型DC", w: 5, done: !!q.ans.dc },
    { key: "kidsPlan", label: "子どもの予定", w: 3, done: !!q.ans.kidsPlan },
    ...(q.home === "rent" ? [{ key: "homePlan", label: "家を買う予定", w: 3, done: !!q.ans.homePlan }] : []),
    { key: "events", label: "大きな出費の予定", w: 3, done: !!q.ans.events },
  ];
  const total = items.reduce((a, x) => a + x.w, 0);
  const got = items.filter((x) => x.done).reduce((a, x) => a + x.w, 0);
  const pct = Math.round(60 + (40 * got) / Math.max(1, total));
  const next = items.filter((x) => !x.done).sort((a, b) => b.w - a.w)[0]?.label ?? null;
  return { pct, next };
}
