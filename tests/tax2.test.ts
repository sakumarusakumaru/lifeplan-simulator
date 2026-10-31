// 税の検証テスト その2（住民税・世帯の税・保険料控除・住宅ローン控除・退職所得の重複調整）。
// 期待値は法令・国税庁の資料の式から手で計算した値（コードの出力を写していない）。
// ID は検証チェックリスト（80_outbox/2026_1031_ライフプラン計算の検証チェックリスト_ver1.md）の続き。
//
// 端数処理について
//   法令では、所得税の年税額（復興・防衛特別所得税を含む）は100円未満切捨て、
//   住民税は課税所得を1,000円未満切捨て・所得割を100円未満切捨て。
//   世帯の税の各テストでは「100円未満を切り捨てた値」が法令どおりかを見て、
//   端数処理そのものは TAX-21・TAX-22 で別に確かめる（原因を分けるため）。
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PLAN } from "@/lib/v4/calc/defaults";
import { insuranceDeduction, type DeductKind } from "@/lib/v4/calc/insurance";
import { simulate } from "@/lib/v4/calc/simulate";
import { calcHouseholdTax, type HouseholdTaxInput, type PersonIncome } from "@/lib/v4/calc/tax";
import type { PlanInput } from "@/lib/v4/calc/types";

const MAN = 10000;
const floor100 = (x: number) => Math.floor(x / 100) * 100;

// ── 世帯の例 ──
const employee = (age: number, wageY: number): PersonIncome => ({
  age,
  wageY,
  workStyle: "employee",
  penY: 0,
  otherShotokuY: 0,
  dcSelfContribY: 0,
  dependentOfSpouse: false,
});
// 収入のない配偶者（会社員の健康保険の扶養・第3号）
const noIncomeSpouse = (age: number): PersonIncome => ({ ...employee(age, 0), dependentOfSpouse: true });

// 世帯A: 2026年・会社員40歳・年収600万・配偶者38歳無収入・子なし
const householdA = (over: Partial<HouseholdTaxInput> = {}): HouseholdTaxInput => ({
  year: 2026,
  self: employee(40, 600 * MAN),
  spouse: noIncomeSpouse(38),
  kidAges: [],
  hlDeductCredit: 0,
  ...over,
});
// 世帯A の手計算（共通部分）
//   給与所得控除 600万×20%+44万 = 164万 → 給与所得 436万（=合計所得）
//   社会保険料（年収を月給×12＋賞与（月給×2を年2回）とみなす → 報酬月額37.5万 → 標準報酬月額38万・標準賞与75万×2）
//     厚生年金 34,770×12＋68,625×2 = 554,490 / 健康保険 18,810×12＋37,125×2 = 299,970
//     子ども・子育て支援金 437×12＋862×2 = 6,968 / 雇用保険 600万×0.5% = 30,000
//     介護保険（40歳）3,078×12＋6,075×2 = 49,086 → 計 940,514（TAX-11・12 と同じ内訳）

test("TAX-16 世帯の税（会社員・年収600万・40歳・配偶者無収入・2026年）: 社会保険料と所得税", () => {
  // 所得税: 基礎控除104万（合計所得489万以下・2026年分）、配偶者控除38万
  //   課税所得 4,360,000−1,040,000−940,514−380,000 = 1,999,486 → 1,999,000（1,000円未満切捨て）
  //   算出税額 1,999,000×10%−97,500 = 102,400
  //   復興特別所得税 102,400×2.1% = 2,150（1円未満切捨て）→ 104,550 → 年税額 104,500（100円未満切捨て）
  const r = calcHouseholdTax(householdA());
  assert.equal(r.shahoSelf, 940_514);
  assert.equal(r.shahoSpouse, 0);
  assert.equal(floor100(r.shotokuzeiSelf), 104_500);
  assert.equal(r.shotokuzeiSpouse, 0);
});

