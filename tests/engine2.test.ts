// 加給年金・遺族年金の要件・相続（非課税枠・二次相続・不動産の評価）・NISA枠・取り崩しの順番の検証テスト
// 期待値は制度の式（またはコードの注記にある設計の決めごと）から手で計算した値。コードを動かした結果は写さない
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PLAN } from "@/lib/v4/calc/defaults";
import { estateBreakdown, planInheritance, propertyEval } from "@/lib/v4/calc/inheritance";
import { isKakyuuApplicable } from "@/lib/v4/calc/pension";
import { simulate } from "@/lib/v4/calc/simulate";
import { survivorBenefitForYear, type DeceasedRecord, type SurvivorState } from "@/lib/v4/calc/survivor";
import type { AssetSnapshot, PensionInput, PlanInput, RealEstate, YearlyResult } from "@/lib/v4/calc/types";

const MAN = 10000;
const near = (a: number, b: number, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);
const CGT = 0.20315; // 譲渡益課税 20.315%（所得税15%＋復興特別所得税0.315%＋住民税5%）

// 収入・税・物価・年金改定をすべて0にした「静かな」プラン（その年の動きを手で追えるようにする）
//   2026年に35歳、配偶者なし、給与なし、生活費は月10万（年120万）、税は簡易計算で税率0
const quiet: PlanInput = {
  ...DEFAULT_PLAN,
  baseDate: "2026-10-31",
  selfBirth: "1991-05-10",
  spouseBirth: "",
  curAge: 35,
  endAge: 40,
  infl: 0,
  penIndex: 0,
  taxMode: "simple",
  taxRate: 0,
  taxRatePen: 0,
  jobs: [],
  sideJobs: [],
  spouseWork: "none",
  spouseIncY: 0,
  kids: [],
  res: [],
  ins: [],
  useHomeLoan: false,
  hlBal: 0,
  homeOwned: false,
  childAllowance: false,
  livingM: 100_000,
  specialY: 0,
  rentM: 0,
  homeTaxY: 0,
  cashBal: 200 * MAN,
  cashFloor: 200 * MAN,
  cashRate: 0,
  nisaBal: 0,
  nisaCost: 0,
  nisaR: 0,
  nisaTsumitateM: 0,
  nisaGrowthM: 0,
  nisaSplit: { on: true, fundBal: 0, fundR: 0, stockBal: 0, stockR: 0, oldBal: 0, oldR: 0 },
  tokuBal: 0,
  tokuCost: 0,
  tokuR: 0,
  saveTokuM: 0,
  cryptoBal: 0,
  cryptoCost: 0,
  cryptoR: 0,
  goldBal: 0,
  goldCost: 0,
  goldR: 0,
  dcBal: 0,
  saveDcM: 0,
  dcEmployerM: 0,
  drawOrder: "auto",
};
const rowOf = (r: ReturnType<typeof simulate>, age: number) => r.rows.find((x) => x.age === age)!;

// ─────────────────────────── 加給年金 ───────────────────────────

// 本人35歳・配偶者32歳（3歳下・第3号）。会社員22〜60歳、年金は2人とも65歳から。税率0・改定0なので penNet = 年金の額面
const penPlan: PlanInput = {
  ...quiet,
  spouseBirth: "1994-08-01",
  endAge: 70,
  cashBal: 100_000 * MAN,
  cashFloor: 0,
  jobs: [{ name: "会社", start: 22, end: 60, inc: 600 * MAN, raise: 0, sev: 0, sevAge: 60 }],
  useSpousePen: true,
  penStartA: 65,
  penStartB: 65,
};
// 本人の老齢年金（65歳から・年額）: 基礎 847,300 ＋ 報酬比例 50万×5.481/1000×456月 = 1,249,668 → 月 round(2,096,968÷12) = 174,747 → 年 2,096,964
const SELF_PEN_Y = 174_747 * 12;
// 本人の老齢厚生年金（年額）: 1,249,668 ÷ 12 = 104,139（割り切れる）→ 年 1,249,668
const SELF_KOSEI_Y = 1_249_668;
// 配偶者の老齢基礎年金（480月）: 847,300 ÷ 12 = 70,608.3 → 月 70,608 → 年 847,296
const SPOUSE_PEN_Y = 70_608 * 12;
const KAKYUU = 243_800 + 179_900; // 令和8年度 配偶者加給年金額＋特別加算 = 423,700円

