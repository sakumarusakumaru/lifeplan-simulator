// ver5.11 で直した所のテスト（品質監査の「公開前に必須の修正」）。
// 期待値の出どころ: HL は AI②（アプリのソースを見ずに公的資料から計算した独立検証）の値、
// それ以外は法令の式・設計の決めごとからの手計算（AIの手計算のみ）
import assert from "node:assert/strict";
import { test } from "node:test";

import { liteToPlan } from "@/lib/lite/toPlan";
import { LITE_DEFAULT, type LiteInput } from "@/lib/lite/types";
import { DEFAULT_PLAN } from "@/lib/v4/calc/defaults";
import { amortizeYear } from "@/lib/v4/calc/finance";
import { simulate } from "@/lib/v4/calc/simulate";
import { calcHouseholdTax } from "@/lib/v4/calc/tax";
import type { PlanInput } from "@/lib/v4/calc/types";

const MAN = 10000;
const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}（許容 ±${tol}）`);
const q = (p: Partial<LiteInput>): LiteInput => ({ ...LITE_DEFAULT, ...p });

test("HL-01 住宅ローンは毎月払いの元利均等（ISSUE-001・CASE-09。期待値は独立検証 AI②）", () => {
  // 3,000万・年1%・35年。AI②: 1年後 29,280,477、10年後 22,470,619、1年目の利息 296,709（AI②は月の返済額を円で四捨五入）
  const pay = 84_685.71; // pmt(0.01/12, 420, 3,000万)
  const y1 = amortizeYear(30_000_000, 1, pay);
  near(y1.bal, 29_280_477, 10);
  near(y1.interest, 296_709, 5);
  let b = 30_000_000;
  for (let i = 0; i < 10; i++) b = amortizeYear(b, 1, pay).bal;
  near(b, 22_470_619, 100); // 月の返済額の丸めの差が10年で数十円
});

test("HL-02 35年ローンは35年で返し終わる（以前は36年目に16万円余り残った）", () => {
  const p: PlanInput = { ...DEFAULT_PLAN, selfBirth: "1991-05-10", curAge: 35, useHomeLoan: true, hlBal: 30_000_000, hlRate: 1, hlTerm: 35, hlStart: 35 };
  const r = simulate(p);
  assert.ok(r.rows.find((x) => x.age === 68)!.hlBal > 0); // 34年目の終わり
  assert.equal(Math.round(r.rows.find((x) => x.age === 69)!.hlBal), 0); // 35年目の終わり
  assert.equal(Math.round(r.rows.find((x) => x.age === 70)!.homePay), 0);
});

test("JIGYO-01 個人事業税（ISSUE-004）: (事業所得 − 290万) × 5%", () => {
  // 事業所得665万（青色申告特別控除の前）: (665万 − 290万) × 5% = 187,500
  const t = calcHouseholdTax({
    year: 2026,
    self: { age: 40, wageY: 665 * MAN, workStyle: "self-employed", penY: 0, otherShotokuY: 0, dcSelfContribY: 0, dependentOfSpouse: false },
    spouse: null,
    kidAges: [],
    hlDeductCredit: 0,
  });
  assert.equal(t.jigyozei, 187_500);
  // 290万以下はかからない。会社員にはかからない
  const low = calcHouseholdTax({ year: 2026, self: { age: 40, wageY: 280 * MAN, workStyle: "self-employed", penY: 0, otherShotokuY: 0, dcSelfContribY: 0, dependentOfSpouse: false }, spouse: null, kidAges: [], hlDeductCredit: 0 });
  assert.equal(low.jigyozei, 0);
});

test("LITE-10 Lite の積立のうち、NISAの月30万円を超えた分は特定口座へ（ISSUE-009）", () => {
  const p = liteToPlan(q({ age: 40, income: 1200, investM: 50, retireAge: 65 }));
  assert.equal(p.nisaTsumitateM + p.nisaGrowthM, 300_000);
  assert.equal(p.saveTokuM, 200_000);
  assert.equal(p.saveTokuEndAge, 65);
});

test("LITE-11 Lite の iDeCo・DC に入った年齢（ISSUE-008）: 入れればその年齢、空欄なら 残高÷(掛金×12) 年前と推定", () => {
  assert.equal(liteToPlan(q({ age: 45, dcBal: 500, dcM: 2, dcJoinAge: 30 })).dcJoinAge, 30);
  // 500万 ÷ (2万×12) = 20.8年 → 45 − 20.8 = 24.2 → 24歳
  assert.equal(liteToPlan(q({ age: 45, dcBal: 500, dcM: 2 })).dcJoinAge, 24);
});

test("SUR-11 遺族厚生年金の加入月数は、厚生年金の加入年数から亡くなったあとの勤務を引いて数える（ISSUE-007）", () => {
  // サンプル: 勤務先30〜60歳、厚生年金の加入38年（22〜60歳）、平均年収600万。50歳（在職中）で死亡
  //   加入月数 = 38年×12 − (60−50)×12 = 336月（以前は勤務先の入社30歳から数えて240月 → 300月みなし）
  //   遺族厚生年金 = 50万 × 5.481/1000 × 336 × 3/4 = 690,606円（改定率をかける前）
  const base: PlanInput = { ...DEFAULT_PLAN, selfBirth: "1991-05-10", spouseBirth: "1994-08-01", curAge: 35, penIndex: 0 };
  const d = simulate({ ...base, risk: { ...base.risk, who: "self", deathAge: 50 } }, { death: true });
  const row = d.rows.find((x) => x.dead && x.survKosei > 0)!;
  near(row.survKosei, 690_606, 2);
});