test("TAX-17 住民税（世帯A）: 基礎控除43万・配偶者控除33万・税率10%・調整控除・均等割5,000円", () => {
  // 課税総所得 4,360,000−430,000−940,514−330,000 = 2,659,486 → 2,659,000
  // 所得割 2,659,000×10% = 265,900
  // 調整控除（地方税法37条・314条の6）: 人的控除の差 = 基礎5万＋配偶者5万 = 10万
  //   課税総所得200万超 → (10万−(265.9万−200万))×5% はマイナス → 最低の2,500円
  // 所得割 265,900−2,500 = 263,400、均等割 5,000 → 268,400
  // 配偶者は合計所得0（45万以下）なので均等割も非課税 → 0
  const r = calcHouseholdTax(householdA());
  assert.equal(floor100(r.juminSelf), 268_400);
  assert.equal(r.juminSpouse, 0);
});

test("TAX-18 住民税（合計所得2,500万超）: 基礎控除0・調整控除なし、所得割10%＋均等割", () => {
  // 自営業45歳・単身。事業所得 2,765万−青色申告特別控除65万 = 2,700万
  // 社会保険（コードの近似）: 国民年金 17,920×12 = 215,040、国保は上限 医療・支援93万＋介護17万 → 計 1,315,040
  // 住民税: 合計所得2,500万超 → 基礎控除0、調整控除なし
  //   課税 27,000,000−1,315,040 = 25,684,960 → 25,684,000 → 2,568,400 ＋均等割5,000 = 2,573,400
  // 所得税: 基礎控除0 → 25,684,000×40%−2,796,000 = 7,477,600
  //   ×2.1% = 157,029 → 7,634,629 → 7,634,600
  const r = calcHouseholdTax({
    year: 2026,
    self: { ...employee(45, 2765 * MAN), workStyle: "self-employed" },
    spouse: null,
    kidAges: [],
    hlDeductCredit: 0,
  });
  assert.equal(r.shahoSelf, 1_315_040);
  assert.equal(floor100(r.juminSelf), 2_573_400);
  assert.equal(floor100(r.shotokuzeiSelf), 7_634_600);
});

test("TAX-19 扶養控除: 17歳（一般38万・住民税33万）と20歳（特定63万・住民税45万）、15歳は0", () => {
  // 世帯B: 2026年・会社員45歳・年収800万・配偶者45歳無収入
  //   給与所得 800万−(800万×10%+110万) = 610万 → 基礎控除67万（489万超655万以下）
  //   社会保険 月給50万・賞与100万×2（上限内）: 800万×(9.15%+4.95%+0.115%+0.5%+0.81%) = 1,242,000
  //   所得税 課税 6,100,000−670,000−1,242,000−380,000(配偶者)−380,000−630,000 = 2,798,000
  //     2,798,000×10%−97,500 = 182,300 → ×2.1% 3,828 → 186,128 → 186,100
  //   子なしとの差: 所得税の課税所得 −101万、住民税 −(33万+45万)×10% = −78,000
  //     （調整控除はどちらも最低の2,500円で同じ）
  const base: HouseholdTaxInput = {
    year: 2026,
    self: employee(45, 800 * MAN),
    spouse: noIncomeSpouse(45),
    kidAges: [],
    hlDeductCredit: 0,
  };
  const none = calcHouseholdTax(base);
  const kids = calcHouseholdTax({ ...base, kidAges: [17, 20] });
  const withYoung = calcHouseholdTax({ ...base, kidAges: [17, 20, 15] });
  assert.equal(floor100(kids.shotokuzeiSelf), 186_100);
  assert.equal(none.taxableSelf - kids.taxableSelf, 1_010_000);
  assert.equal(none.juminSelf - kids.juminSelf, 78_000);
  assert.equal(withYoung.total, kids.total); // 16歳未満の扶養控除はない
});