test("PEN-06 加給年金 423,700円: 本人65歳から、配偶者が65歳になるまで（3歳下 → 本人65〜67歳の3年だけ）", () => {
  const r = simulate(penPlan);
  assert.equal(rowOf(r, 64).penNet, 0);
  // 本人65歳（配偶者62歳）: 本人の年金 ＋ 加給年金
  near(rowOf(r, 65).penNet, SELF_PEN_Y + KAKYUU);
  // 本人67歳（配偶者64歳）: まだ加給年金あり
  near(rowOf(r, 67).penNet, SELF_PEN_Y + KAKYUU);
  // 本人68歳（配偶者65歳）: 加給年金は止まり、配偶者自身の老齢基礎年金が始まる（振替加算は省略の設計）
  near(rowOf(r, 68).penNet, SELF_PEN_Y + SPOUSE_PEN_Y);
});

test("PEN-07 加給年金は、在職老齢年金で老齢厚生年金が全額止まる年だけ止まる（一部停止なら出る）", () => {
  // 年収2,000万で70歳まで在職（物価0なので支給停止調整額は65万のまま）。本人66歳・配偶者63歳の年
  //   停止額（月）=(2,000万÷12 + 104,139 − 650,000)÷2 = 1,106,903 > 104,139 → 老齢厚生年金は全額停止 → 加給年金も停止
  //   残るのは老齢基礎年金: 2,096,964 − 1,249,668 = 847,296
  const full = simulate({ ...penPlan, jobs: [{ ...penPlan.jobs[0], end: 70, inc: 2000 * MAN }] });
  near(rowOf(full, 66).penNet, SELF_PEN_Y - SELF_KOSEI_Y);
  // 年収900万: 停止額（月）=(750,000 + 104,139 − 650,000)÷2 = 102,069.5 → 年 1,224,834（一部停止）→ 加給年金は出る
  //   2,096,964 − 1,224,834 + 423,700 = 1,295,830
  const part = simulate({ ...penPlan, jobs: [{ ...penPlan.jobs[0], end: 70, inc: 900 * MAN }] });
  near(rowOf(part, 66).penNet, SELF_PEN_Y - 1_224_834 + KAKYUU);
});

test("PEN-08 加給年金の要件: 厚生年金20年（240月）以上・受給開始後・配偶者65歳未満・配偶者が20年以上の老齢厚生年金を受けていない", () => {
  const self = (years: number): PensionInput =>
    ({ mode: "auto", category: "kosei", koseiYears: years, koseiAvgIncome: 600 * MAN, kokuminMonths: 480, manualMonth: 0 }) as PensionInput;
  assert.equal(isKakyuuApplicable(self(19), 65, 65, 60), false); // 228月 < 240月
  assert.equal(isKakyuuApplicable(self(20), 65, 65, 60), true); // 240月
  assert.equal(isKakyuuApplicable(self(38), 65, 65, 65), false); // 配偶者が65歳
  assert.equal(isKakyuuApplicable(self(38), 67, 70, 60), false); // 70歳に繰下げ中（老齢厚生年金をまだ受けていない）は出ない
  assert.equal(isKakyuuApplicable(self(38), 70, 70, 63), true);
  // 配偶者が厚生年金20年以上で、老齢厚生年金を繰上げで受けている年は支給停止（2022年4月〜）
  assert.equal(isKakyuuApplicable(self(38), 65, 65, 62, self(20), 60), false);
  // 同じ配偶者でも、まだ受け始めていなければ出る
  assert.equal(isKakyuuApplicable(self(38), 65, 65, 62, self(20), 65), true);
});

// ─────────────────────────── 遺族年金 ───────────────────────────

// 平均年収600万・在職中の死亡（300月みなし）: 遺族厚生年金 = 50万×5.481/1000×360月×3/4 = 739,935円
const deceased: DeceasedRecord = { isKosei: true, koseiMonths: 360, avgAnnualIncome: 600 * MAN, inService: true };
const SURV_KOSEI = 500_000 * (5.481 / 1000) * 360 * 0.75;
const st = (p: Partial<SurvivorState>): SurvivorState => ({
  hasSpouse: true,
  spouseSex: "female",
  spouseAge: 45,
  spouseAgeAtDeath: 45,
  spouseOwnKoseiAnnual: 0,
  childAges: [],
  childAgesAtDeath: [],
  ...p,
});

