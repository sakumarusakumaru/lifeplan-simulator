// 通し検証（THRU）: 代表的な人生設計3ケースを最初から100歳まで走らせ、
// 独立計算（AI②・Python実装）と突き合わせて合意した値を回帰テストとして固定する。
//
// 検証の記録（2026-10-31・ver5.14→ver5.15）
//   - 税＋社会保険: 3ケース全年で独立計算と±2万円以内（T3の譲渡税は売却のグロスアップに織込む定義）。
//     ver5.15（標準報酬月額の等級化）後は最大±706円
//   - 足りなくなる年齢: T1 75歳 / T2 90歳 / T3 78歳、3ケースとも独立計算と一致
//   - 金融資産合計: 全167年が許容差±max(5万円,1%)の内側（最大差4.6万円）
//   - この過程で直したもの: 老人配偶者控除（住民税38万円）のバグ（ver5.14・TAX-14に回帰テスト）、
//     社会保険料の等級丸め（ver5.15・ISSUE-078。料率×年収の近似 → 標準報酬月額の等級表）
// ここの期待値はアプリの実測値（独立計算と許容差内で一致したもの）。将来エンジンを変えて
// この値が動いたら、意図した変更かを通し検証の記録と突き合わせて確認すること。
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PLAN, EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import { simulate } from "@/lib/v4/calc/simulate";
import type { PlanInput } from "@/lib/v4/calc/types";