test("TAX-20 自営業（青色申告特別控除65万・国保は全国平均の料率の近似）: 社会保険料と所得税", () => {
  // 45歳・単身・事業所得 565万−65万 = 500万
  // 国民年金 17,920×12 = 215,040
  // 国保（近似）: (500万−43万)×9.5%+5万 = 484,150、介護分 (500万−43万)×2.5%+1.7万 = 131,250 → 計 830,440
  // 所得税: 基礎控除67万（489万超）→ 課税 5,000,000−670,000−830,440 = 3,499,560 → 3,499,000
  //   3,499,000×20%−427,500 = 272,300 → ×2.1% 5,718 → 278,018 → 278,000
  const r = calcHouseholdTax({
    year: 2026,
    self: { ...employee(45, 565 * MAN), workStyle: "self-employed" },
    spouse: null,
    kidAges: [],
    hlDeductCredit: 0,
  });
  assert.equal(r.shahoSelf, 830_440);
  assert.equal(floor100(r.shotokuzeiSelf), 278_000);
});

test("TAX-21 端数処理: 所得税の年税額（復興特別所得税を含む）は100円未満切捨て（世帯A）", () => {
  // TAX-16 のとおり 104,550 → 104,500（国税通則法119条・年末調整の年調年税額も100円未満切捨て）
  assert.equal(calcHouseholdTax(householdA()).shotokuzeiSelf, 104_500);
});

test("TAX-22 端数処理: 住民税の課税所得は1,000円未満切捨て（TAX-18 の例）", () => {
  // 課税 25,684,960 → 25,684,000 → 所得割 2,568,400 ＋均等割 5,000 = 2,573,400
  const r = calcHouseholdTax({
    year: 2026,
    self: { ...employee(45, 2765 * MAN), workStyle: "self-employed" },
    spouse: null,
    kidAges: [],
    hlDeductCredit: 0,
  });
  assert.equal(r.juminSelf, 2_573_400);
});

// ── 生命保険料控除・地震保険料控除 ──
const prem = (p: Partial<Record<DeductKind, number>>): Record<DeductKind, number> => ({
  一般: 0,
  介護医療: 0,
  個人年金: 0,
  地震: 0,
  なし: 0,
  ...p,
});

test("TAX-23 生命保険料控除（新制度）の段階: 所得税 1/2+1万・1/4+2万、住民税 1/2+6千・上限2.8万", () => {
  // 出典: 国税庁 No.1140（所得税）、地方税法（住民税）
  // 一般 3万:     所得税 3万×1/2+1万 = 25,000  住民税 3万×1/2+6千 = 21,000
  // 介護医療 6万: 所得税 6万×1/4+2万 = 35,000  住民税 5.6万超 → 28,000
  // 個人年金 1.5万: 所得税 全額 15,000          住民税 1.5万×1/2+6千 = 13,500
  // 合計 所得税 75,000・住民税 62,500（2028年分・特例なし）
  const d = insuranceDeduction(prem({ 一般: 30_000, 介護医療: 60_000, 個人年金: 15_000 }), 2028, false);
  assert.deepEqual(d, { income: 75_000, jumin: 62_500 });
});

test("TAX-24 生命保険料控除の上限: 各区分 所得税4万・住民税2.8万、合計 所得税12万・住民税7万", () => {
  // 3区分とも10万 → 所得税 4万×3 = 12万、住民税 2.8万×3 = 8.4万 → 合計上限7万
  const d = insuranceDeduction(prem({ 一般: 100_000, 介護医療: 100_000, 個人年金: 100_000 }), 2028, false);
  assert.deepEqual(d, { income: 120_000, jumin: 70_000 });
});

