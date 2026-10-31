// 住宅ローンの新しい計算（ミックスローン・元金均等・固定期間・繰上返済）のテスト。
// 期待値の出どころ: HL-03 は元金均等の定義式からの手計算、HL-04 は独立した公開の計算例
// （All About「繰上げ返済の2タイプ」: 3,000万・2.5%・35年・元利均等、10年後に300万を一部繰上返済
//   → 期間短縮型は49回短く・利息約230万円減、返済額軽減型は月約1.3万円減・利息約103万円減）
import assert from "node:assert/strict";
import { test } from "node:test";

import { schedulePart, scheduleLoans } from "@/lib/v4/calc/homeLoan";
import { DEFAULT_PLAN } from "@/lib/v4/calc/defaults";
import { simulate } from "@/lib/v4/calc/simulate";
import type { HomeLoanPart, PlanInput } from "@/lib/v4/calc/types";

const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}（許容 ±${tol}）`);
const part = (p: Partial<HomeLoanPart>): HomeLoanPart =>
  ({ label: "L", bal: 30_000_000, years: 35, rate: 1, rateType: "variable", method: "annuity", rule5y: true, ...p });

test("HL-03 元金均等: 毎月の元金は 3,000万÷420回 = 71,428.57円。最初の月の返済は 71,428.57 + 3,000万×1%÷12 = 96,428.57円", () => {
  const r = schedulePart(part({ method: "principal" }), 35, [], 0);
  near(r.summary.firstMonthly, 96_428.57, 1);
  // 1年目の年末残高 = 3,000万 − 71,428.57×12 = 29,142,857円
  near(r.years.get(35)!.bal, 29_142_857, 10);
  // 1年目の利息 = Σ 残高×1%÷12 = (12×3,000万 − 71,428.57×(0+1+…+11))×1%÷12 = 296,071円
  near(r.years.get(35)!.interest, 296_071, 10);
  // 35年で返し終わる
  assert.equal(r.summary.payoffAge, 35 + 34);
});

test("HL-04 一部繰上返済: 期間短縮型は返し終わりが約4年早く、利息の減りは返済額軽減型より大きい（独立の計算例と照合）", () => {
  // 3,000万・2.5%・35年・元利均等（固定とみなす）。10年後（45歳のはじめ）に300万を繰上返済
  const base = part({ rate: 2.5, rateType: "fixed" });
  const none = schedulePart(base, 35, [], 0);
  const shorten = schedulePart(base, 35, [{ age: 45, amount: 3_000_000, kind: "shorten" }], 0);
  const reduce = schedulePart(base, 35, [{ age: 45, amount: 3_000_000, kind: "reduce" }], 0);
  // 公開の計算例: 期間短縮49回（約4年1か月）・利息約230万円減／返済額軽減 月約1.3万円減・利息約103万円減
  // 年単位のエンジンなので、返し終わる年齢は4年早い（69歳→65歳）
  assert.equal(none.summary.payoffAge, 69);
  assert.equal(shorten.summary.payoffAge, 65);
  near(none.summary.totalInterest - shorten.summary.totalInterest, 2_300_000, 150_000);
  near(none.summary.totalInterest - reduce.summary.totalInterest, 1_030_000, 100_000);
  // 返済額軽減型は返し終わる時期が変わらず、翌年の毎月の返済が約1.3万円減る
  assert.equal(reduce.summary.payoffAge, 69);
  const payBefore = none.years.get(45)!.pay / 12;
  const payAfter = reduce.years.get(45)!.pay / 12;
  near(payBefore - payAfter, 13_000, 1_500);
});

test("HL-05 全額繰上返済（一括返済）: その年のはじめに残高が0になり、以後の返済はない", () => {
  const r = schedulePart(part({ rate: 1, rateType: "fixed" }), 35, [{ age: 50, amount: 0, kind: "full" }], 0);
  const y = r.years.get(50)!;
  assert.equal(y.bal, 0);
  assert.equal(y.pay, 0); // 毎月の返済はなく、繰上返済だけ
  assert.ok(y.prepay > 10_000_000); // 残高をまとめて返す
  assert.equal(r.years.get(51), undefined);
});

test("HL-06 当初固定: 固定が終わる年に、残りの期間と新しい金利で毎月の返済額を計算し直す", () => {
  // 0.5%で10年固定 → その後1.5%。10年後に返済額が上がる
  const p = part({ rate: 0.5, rateType: "fixedPeriod", fixedUntilAge: 45, rateAfter: 1.5 });
  const r = schedulePart(p, 35, [], 0);
  const before = r.years.get(44)!.pay / 12;
  const after = r.years.get(45)!.pay / 12;
  assert.ok(after > before + 5_000, `${before} → ${after}`);
  assert.equal(r.summary.payoffAge, 69); // 期間は35年のまま
});

test("HL-07 ミックスローン: 2本の合計が simulate の住宅ローンに入る（変動2,000万＋全期間固定1,000万）", () => {
  const plan: PlanInput = {
    ...DEFAULT_PLAN,
    selfBirth: "1991-05-10",
    curAge: 35,
    useHomeLoan: true,
    hlStart: 35,
    hlBal: 30_000_000,
    hlRate: 1,
    hlTerm: 35,
    hlParts: [
      part({ bal: 20_000_000, rate: 0.6, rateType: "variable" }),
      part({ bal: 10_000_000, rate: 1.8, rateType: "fixed" }),
    ],
  };
  const sched = scheduleLoans(plan);
  const one = schedulePart(plan.hlParts![0], 35, [], 0);
  const two = schedulePart(plan.hlParts![1], 35, [], 1);
  near(sched.byAge.get(40)!.bal, one.years.get(40)!.bal + two.years.get(40)!.bal, 1);
  // simulate の残高・返済も同じ
  const row = simulate(plan).rows.find((x) => x.age === 40)!;
  near(row.hlBal, sched.byAge.get(40)!.bal, 1);
  near(row.homePay, sched.byAge.get(40)!.pay, 1);
});

test("HL-08 繰上返済は simulate でその年の住居費（支出）になり、預金から出る", () => {
  const base: PlanInput = {
    ...DEFAULT_PLAN,
    selfBirth: "1991-05-10",
    curAge: 35,
    useHomeLoan: true,
    hlStart: 35,
    hlBal: 30_000_000,
    hlRate: 1,
    hlTerm: 35,
  };
  const withPrepay: PlanInput = { ...base, hlPrepays: [{ age: 40, amount: 2_000_000, kind: "shorten" }] };
  const r0 = simulate(base).rows.find((x) => x.age === 40)!;
  const r1 = simulate(withPrepay).rows.find((x) => x.age === 40)!;
  near(r1.homePay - r0.homePay, 2_000_000, 1_000); // 支出に乗る
  assert.equal(Math.round(r1.hlPrepay ?? 0), 2_000_000);
  assert.ok(r1.hlBal < r0.hlBal - 1_900_000); // 残高が減る
});