test("SUR-06 遺族基礎年金の子の要件: 18歳到達年度末まで（コードは17歳以下で近似）", () => {
  // 子が17歳: 847,300 + 243,800 = 1,091,100
  assert.equal(survivorBenefitForYear(deceased, st({ childAges: [17], childAgesAtDeath: [10] }), 1).kiso, 1_091_100);
  // 子が18歳: 年度末を過ぎたとみなして 0
  assert.equal(survivorBenefitForYear(deceased, st({ childAges: [18], childAgesAtDeath: [10] }), 1).kiso, 0);
});

test("SUR-07 子の加算: 1・2人目 各243,800円、3人目以降 各81,300円", () => {
  // 3人: 847,300 + 243,800×2 + 81,300 = 1,416,200
  assert.equal(survivorBenefitForYear(deceased, st({ childAges: [12, 9, 5], childAgesAtDeath: [12, 9, 5] }), 1).kiso, 1_416_200);
  // 4人: 1,416,200 + 81,300 = 1,497,500
  assert.equal(survivorBenefitForYear(deceased, st({ childAges: [12, 9, 5, 2], childAgesAtDeath: [12, 9, 5, 2] }), 1).kiso, 1_497_500);
  // 4人のうち1人が18歳 → 3人分に戻る
  assert.equal(survivorBenefitForYear(deceased, st({ childAges: [18, 15, 11, 8], childAgesAtDeath: [12, 9, 5, 2] }), 1).kiso, 1_416_200);
});

test("SUR-08 配偶者がいない（子が受ける）: 遺族基礎年金847,300円＋2人目から加算", () => {
  // 子2人: 847,300 + 243,800 = 1,091,100、子3人: 1,091,100 + 81,300 = 1,172,400。遺族厚生年金も子が受ける
  const two = survivorBenefitForYear(deceased, st({ hasSpouse: false, childAges: [10, 7], childAgesAtDeath: [10, 7] }), 1);
  assert.equal(two.kiso, 1_091_100);
  near(two.kosei, SURV_KOSEI, 1);
  const three = survivorBenefitForYear(deceased, st({ hasSpouse: false, childAges: [10, 7, 3], childAgesAtDeath: [10, 7, 3] }), 1);
  assert.equal(three.kiso, 1_172_400);
});

test("SUR-09 遺族厚生年金（夫）: 妻の死亡時に55歳以上、支給は60歳から（遺族基礎年金を受ける間は60歳前でも）", () => {
  const husband = (p: Partial<SurvivorState>) => st({ spouseSex: "male", ...p });
  // 死亡時50歳・子なし → 受給権なし（60歳になっても0）
  assert.equal(survivorBenefitForYear(deceased, husband({ spouseAgeAtDeath: 50, spouseAge: 60 }), 1).kosei, 0);
  // 死亡時56歳・子なし → 58歳は支給停止、60歳から 739,935
  assert.equal(survivorBenefitForYear(deceased, husband({ spouseAgeAtDeath: 56, spouseAge: 58 }), 1).kosei, 0);
  near(survivorBenefitForYear(deceased, husband({ spouseAgeAtDeath: 56, spouseAge: 60 }), 1).kosei, SURV_KOSEI, 1);
  // 死亡時45歳・子10歳: 子のある間は遺族厚生年金が出る（夫に受給権がなくても子が受ける。世帯で見ると同じ額）
  near(
    survivorBenefitForYear(deceased, husband({ spouseAgeAtDeath: 45, spouseAge: 46, childAges: [11], childAgesAtDeath: [10] }), 1).kosei,
    SURV_KOSEI,
    1,
  );
  // 同じ夫: 子が18歳になったあとは、60歳になっても0（死亡時55歳未満）
  assert.equal(
    survivorBenefitForYear(deceased, husband({ spouseAgeAtDeath: 45, spouseAge: 60, childAges: [25], childAgesAtDeath: [10] }), 1).kosei,
    0,
  );
});