test("TAX-25 23歳未満の扶養親族がいる人の一般生命保険料控除（2026・2027年分）: 上限6万、合計12万は同じ", () => {
  // 出典: 国税庁 No.1140（令和8年分以降の表）・令和8年度改正で令和9年分まで
  // 一般 10万: 6万超12万以下 → 10万×1/4+3万 = 55,000（特例なしなら上限4万）。住民税は特例なし 28,000
  const g = prem({ 一般: 100_000 });
  assert.deepEqual(insuranceDeduction(g, 2026, true), { income: 55_000, jumin: 28_000 });
  assert.deepEqual(insuranceDeduction(g, 2027, true), { income: 55_000, jumin: 28_000 });
  assert.deepEqual(insuranceDeduction(g, 2028, true), { income: 40_000, jumin: 28_000 });
  assert.deepEqual(insuranceDeduction(g, 2026, false), { income: 40_000, jumin: 28_000 });
  // 一般 3万以下は全額: 2.5万 → 25,000
  assert.equal(insuranceDeduction(prem({ 一般: 25_000 }), 2026, true).income, 25_000);
  // 一般15万(6万)＋介護医療10万(4万)＋個人年金10万(4万) = 14万 → 合計上限12万
  const all = insuranceDeduction(prem({ 一般: 150_000, 介護医療: 100_000, 個人年金: 100_000 }), 2026, true);
  assert.equal(all.income, 120_000);
});

test("TAX-26 地震保険料控除: 所得税は全額で上限5万、住民税は1/2で上限2.5万", () => {
  // 出典: 国税庁 No.1145
  assert.deepEqual(insuranceDeduction(prem({ 地震: 30_000 }), 2028, false), { income: 30_000, jumin: 15_000 });
  assert.deepEqual(insuranceDeduction(prem({ 地震: 80_000 }), 2028, false), { income: 50_000, jumin: 25_000 });
  // 生命保険料控除とは別枠: 一般10万(4万/2.8万)＋地震8万(5万/2.5万)
  assert.deepEqual(insuranceDeduction(prem({ 一般: 100_000, 地震: 80_000 }), 2028, false), {
    income: 90_000,
    jumin: 53_000,
  });
});

// ── 住宅ローン控除 ──

test("TAX-27 住宅ローン控除（世帯A・控除可能額21万）: 所得税から引ききれない分を住民税から、上限9.75万", () => {
  // 控除可能額 3,000万×0.7% = 210,000
  // 所得税の算出税額 102,400（TAX-16）→ 全額控除して0（復興特別所得税も0）。残り 107,600
  // 住民税の上限: 所得税の課税総所得 1,999,000×5% = 99,950 と 97,500 の小さい方 → 97,500
  // 減税の合計 = 102,400＋2,150（復興分）＋97,500 = 202,050
  const no = calcHouseholdTax(householdA());
  const hl = calcHouseholdTax(householdA({ hlDeductCredit: 210_000 }));
  assert.equal(hl.shotokuzeiSelf, 0);
  assert.equal(no.juminSelf - hl.juminSelf, 97_500);
  assert.equal(hl.hlDeduct, 202_050);
});

test("TAX-28 住宅ローン控除: 住民税の上限は所得税の課税総所得の5%、所得税で引ききれるときは住民税は減らない", () => {
  // 2026年・会社員40歳・年収400万・配偶者無収入
  //   給与所得 400万−(400万×20%+44万) = 276万
  //   社会保険: 報酬月額25万 → 標準報酬月額26万・標準賞与50万×2
  //     厚年 23,790×12＋45,750×2 = 376,980 / 健保 12,870×12＋24,750×2 = 203,940
  //     子ども 299×12＋575×2 = 4,738 / 介護 2,106×12＋4,050×2 = 33,372 / 雇用 20,000 → 計 639,030
  //   所得税 課税 2,760,000−1,040,000−639,030−380,000 = 700,970 → 700,000 → 算出税額 35,000
  //   控除可能額21万: 所得税0、住民税の上限 700,000×5% = 35,000（<97,500）→ 住民税 −35,000
  //   控除可能額3万: 所得税 35,000−30,000 = 5,000 → ×2.1% 105 → 5,105 → 5,100。住民税は変わらない
  const base: HouseholdTaxInput = {
    year: 2026,
    self: employee(40, 400 * MAN),
    spouse: noIncomeSpouse(38),
    kidAges: [],
    hlDeductCredit: 0,
  };
  const no = calcHouseholdTax(base);
  const big = calcHouseholdTax({ ...base, hlDeductCredit: 210_000 });
  const small = calcHouseholdTax({ ...base, hlDeductCredit: 30_000 });
  assert.equal(big.shotokuzeiSelf, 0);
  // 住民税は控除のあと所得割を100円未満切り捨てるので、差は35,000円の前後100円以内
  assert.ok(Math.abs(no.juminSelf - big.juminSelf - 35_000) <= 100);
  assert.equal(floor100(small.shotokuzeiSelf), 5_100);
  assert.equal(small.juminSelf, no.juminSelf);
});

