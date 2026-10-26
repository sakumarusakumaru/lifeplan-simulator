// モンテカルロ・シミュレーション（運用の振れ幅）
//
// 毎年の利回りを「入力した想定利回り × その年の振れ」にして1,000通り計算し、
// 最後まで資金ショートしない確率と、金融資産の良い／中央／悪いケースを出す。
//   - 振れは対数正規: (1 + 利回り) × exp(σz − σ²/2)。平均は入力どおりで、
//     値動きによる複利の目減り（ボラティリティ・ドラッグ）で中央値は固定計算より少し下に出る
//   - NISA・特定口座・DC は同じ市場の振れ（z）を共有。金・暗号資産は別々に振れる
//   - 乱数の種は固定なので、同じ入力なら毎回同じ結果
//   - 物価・金利・賃金は固定のまま（振れるのは運用利回りだけ）
import { simulate } from "./simulate";
import type { PlanInput } from "./types";

export type McRisk = "stable" | "balanced" | "aggressive";

export const MC_RISK: Record<McRisk, { label: string; sigma: number; note: string }> = {
  stable: { label: "安定", sigma: 0.06, note: "値動き 年±6%前後。債券中心（株式2〜3割）" },
  balanced: { label: "バランス", sigma: 0.12, note: "値動き 年±12%前後。株式5〜6割（バランスファンド等）" },
  aggressive: { label: "積極", sigma: 0.18, note: "値動き 年±18%前後。株式100%（全世界株・S&P500等）" },
};

const GOLD_SIGMA = 0.15;
const CRYPTO_SIGMA = 0.6;
export const MC_RUNS = 1000;
export const MC_SEED = 20261026;

// 乱数（mulberry32）と正規乱数（Box-Muller）
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalGen(rand: () => number) {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

const shock = (sigma: number, z: number) => Math.exp(sigma * z - (sigma * sigma) / 2) - 1;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

export interface McBand {
  age: number;
  p10: number; // 悪いケース（下位10%）
  p50: number; // 中央値
  p90: number; // 良いケース（上位10%）
  fixed: number; // 固定利回りの計算
}

export interface MonteCarloResult {
  runs: number;
  successRate: number;          // 最後まで資金ショートしない割合（0〜1）
  fixedShortfallAge: number | null;
  worstDepletionAge: number | null; // 悪い方から10%のケースで資金が尽きる年齢（null=尽きない）
  medianDepletionAge: number | null;
  bands: McBand[];              // 金融資産（現金＋運用資産）の分布
}

const financial = (a: { c: number; nisa: number; toku: number; k: number; g: number; dc: number }) =>
  a.c + a.nisa + a.toku + a.k + a.g + a.dc;

export function runMonteCarlo(plan: PlanInput, risk: McRisk, runs = MC_RUNS): MonteCarloResult {
  const years = Math.max(1, plan.endAge - plan.curAge + 1);
  const sigma = MC_RISK[risk].sigma;
  const rand = mulberry32(MC_SEED);
  const norm = normalGen(rand);

  const fixed = simulate(plan);
  const perAge: number[][] = Array.from({ length: years }, () => []);
  const depletion: number[] = [];
  let success = 0;

  for (let k = 0; k < runs; k++) {
    const sec: number[] = [];
    const gold: number[] = [];
    const crypto: number[] = [];
    for (let t = 0; t < years; t++) {
      sec.push(shock(sigma, norm()));
      gold.push(shock(GOLD_SIGMA, norm()));
      crypto.push(shock(CRYPTO_SIGMA, norm()));
    }
    const r = simulate(plan, { returns: { sec, gold, crypto } });
    if (r.shortfallAge === null) success += 1;
    depletion.push(r.shortfallAge ?? Number.POSITIVE_INFINITY);
    for (let t = 0; t < r.rows.length && t < years; t++) perAge[t].push(financial(r.rows[t].ass));
  }

  const bands: McBand[] = perAge.map((vals, t) => {
    const sorted = [...vals].sort((a, b) => a - b);
    const row = fixed.rows[t];
    return {
      age: plan.curAge + t,
      p10: percentile(sorted, 0.1),
      p50: percentile(sorted, 0.5),
      p90: percentile(sorted, 0.9),
      fixed: row ? financial(row.ass) : 0,
    };
  });

  depletion.sort((a, b) => a - b);
  const w = percentile(depletion, 0.1);
  const m = percentile(depletion, 0.5);
  return {
    runs,
    successRate: success / runs,
    fixedShortfallAge: fixed.shortfallAge,
    worstDepletionAge: Number.isFinite(w) ? w : null,
    medianDepletionAge: Number.isFinite(m) ? m : null,
    bands,
  };
}
