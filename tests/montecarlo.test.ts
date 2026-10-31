// モンテカルロ（lib/v4/calc/montecarlo.ts）の検証テスト
// 期待値は montecarlo.ts 冒頭のコメントに書かれた設計（種は固定・振れは対数正規 (1+r)×exp(σz − σ²/2)）から手で出したもの
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PLAN, EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import { MC_RISK, MC_RUNS, runMonteCarlo } from "@/lib/v4/calc/montecarlo";
import { simulate } from "@/lib/v4/calc/simulate";
import type { PlanInput } from "@/lib/v4/calc/types";

const MAN = 10000;
// 35歳・配偶者32歳のサンプル（engine.test.ts と同じ）。生活費月20万で、固定計算では100歳まで足りる
const base: PlanInput = { ...DEFAULT_PLAN, selfBirth: "1991-05-10", spouseBirth: "1994-08-01", curAge: 35, livingM: 20 * MAN };

test("MC-01 乱数の種は固定: 同じ入力なら毎回まったく同じ結果（既定は1,000通り）", () => {
  const a = runMonteCarlo(base, "balanced");
  const b = runMonteCarlo(base, "balanced");
  assert.equal(a.runs, MC_RUNS);
  assert.equal(MC_RUNS, 1000);
  assert.deepEqual(a, b);
});

test("MC-02 振れ幅σ=0なら、全ケースが固定計算と同じ（成功率は資金ショートの有無と一致）", () => {
  // σ=0 → 振れ = exp(0 − 0) − 1 = 0 → 利回りは (1+r)×1 − 1 = r で固定計算と同じ。
  // 金・暗号資産はσが別だが、このサンプルは残高も積立も0なので結果に影響しない
  const saved = MC_RISK.stable.sigma;
  MC_RISK.stable.sigma = 0;
  try {
    // 足りるプラン → 成功率 100%、資金が尽きる年齢なし
    const ok = runMonteCarlo(base, "stable", 50);
    assert.equal(simulate(base).shortfallAge, null);
    assert.equal(ok.successRate, 1);
    assert.equal(ok.worstDepletionAge, null);
    for (const b of ok.bands) {
      assert.ok(Math.abs(b.p10 - b.fixed) < 1 && Math.abs(b.p90 - b.fixed) < 1, `${b.age}歳 p10=${b.p10} p90=${b.p90} fixed=${b.fixed}`);
    }
    // 足りないプラン（月26万）→ 成功率 0%、尽きる年齢は全ケースで固定計算と同じ
    const shortPlan = { ...base, livingM: 26 * MAN };
    const fixedAge = simulate(shortPlan).shortfallAge;
    assert.notEqual(fixedAge, null);
    const ng = runMonteCarlo(shortPlan, "stable", 50);
    assert.equal(ng.successRate, 0);
    assert.equal(ng.fixedShortfallAge, fixedAge);
    assert.equal(ng.worstDepletionAge, fixedAge);
    assert.equal(ng.medianDepletionAge, fixedAge);
  } finally {
    MC_RISK.stable.sigma = saved;
  }
});

test("MC-03 試行回数のぶれ: 1,000通りと4,000通り（同じ種）で成功率の差は5ポイント以内", (t) => {
  // 成功率 p≈0.65 なら、1,000通りの標準誤差は √(0.65×0.35/1000) ≒ 1.5ポイント。
  // 同じ種なので4,000通りの最初の1,000通りは共通 → 差の標準誤差は約1.3ポイント。5ポイントは約4σの緩い上限
  const r1 = runMonteCarlo(base, "balanced", 1000);
  const r4 = runMonteCarlo(base, "balanced", 4000);
  const diff = Math.abs(r1.successRate - r4.successRate) * 100;
  t.diagnostic(`成功率 1,000通り=${(r1.successRate * 100).toFixed(1)}% 4,000通り=${(r4.successRate * 100).toFixed(1)}% 差=${diff.toFixed(1)}ポイント`);
  assert.ok(r1.successRate > 0.05 && r1.successRate < 0.95, "成功率が0%・100%付近だと差が出ないので、中くらいのプランで比べる");
  assert.ok(diff <= 5, `差 ${diff.toFixed(1)} ポイント`);
});

test("MC-04 ボラティリティ・ドラッグ: 中央値は固定計算より少し下（一括投資10年で約7%下）", (t) => {
  // 50歳・収入も生活費も0・NISAに1,000万を置いたまま（積立なし）、現金3,000万（取り崩しでNISAを売らない）
  //   n年後のNISA = 1,000万 × (1.04)^n × Π exp(σz − σ²/2)
  //   Σz の中央値は0 → 中央値 = 固定計算 × exp(−nσ²/2)
  //   σ=0.12（バランス）、n=10（50歳の年〜59歳の年。1年目の行から1年分の運用が入る）
  //   → exp(−10×0.0144/2) = exp(−0.072) = 0.9305 → 固定計算より約6.95%下
  //   1,000通りの中央値の誤差は 1.25×0.12×√10/√1000 ≒ 1.5% なので ±3ポイントで見る
  const plan: PlanInput = {
    ...EMPTY_PLAN,
    curAge: 50,
    selfBirth: "1976-01-01",
    spouseBirth: "",
    useSpousePen: false,
    jobs: [{ name: "勤務先", start: 22, end: 50, inc: 0, raise: 0, sev: 0, sevAge: 50 }],
    cashBal: 3000 * MAN,
    cashRate: 0,
    cashFloor: 0,
    nisaBal: 1000 * MAN,
    nisaSplit: { ...EMPTY_PLAN.nisaSplit, fundBal: 1000 * MAN },
    nisaTsumitateM: 0,
    nisaGrowthM: 0,
  };
  const fixed = simulate(plan).rows.find((r) => r.age === 59)!;
  const mc = runMonteCarlo(plan, "balanced");
  const band = mc.bands.find((b) => b.age === 59)!;
  assert.ok(Math.abs(band.fixed - (fixed.ass.c + fixed.ass.nisa + fixed.ass.toku + fixed.ass.k + fixed.ass.g + fixed.ass.dc)) < 1);
  // 現金は全ケースで同じなので、差はNISAの中央値の分だけ
  const drag = (band.fixed - band.p50) / fixed.ass.nisa;
  t.diagnostic(`59歳 固定=${Math.round(band.fixed)} 中央値=${Math.round(band.p50)} NISA分のドラッグ=${(drag * 100).toFixed(2)}%（理論6.95%）`);
  assert.ok(band.p50 < band.fixed, "中央値は固定計算より下");
  assert.ok(Math.abs(drag - (1 - Math.exp(-0.072))) < 0.03, `ドラッグ ${(drag * 100).toFixed(2)}%`);
  assert.ok(band.p10 < band.p50 && band.p50 < band.p90);

  // ふつうのプラン（積立・取り崩しあり）でも、65歳の中央値は固定計算より下
  const b65 = runMonteCarlo(base, "balanced").bands.find((b) => b.age === 65)!;
  t.diagnostic(`サンプル65歳 固定=${Math.round(b65.fixed)} 中央値=${Math.round(b65.p50)}`);
  assert.ok(b65.p50 < b65.fixed);
});