test("SUR-10 遺族厚生年金（妻）: 夫の死亡時に30歳未満で子がなければ5年の有期給付", () => {
  // 死亡時28歳・子なし: 28〜32歳の5年は出る、33歳から0
  near(survivorBenefitForYear(deceased, st({ spouseAgeAtDeath: 28, spouseAge: 28 }), 1).kosei, SURV_KOSEI, 1);
  near(survivorBenefitForYear(deceased, st({ spouseAgeAtDeath: 28, spouseAge: 32 }), 1).kosei, SURV_KOSEI, 1);
  assert.equal(survivorBenefitForYear(deceased, st({ spouseAgeAtDeath: 28, spouseAge: 33 }), 1).kosei, 0);
  // 死亡時30歳・子なし: 有期にならない（10年後も出る）
  near(survivorBenefitForYear(deceased, st({ spouseAgeAtDeath: 30, spouseAge: 40 }), 1).kosei, SURV_KOSEI, 1);
  // 死亡時28歳でも子がいれば有期にならない（子が成人した後の40歳でも出る）
  near(
    survivorBenefitForYear(deceased, st({ spouseAgeAtDeath: 28, spouseAge: 40, childAges: [15], childAgesAtDeath: [3] }), 1).kosei,
    SURV_KOSEI,
    1,
  );
});

// ─────────────────────────── 相続 ───────────────────────────

// 45歳で亡くなる本人。家・不動産・保険・ローンなし、財産は現金だけ
const inhPlan = (p: Partial<PlanInput> = {}): PlanInput => ({
  ...DEFAULT_PLAN,
  curAge: 45,
  homeOwned: false,
  useHomeLoan: false,
  hlBal: 0,
  res: [],
  ins: [],
  kids: [],
  jobs: [],
  risk: { ...DEFAULT_PLAN.risk, who: "self", deathInsurance: 0, danshin: true },
  inheritSet: { selfSharePct: 100, spouseMode: "legal", smallLand: true },
  ...p,
});
const inhRow = (age: number, a: Partial<AssetSnapshot>) =>
  ({ age, ass: { c: 0, nisa: 0, toku: 0, k: 0, g: 0, dc: 0, ...a }, hlBal: 0, reD: [] }) as unknown as YearlyResult;

test("INH-07 生命保険金・死亡退職金の非課税枠: それぞれ500万×法定相続人", () => {
  // 死亡保険金3,000万、退職金4,000万（30〜60歳の勤務を45歳で死亡 → 15/30 を按分して2,000万）、現金1,000万
  const p = inhPlan({
    risk: { ...DEFAULT_PLAN.risk, who: "self", deathInsurance: 3000 * MAN, danshin: true },
    jobs: [{ name: "会社", start: 30, end: 60, inc: 600 * MAN, raise: 0, sev: 4000 * MAN, sevAge: 60 }],
  });
  const row = inhRow(45, { c: 1000 * MAN });
  // 法定相続人3人（配偶者＋子2人）: 非課税枠 各1,500万 → 保険 3,000−1,500 = 1,500万、退職金 2,000−1,500 = 500万
  //   課税価格 = 1,000 + 1,500 + 500 = 3,000万
  const b3 = estateBreakdown(p, row, 3);
  assert.equal(b3.insuranceGross, 3000 * MAN);
  assert.equal(b3.insurance, 1500 * MAN);
  assert.equal(b3.retirementGross, 2000 * MAN);
  assert.equal(b3.retirement, 500 * MAN);
  assert.equal(b3.total, 3000 * MAN);
  // 法定相続人1人（配偶者だけ）: 非課税枠 各500万 → 2,500 + 1,500 + 1,000 = 5,000万
  assert.equal(estateBreakdown(p, row, 1).total, 5000 * MAN);
  // planInheritance は 配偶者＋子2人 を3人と数える
  assert.equal(planInheritance(p, row, true, 2).breakdown.total, 3000 * MAN);
});

test("INH-08 二次相続（法定相続分）: 配偶者名義の財産＋一次で受け取った分−その税 を、子だけで相続（基礎控除3,000万+600万×子）", () => {
  // 家族の現金1.25億、うち本人名義80% = 1億、配偶者名義 2,500万
  const p = inhPlan({ inheritSet: { selfSharePct: 80, spouseMode: "legal", smallLand: true } });
  const r = planInheritance(p, inhRow(45, { c: 12500 * MAN }), true, 2);
  // 一次: 課税価格1億、基礎控除4,800万 → 5,200万 → 配偶者2,600万: 340万、子1,300万×2: 145万×2 → 総額630万
  //   配偶者は半分を相続し税額軽減で0、子は 315万
  assert.equal(r.breakdown.total, 10000 * MAN);
  near(r.breakdown.spouseOwn, 2500 * MAN);
  assert.equal(r.first.totalTax, 630 * MAN);
  assert.equal(r.first.payable, 315 * MAN);
  // 二次: 2,500万 + 5,000万 − 0 = 7,500万。基礎控除 3,000万+600万×2 = 4,200万 → 3,300万
  //   子1,650万×2: (1,650万×15% − 50万) = 197.5万 ×2 = 395万
  assert.equal(r.secondEstate, 7500 * MAN);
  assert.equal(r.second?.deduction, 4200 * MAN);
  assert.equal(r.second?.payable, 395 * MAN);
  assert.equal(r.total, 710 * MAN);
});

