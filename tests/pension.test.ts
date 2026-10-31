// 年金・遺族年金・制度の上限の検証テスト。期待値は制度の式から手で計算した値
import assert from "node:assert/strict";
import { test } from "node:test";

import { calcPension, pensionAdjustment, zaishokuTeishiAnnual } from "@/lib/v4/calc/pension";
import { NISA, childAllowanceMonthly } from "@/lib/v4/calc/rules";
import { survivorBenefitForYear, type DeceasedRecord, type SurvivorState } from "@/lib/v4/calc/survivor";
import type { PensionInput } from "@/lib/v4/calc/types";

const MAN = 10000;
const near = (a: number, b: number, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

const pen = (p: Partial<PensionInput>): PensionInput =>
  ({ mode: "auto", category: "kosei", koseiYears: 0, koseiAvgIncome: 0, kokuminMonths: 480, manualMonth: 0, ...p }) as PensionInput;

test("PEN-01 繰上げ・繰下げ: 60歳 −24%、65歳 0、70歳 +42%、75歳 +84%", () => {
  near(pensionAdjustment(60), 0.76, 1e-9);
  assert.equal(pensionAdjustment(65), 1);
  near(pensionAdjustment(70), 1.42, 1e-9);
  near(pensionAdjustment(75), 1.84, 1e-9);
});

test("PEN-02 老齢基礎年金の満額（令和8年度 847,300円）を480か月で", () => {
  const r = calcPension(pen({ category: "kokumin", kokuminMonths: 480 }), 65);
  near(r.basicMonthly, Math.round(847_300 / 12));
});

test("PEN-03 老齢基礎年金は納付月数に比例（240か月で半分）", () => {
  const r = calcPension(pen({ category: "kokumin", kokuminMonths: 240 }), 65);
  near(r.basicMonthly, Math.round(847_300 / 2 / 12));
});

test("PEN-04 報酬比例（平均年収600万・38年）: 50万×5.481/1000×456月 = 年1,249,668円", () => {
  const r = calcPension(pen({ category: "kosei", koseiYears: 38, koseiAvgIncome: 600 * MAN }), 65);
  near(r.koseiMonthly, Math.round(1_249_668 / 12));
});

test("PEN-05 在職老齢年金（令和8年度の支給停止調整額65万）: 基本月額10万＋総報酬月額60万 → (70万−65万)÷2 = 月2.5万の停止", () => {
  // 出典: 厚生労働省「令和8年度の年金額改定」（https://www.mhlw.go.jp/content/12600000/001672868.pdf）
  assert.equal(zaishokuTeishiAnnual(120 * MAN, 720 * MAN, 2026), 30 * MAN);
  assert.equal(zaishokuTeishiAnnual(120 * MAN, 600 * MAN, 2026), 0); // 合計60万が65万以下なら止まらない
  assert.equal(zaishokuTeishiAnnual(120 * MAN, 720 * MAN, 2025), 114 * MAN); // 2025年度は51万: (70万−51万)÷2=9.5万
});

const deceased: DeceasedRecord = { isKosei: true, koseiMonths: 360, avgAnnualIncome: 600 * MAN, inService: true };
const state = (p: Partial<SurvivorState>): SurvivorState => ({
  hasSpouse: true,
  spouseSex: "female",
  spouseAge: 45,
  spouseAgeAtDeath: 45,
  spouseOwnKoseiAnnual: 0,
  childAges: [],
  childAgesAtDeath: [],
  ...p,
});

test("SUR-01 遺族基礎年金（子1人）: 847,300 + 子の加算243,800 = 1,091,100円", () => {
  const r = survivorBenefitForYear(deceased, state({ childAges: [10], childAgesAtDeath: [10] }), 1);
  assert.equal(r.kiso, 1_091_100);
});

test("SUR-02 遺族厚生年金: 報酬比例の3/4（在職中の死亡は300月みなし）", () => {
  // 50万×5.481/1000×360月×3/4 = 739,935円
  const r = survivorBenefitForYear(deceased, state({ childAges: [10], childAgesAtDeath: [10] }), 1);
  near(r.kosei, 739_935, 2);
});

test("SUR-03 65歳前に自分の老齢厚生年金（繰上げ）がある場合は、多い方を選ぶ（差額だけ足す）", () => {
  const r = survivorBenefitForYear(deceased, state({ spouseAge: 62, spouseAgeAtDeath: 60, spouseOwnKoseiAnnual: 300_000 }), 1);
  near(r.kosei, 739_935 - 300_000, 2);
});

test("SUR-04 65歳以上: max(遺族厚生, 遺族厚生×2/3＋自分の老齢厚生×1/2) − 自分の老齢厚生", () => {
  const base = 739_935;
  const own = 300_000;
  const expected = Math.max(base, (base * 2) / 3 + own / 2) - own; // = 439,935
  const r = survivorBenefitForYear(deceased, state({ spouseAge: 70, spouseAgeAtDeath: 60, spouseOwnKoseiAnnual: own }), 1);
  near(r.kosei, expected, 2);
});

test("SUR-05 中高齢寡婦加算（子のない40〜64歳の妻）635,500円", () => {
  const r = survivorBenefitForYear(deceased, state({ spouseAge: 50, spouseAgeAtDeath: 50 }), 1);
  assert.equal(r.chukorei, 635_500);
});

test("NISA-01 年間枠（つみたて120万・成長240万）と生涯枠（1,800万・うち成長1,200万）", () => {
  assert.deepEqual(NISA, { tsumitateYear: 120 * MAN, growthYear: 240 * MAN, lifetime: 1800 * MAN, growthLifetime: 1200 * MAN });
});

test("CHILD-01 児童手当: 3歳未満1.5万、3歳〜高校生1万、第3子以降3万（月額）", () => {
  assert.equal(childAllowanceMonthly(1, 1), 15_000);
  assert.equal(childAllowanceMonthly(10, 2), 10_000);
  assert.equal(childAllowanceMonthly(17, 1), 10_000);
  assert.equal(childAllowanceMonthly(5, 3), 30_000);
  assert.equal(childAllowanceMonthly(18, 1), 0);
});