const MAN = 10000;
const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}（許容 ±${tol}）`);

const base: PlanInput = {
  ...DEFAULT_PLAN,
  ...EMPTY_PLAN,
  baseDate: "2026-01-01",
  infl: 1.5,
  penIndex: 0,
  taxMode: "detailed",
  cashFloor: 200 * MAN,
  cashRate: 0.002,
  drawOrder: "auto",
  childAllowance: true,
  res: [],
  ins: [],
  otherLoans: [],
  kids: [],
  sideJobs: [],
  lifeExpenses: [],
  inheritances: [],
} as PlanInput;

// T1 単身の会社員（30歳→100歳）: 年収420万・昇給1.5%・59歳まで勤務・退職金800万@60・
// 年金自動（厚生38年）・生活費14万/月・家賃7万/月・NISA100万+月3万積立
const T1: PlanInput = {
  ...base,
  selfBirth: "1996-01-01",
  curAge: 30,
  endAge: 100,
  jobs: [{ name: "勤務先", start: 22, end: 60, inc: 420 * MAN, raise: 1.5, sev: 800 * MAN, sevAge: 60, sevMethod: "lump" }],
  selfPension: { mode: "auto", category: "kosei", koseiYears: 38, koseiAvgIncome: 420 * MAN, kokuminMonths: 480, manualMonth: 0 },
  penStartA: 65,
  useSpousePen: false,
  livingM: 14 * MAN,
  specialY: 20 * MAN,
  rentM: 7 * MAN,
  homeOwned: false,
  useHomeLoan: false,
  homeTaxY: 0,
  cashBal: 300 * MAN,
  nisaBal: 100 * MAN,
  nisaCost: 100 * MAN,
  nisaR: 4,
  nisaSplit: { on: true, fundBal: 100 * MAN, fundR: 4, stockBal: 0, stockR: 6, oldBal: 0, oldR: 4 },
  nisaTsumitateM: 3 * MAN,
  nisaGrowthM: 0,
  nisaEndAge: 60,
  nisaOverflowToToku: true,
  tokuBal: 0,
  tokuCost: 0,
  saveTokuM: 0,
  dcBal: 0,
  saveDcM: 0,
  dcEmployerM: 0,
} as PlanInput;

// T2 夫婦と子2人・持ち家（40歳→100歳）: 本人700万・昇給1%・64歳まで・退職金1,000万@65・
// 妻パート100万(3号)・子2016/2019年生まれ全公立・住宅ローン残2,500万1%25年・加給年金あり
const T2: PlanInput = {
  ...base,
  selfBirth: "1986-01-01",
  spouseBirth: "1988-01-01",
  curAge: 40,
  endAge: 100,
  jobs: [{ name: "勤務先", start: 22, end: 65, inc: 700 * MAN, raise: 1, sev: 1000 * MAN, sevAge: 65, sevMethod: "lump" }],
  spouseWork: "work",
  spouseIncY: 100 * MAN,
  spouseIncStart: 38,
  spouseIncEnd: 60,
  selfPension: { mode: "auto", category: "kosei", koseiYears: 43, koseiAvgIncome: 700 * MAN, kokuminMonths: 480, manualMonth: 0 },
  spousePension: { mode: "auto", category: "dependent", koseiYears: 0, koseiAvgIncome: 0, kokuminMonths: 480, manualMonth: 0 },
  penStartA: 65,
  penStartB: 65,
  useSpousePen: true,
  kids: [
    { name: "子1", birth: "2016-01-01", offset: 30, s: { k: "pub", e: "pub", j: "pub", h: "pub", u: "pub", g: "none" }, opt: { ronin: false, dorm: false, send: 0 } },
    { name: "子2", birth: "2019-01-01", offset: 33, s: { k: "pub", e: "pub", j: "pub", h: "pub", u: "pub", g: "none" }, opt: { ronin: false, dorm: false, send: 0 } },
  ],
  jukuM: { pre: 0, e13: 0, e46: 0, jh: 0, hs: 0, ronin: 0 },
  livingM: 24 * MAN,
  specialY: 40 * MAN,
  rentM: 0,
  homeOwned: true,
  homeTaxY: 12 * MAN,
  useHomeLoan: true,
  hlBal: 2500 * MAN,
  hlRate: 1,
  hlTerm: 25,
  hlStart: 35,
  hlDeduct: false,
  cashBal: 600 * MAN,
  nisaBal: 200 * MAN,
  nisaCost: 200 * MAN,
  nisaR: 4,
  nisaSplit: { on: true, fundBal: 200 * MAN, fundR: 4, stockBal: 0, stockR: 6, oldBal: 0, oldR: 4 },
  nisaTsumitateM: 3 * MAN,
  nisaGrowthM: 0,
  nisaEndAge: 65,
  nisaOverflowToToku: true,
  tokuBal: 0,
  tokuCost: 0,
  saveTokuM: 0,
  dcBal: 0,
  saveDcM: 0,
  dcEmployerM: 0,
} as PlanInput;

// T3 年金生活の取り崩し（66歳→100歳）: 年金手入力16万/月・生活費20万/月・家賃6万/月・
// 現金800万・特定口座1,500万（簿価1,000万・3%）
const T3: PlanInput = {
  ...base,
  selfBirth: "1960-01-01",
  curAge: 66,
  endAge: 100,
  jobs: [],
  selfPension: { mode: "manual", category: "kosei", koseiYears: 0, koseiAvgIncome: 0, kokuminMonths: 480, manualMonth: 16 * MAN },
  penStartA: 65,
  useSpousePen: false,
  livingM: 20 * MAN,
  specialY: 30 * MAN,
  rentM: 6 * MAN,
  homeOwned: false,
  useHomeLoan: false,
  homeTaxY: 0,
  cashBal: 800 * MAN,
  nisaBal: 0,
  nisaCost: 0,
  nisaTsumitateM: 0,
  nisaGrowthM: 0,
  tokuBal: 1500 * MAN,
  tokuCost: 1000 * MAN,
  tokuR: 3,
  saveTokuM: 0,
} as PlanInput;

const fin = (r: { ass: { c: number; nisa: number; toku: number } }) => r.ass.c + r.ass.nisa + r.ass.toku;
const taxOf = (r: { taxWage: number; sevTax: number; dcTax: number }) => r.taxWage + r.sevTax + r.dcTax;

test("THRU-01 T1 単身会社員: 75歳で足りなくなる。60歳・65歳の資産と、退職後60〜64歳の社保（国民年金は払わない）", () => {
  const r = simulate(T1);
  assert.equal(r.shortfallAge, 75);
  const a60 = r.rows.find((x) => x.age === 60)!;
  const a62 = r.rows.find((x) => x.age === 62)!;
  const a65 = r.rows.find((x) => x.age === 65)!;
  near(fin(a60), 41_104_480, 1_000);
  near(fin(a65), 25_507_309, 1_000);
  // 60〜64歳は無職・所得0: 国民年金の納付義務は60歳未満までなので、
  // 払うのは国保の均等割（医療5万＋介護2号1.7万）だけ
  near(taxOf(a62), 67_000, 1_000);
  // 65歳から: 年金172.2万に対する国保・介護1号・住民税
  near(taxOf(a65), 153_447, 1_000);
});

test("THRU-02 T2 夫婦・子2人・持ち家: 90歳で足りなくなる。加給年金（65・66歳）と老人配偶者控除（妻70歳〜）が入る", () => {
  const r = simulate(T2);
  assert.equal(r.shortfallAge, 90);
  const a50 = r.rows.find((x) => x.age === 50)!;
  const a65 = r.rows.find((x) => x.age === 65)!;
  const a66 = r.rows.find((x) => x.age === 66)!;
  const a67 = r.rows.find((x) => x.age === 67)!;
  const a71 = r.rows.find((x) => x.age === 71)!;
  const a72 = r.rows.find((x) => x.age === 72)!;
  const a75 = r.rows.find((x) => x.age === 75)!;
  near(fin(a50), 22_315_275, 1_000);
  near(fin(a65), 52_835_132, 2_000);
  near(fin(a75), 39_033_481, 2_000);
  // 加給年金: 本人65・66歳（妻63・64歳）の2年だけ年金に42.37万円が乗る。
  // 67歳は加給が消えて妻の年金（基礎84.73万）が始まる
  near(a66.income + taxOf(a66) - (a67.income + taxOf(a67)), 423_700 - 847_300, 2_000);
  // 老人配偶者控除: 妻が70歳になる72歳から住民税の控除が33万→38万になり、世帯の税が年5,000円下がる
  //   （通し検証で見つけたバグの修正を固定。所得税側48万と調整控除は従来から正しい）
  near(taxOf(a71) - taxOf(a72), 12_600, 1_500);
  near(taxOf(a72), 385_873, 1_000);
});

test("THRU-03 T3 年金取り崩し: 取り崩しは69歳から、特定口座は77歳で尽き、78歳で足りなくなる", () => {
  const r = simulate(T3);
  assert.equal(r.shortfallAge, 78);
  const a68 = r.rows.find((x) => x.age === 68)!;
  const a69 = r.rows.find((x) => x.age === 69)!;
  const a76 = r.rows.find((x) => x.age === 76)!;
  const a77 = r.rows.find((x) => x.age === 77)!;
  assert.equal(Math.round(a68.saleTax), 0); // 68歳までは売らない
  assert.ok(a69.saleTax > 0); // 69歳から取り崩し（売却の譲渡税が出る）
  near(a69.ass.toku, 15_740_688, 2_000);
  near(fin(a76), 3_891_830, 2_000);
  assert.equal(Math.round(a77.ass.toku), 0); // 特定口座は77歳で尽きる
  // 税＋社保（譲渡税除く）は独立計算と全年±2万円以内で一致済み。代表して76歳を固定
  near(taxOf(a76), 189_950, 1_000);
});