test("TAX-29 住宅ローン控除の控除可能額 = 年末残高と借入限度額の小さい方×0.7%（simulate・限度額2,000万）", () => {
  // 年末残高は3,000万から1年分の元金を返した額（2,000万より多い）→ 2,000万×0.7% = 140,000
  // 35歳（2026年）の所得税の算出税額は14万を超える（年収600万＋副業50万・配偶者控除）ので全額所得税から
  // 減税額 = 140,000×1.021（復興特別所得税の分も減る）= 142,940
  const p: PlanInput = {
    ...DEFAULT_PLAN,
    selfBirth: "1991-05-10",
    spouseBirth: "1994-08-01",
    baseDate: "2026-10-31",
    curAge: 35,
    useHomeLoan: true,
    hlBal: 3000 * MAN,
    hlStart: 35,
    hlDeduct: true,
    hlDeductEndAge: 48,
    hlDeductLimit: 2000 * MAN,
  };
  const row = simulate(p).rows.find((x) => x.age === 35)!;
  assert.equal(Math.round(row.hlDeduct), 142_940);
});

// ── 退職金とDC一時金の重複調整（所得税法施行令70条、令和7年度改正）──
//   退職金 → DC一時金: 前年以前19年内の退職金と勤続期間が重なれば、重なった年数分の控除を差し引く
//   DC一時金 → 退職金: 前年以前9年内のDC一時金（2026年1月以後に受けたもの）と同じ調整
//   重なった年数分の控除 = 重複年数（1年未満切捨て）を勤続年数とみなした退職所得控除額
const lumpBase = (over: Partial<PlanInput>): PlanInput => ({
  ...DEFAULT_PLAN,
  selfBirth: "1991-05-10",
  spouseBirth: "1994-08-01",
  baseDate: "2026-10-31",
  curAge: 35, // 2026年。年齢 a の年は 2026+(a−35)。2048年（57歳）以後の付加税は1%
  dcType: "employee-none",
  dcR: 0,
  saveDcM: 0,
  dcEmployerM: 0,
  dcJoinAge: 35,
  saveDcEndAge: 65,
  dcMethod: "lump",
  penStartA: 65,
  ...over,
});
const job = (start: number, end: number, sev: number, sevAge: number) => ({
  ...DEFAULT_PLAN.jobs[0],
  start,
  end,
  sev,
  sevAge,
});

test("TAX-30 退職金→DC一時金（5年後）: 重複25年分の控除を差し引く", () => {
  // 退職金 3,000万（30〜60歳、60歳で受取。控除1,500万以上なので期間の読み替えなし）
  // DC一時金 1,000万（拠出35〜65歳＝30年、65歳＝2056年に受取）
  //   控除 30年 1,500万 − 重複（35〜60歳）25年 800万+70万×5 = 1,150万 → 350万
  //   退職所得 (1,000万−350万)÷2 = 325万 → 所得税 325万×10%−97,500 = 227,500
  //   付加税1% 2,275、住民税 325,000 → 554,775
  const p = lumpBase({ jobs: [job(30, 60, 3000 * MAN, 60)], dcBal: 1000 * MAN, dcStartAge: 65 });
  const row = simulate(p).rows.find((x) => x.age === 65)!;
  assert.equal(Math.round(row.dcTax), 554_775);
});