test("INH-09 二次相続（配偶者が全部相続）: 配偶者が一次で払った税を引いた額が二次の財産", () => {
  const p = inhPlan({ inheritSet: { selfSharePct: 100, spouseMode: "all", smallLand: true } });
  const r = planInheritance(p, inhRow(45, { c: 30000 * MAN }), true, 2);
  // 一次: 3億 − 4,800万 = 2億5,200万 → 配偶者1億2,600万: ×40%−1,700万 = 3,340万、子6,300万×2: (×30%−700万)=1,190万×2
  //   総額 5,720万。配偶者が全部 → 軽減 = 5,720万 × 1億6,000万 ÷ 3億 = 30,506,666.7 → 納付 26,693,333
  assert.equal(r.first.totalTax, 5720 * MAN);
  near(r.first.payable, 26_693_333, 1);
  // 二次: 3億 − 26,693,333 = 273,306,667。−4,200万 = 231,306,667 → 子1人 115,653,333.5
  //   ×40% − 1,700万 = 29,261,333.4 → 2人で 58,522,666.8
  near(r.secondEstate, 273_306_667, 1);
  near(r.second?.payable ?? -1, 58_522_667, 2);
});

test("INH-10 不動産の相続税評価（コードの設計: 土地=時価×0.8、建物=取得価格の建物分×0.6×経年減点（下限0.2）、マンション=時価×0.6、貸家建付地×0.82・貸家×0.7）", () => {
  const re = (p: Partial<RealEstate>): RealEstate => ({
    name: "物件",
    rent: 0,
    cost: 0,
    propTax: 0,
    bal: 0,
    rate: 0,
    term: 0,
    start: 0,
    propType: "house",
    structure: "wood",
    builtYear: 2015,
    purchasePrice: 6000 * MAN,
    landRatio: 50,
    currentValueOverride: 0,
    ...p,
  });
  // 木造戸建て 6,000万（土地50%）・築11年（2026年）: 土地 3,000万×0.8 = 2,400万
  //   建物 3,000万×0.6×max(0.2, 1−0.8×11/22) = 1,800万×0.6 = 1,080万 → 3,480万
  const h = propertyEval(re({}), 2026, false, "re-0");
  near(h.land, 2400 * MAN);
  near(h.building, 1080 * MAN);
  near(h.value, 3480 * MAN);
  // 同じ家を貸す: 土地 2,400万×0.82 = 1,968万、建物 1,080万×0.7 = 756万 → 2,724万
  near(propertyEval(re({}), 2026, true, "re-0").value, 2724 * MAN);
  // 築30年: 建物の減点は下限0.2 → 1,800万×0.2 = 360万 → 2,760万
  near(propertyEval(re({ builtYear: 1996 }), 2026, false, "re-0").value, 2760 * MAN);
  // マンション 5,000万・築10年: 時価 5,000万×(1−10×1.5%) = 4,250万 → ×0.6 = 2,550万
  near(propertyEval(re({ propType: "mansion", structure: "rc", purchasePrice: 5000 * MAN, builtYear: 2016 }), 2026, false, "re-0").value, 2550 * MAN);
  // 貸しているマンション: 2,550万のうち土地2割 510万×0.82 = 418.2万、建物8割 2,040万×0.7 = 1,428万 → 1,846.2万
  near(propertyEval(re({ propType: "mansion", structure: "rc", purchasePrice: 5000 * MAN, builtYear: 2016 }), 2026, true, "re-0").value, 18_462_000);
  // 土地（更地・駐車場）5,000万: ×0.8 = 4,000万。貸していても貸家建付地にならない
  near(propertyEval(re({ propType: "land", purchasePrice: 5000 * MAN }), 2026, true, "re-0").value, 4000 * MAN);
});

// ─────────────────────────── NISA ───────────────────────────