test("TAX-31 退職金→DC一時金: 前年以前19年内なら調整、20年空けば調整なし", () => {
  // 退職金 1,000万（30〜50歳＝20年、控除800万以上）、DC一時金 1,000万（拠出35〜65歳＝30年、70歳＝2061年に受取）
  // 退職金を51歳で受取（19年前）: 控除 1,500万 − 重複15年 600万 = 900万
  //   (1,000万−900万)÷2 = 50万 → 所得税 25,000＋付加税1% 250＋住民税 50,000 = 75,250
  // 退職金を50歳で受取（20年前）: 調整なし。控除1,500万 ≧ 1,000万 → 0
  const at = (sevAge: number) =>
    simulate(lumpBase({ jobs: [job(30, 50, 1000 * MAN, sevAge)], dcBal: 1000 * MAN, dcStartAge: 70 })).rows.find(
      (x) => x.age === 70,
    )!;
  assert.equal(Math.round(at(51).dcTax), 75_250);
  assert.equal(Math.round(at(50).dcTax), 0);
});

test("TAX-32 DC一時金→退職金: 前年以前9年内なら調整、10年空けば調整なし（令和7年度改正）", () => {
  // DC一時金 1,200万（拠出35〜60歳＝25年、60歳＝2051年に受取。控除1,150万以上なので期間の読み替えなし）
  // 退職金 2,000万（30〜65歳＝35年 → 控除 800万+70万×15 = 1,850万）
  // 5年後（65歳・2056年）・9年後（69歳・2060年）: 重複（35〜60歳）25年 1,150万を引いて 700万
  //   (2,000万−700万)÷2 = 650万 → 所得税 650万×20%−427,500 = 872,500、付加税1% 8,725、住民税 650,000 → 1,531,225
  // 10年後（70歳・2061年）: 調整なし → (2,000万−1,850万)÷2 = 75万
  //   所得税 37,500＋付加税 375＋住民税 75,000 = 112,875
  const at = (sevAge: number) =>
    simulate(lumpBase({ jobs: [job(30, 65, 2000 * MAN, sevAge)], dcBal: 1200 * MAN, dcStartAge: 60 })).rows.find(
      (x) => x.age === sevAge,
    )!;
  assert.equal(Math.round(at(65).sevTax), 1_531_225);
  assert.equal(Math.round(at(69).sevTax), 1_531_225);
  assert.equal(Math.round(at(70).sevTax), 112_875);
});

test("TAX-33 重複調整: 前の退職金が控除額に満たないときは、前の勤続期間を金額から読み替える（所令70条2項）", () => {
  // 出典: 国税庁「令和8年版 源泉徴収のあらまし」退職所得 IV2(2)ホ・計算例(3)ロ
  //   前の退職手当の金額が控除額に満たないとき、前の勤続期間は就職の日から
  //   「800万以下: 収入÷40万／800万超: (収入−800万)÷70万+20」（1未満切捨て）年を経た日の前日まで
  // 退職金 1,000万（30〜60歳＝30年、控除1,500万に満たない）→ (1,000万−800万)÷70万+20 = 22.8 → 22年 → 30〜52歳
  // DC一時金 1,000万（拠出35〜65歳＝30年、65歳＝2056年に受取）
  //   重複は35〜52歳の17年 → 控除 1,500万−40万×17 = 820万
  //   (1,000万−820万)÷2 = 90万 → 所得税 45,000＋付加税1% 450＋住民税 90,000 = 135,450
  const p = lumpBase({ jobs: [job(30, 60, 1000 * MAN, 60)], dcBal: 1000 * MAN, dcStartAge: 65 });
  const row = simulate(p).rows.find((x) => x.age === 65)!;
  assert.equal(Math.round(row.dcTax), 135_450);
});