test("NISA-02 年間枠（つみたて120万・成長240万）を超えた積立は特定口座へ", () => {
  // つみたて月15万（年180万）・成長月30万（年360万）→ NISAに 120万+240万 = 360万、超えた180万は特定口座
  const r = simulate({ ...quiet, cashBal: 10_000 * MAN, cashFloor: 0, nisaTsumitateM: 150_000, nisaGrowthM: 300_000, nisaOverflowToToku: true });
  const y = rowOf(r, 35);
  assert.equal(y.nisaOverflow, 180 * MAN);
  assert.equal(y.nisaCost, 360 * MAN);
  assert.equal(y.ass.nisa, 360 * MAN);
  assert.equal(y.ass.toku, 180 * MAN);
  // 特定口座に回さない設定なら、超えた分は現金に残る: 1億 − 生活費120万 − NISA360万 = 9,520万
  const r2 = simulate({ ...quiet, cashBal: 10_000 * MAN, cashFloor: 0, nisaTsumitateM: 150_000, nisaGrowthM: 300_000, nisaOverflowToToku: false });
  assert.equal(rowOf(r2, 35).ass.toku, 0);
  assert.equal(rowOf(r2, 35).ass.c, 9520 * MAN);
});

test("NISA-03 生涯枠1,800万（簿価）・うち成長枠1,200万を超えない", () => {
  // つみたて年60万＋成長年240万 = 年300万。35〜39歳の5年で 1,500万（成長枠1,200万に到達）
  //   40〜44歳は成長枠が埋まっているので、つみたて60万だけ（成長の240万は特定口座へ）→ 44歳で 1,800万
  //   45歳は生涯枠が埋まり、300万すべて特定口座へ。特定口座の合計 240万×5 + 300万 = 1,500万
  const r = simulate({ ...quiet, endAge: 46, cashBal: 10_000 * MAN, cashFloor: 0, nisaTsumitateM: 50_000, nisaGrowthM: 200_000, nisaOverflowToToku: true });
  assert.equal(rowOf(r, 39).nisaCost, 1500 * MAN);
  assert.equal(rowOf(r, 40).nisaOverflow, 240 * MAN);
  assert.equal(rowOf(r, 40).nisaCost, 1560 * MAN);
  assert.equal(rowOf(r, 44).nisaCost, 1800 * MAN);
  assert.equal(rowOf(r, 45).nisaOverflow, 300 * MAN);
  assert.equal(rowOf(r, 45).nisaCost, 1800 * MAN);
  assert.equal(rowOf(r, 45).ass.toku, 1500 * MAN);
  assert.ok(r.rows.every((x) => x.nisaCost <= 1800 * MAN));
});

test("NISA-04 売った簿価の分は翌年に生涯枠が戻る（売った年には戻らない）", () => {
  // NISA 1,800万（簿価1,800万・利回り0）で生涯枠いっぱい。現金200万＝下限、つみたて月10万（超過は現金に残す）
  // 35歳: 枠0 → 積立0・超過120万。現金 200−120 = 80万 → 下限まで120万をNISAから売る → 簿価 1,680万
  // 36歳: 前年末の簿価1,680万 → 枠が120万戻る → 120万積立。現金 200−120−120 = −40万 → 240万売る
  //   簿価 (1,680+120) − 1,800×240/1,800 = 1,560万
  const r = simulate({
    ...quiet,
    nisaBal: 1800 * MAN,
    nisaCost: 1800 * MAN,
    nisaTsumitateM: 100_000,
    nisaOverflowToToku: false,
  });
  near(rowOf(r, 35).nisaOverflow, 120 * MAN);
  near(rowOf(r, 35).nisaCost, 1680 * MAN);
  near(rowOf(r, 35).ass.nisa, 1680 * MAN);
  near(rowOf(r, 36).nisaOverflow, 0);
  near(rowOf(r, 36).nisaCost, 1560 * MAN);
  near(rowOf(r, 37).nisaOverflow, 0);
});

// ─────────────────────────── 取り崩しの順番 ───────────────────────────
// どのテストも 35歳（2026年）に 現金200万（＝下限）− 生活費120万 = 80万 → 下限まで 120万の手取りが必要

test("DRAW-01 おすすめの順番: 1円売るのにかかる税（含み益の割合×税率）が小さい順。含み益のない金から売る", () => {
  // 金 1,000万（含み益0 → 0%）、特定口座 1,000万（簿価500万 → 50%×20.315% = 10.16%）、暗号資産 1,000万（簿価500万 → 50%×30% = 15%）
  const r = simulate({
    ...quiet,
    goldBal: 1000 * MAN,
    tokuBal: 1000 * MAN,
    tokuCost: 500 * MAN,
    cryptoBal: 1000 * MAN,
    cryptoCost: 500 * MAN,
    cryptoTaxRate: 30,
  });
  const y = rowOf(r, 35);
  near(y.ass.g, 880 * MAN);
  near(y.ass.toku, 1000 * MAN, 0);
  near(y.ass.k, 1000 * MAN, 0);
  near(y.saleTax, 0);
  near(y.draw, 120 * MAN);
  near(y.ass.c, 200 * MAN); // 下限を下回った分だけ売る
});

test("DRAW-02 売却額 = 必要な手取り ÷ (1 − 含み益割合×税率)", () => {
  // 特定口座 1,000万（簿価500万 → 含み益50%）: 120万 ÷ (1 − 0.5×0.20315) = 1,335,671 を売り、税 135,671
  const gross = 1_200_000 / (1 - 0.5 * CGT);
  const r = simulate({ ...quiet, tokuBal: 1000 * MAN, tokuCost: 500 * MAN, cryptoBal: 1000 * MAN, cryptoCost: 500 * MAN, cryptoTaxRate: 30 });
  const y = rowOf(r, 35);
  near(y.ass.toku, 1000 * MAN - gross);
  near(y.saleTax, gross * 0.5 * CGT);
  near(y.draw, 120 * MAN);
  near(y.ass.k, 1000 * MAN, 0); // 暗号資産（15%）は特定口座（10.16%）より後
  near(y.ass.c, 200 * MAN);
  // 売った割合だけ簿価も減る → 含み益は 50% のまま。含み益にかかる税 = 特定口座 (残高 − 簿価)×20.315%
  //   ＋ 暗号資産（売っていない）含み益500万×30%（2026年は総合課税の税率）
  near(y.latentTax, (1000 * MAN - gross) * 0.5 * CGT + 500 * MAN * 0.3);
});

test("DRAW-03 暗号資産は2028年から分離課税20.315%（予定）→ 順番が毎年入れ替わる", () => {
  // 特定口座（含み益50%）: 0.5×20.315% = 10.16%
  // 暗号資産（簿価600万 → 含み益40%）: 2026・2027年は 0.4×30% = 12% → 特定口座が先
  //                                     2028年は 0.4×20.315% = 8.13% → 暗号資産が先
  const r = simulate({ ...quiet, tokuBal: 1000 * MAN, tokuCost: 500 * MAN, cryptoBal: 1000 * MAN, cryptoCost: 600 * MAN, cryptoTaxRate: 30, cryptoSeparate2028: true });
  const y35 = rowOf(r, 35);
  const y36 = rowOf(r, 36);
  const y37 = rowOf(r, 37); // 2028年
  near(y35.ass.k, 1000 * MAN, 0);
  near(y36.ass.k, 1000 * MAN, 0);
  assert.ok(y36.ass.toku < y35.ass.toku);
  near(y37.ass.toku, y36.ass.toku, 0);
  near(y37.ass.k, 1000 * MAN - 1_200_000 / (1 - 0.4 * CGT));
  near(y37.saleTax, (1_200_000 / (1 - 0.4 * CGT)) * 0.4 * CGT);
});

test("DRAW-04 NISAは最後: 課税口座を売り切ってから、足りない分だけNISAを売る", () => {
  // 特定口座 100万（含み益0）、NISA 1,000万: 特定口座100万を全部売り、残り20万をNISAから（非課税）
  const r = simulate({ ...quiet, tokuBal: 100 * MAN, nisaBal: 1000 * MAN, nisaCost: 1000 * MAN });
  const y = rowOf(r, 35);
  near(y.ass.toku, 0);
  near(y.ass.nisa, 980 * MAN);
  near(y.saleTax, 0);
  near(y.ass.c, 200 * MAN);
});

test("DRAW-05 現金が下限以上なら売らない", () => {
  // 現金500万 − 120万 = 380万 ≥ 下限200万 → 売却0
  const r = simulate({ ...quiet, cashBal: 500 * MAN, tokuBal: 1000 * MAN, tokuCost: 500 * MAN });
  const y = rowOf(r, 35);
  assert.equal(y.draw, 0);
  assert.equal(y.ass.toku, 1000 * MAN);
  assert.equal(y.ass.c, 380 * MAN);
});
