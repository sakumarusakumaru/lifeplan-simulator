// 保険（lib/v4/calc/insurance.ts）の検証テスト
// 期待値は、所得税法・同施行令・国税庁の説明、または insurance.ts のコメントに書かれた設計のルールから手で計算したもの
import assert from "node:assert/strict";
import { test } from "node:test";

import { EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import { estateBreakdown } from "@/lib/v4/calc/inheritance";
import {
  createInsuranceState,
  deathCoverActive,
  insuranceYear,
  normalizeInsurance,
  premiumAt,
  type InsuranceDeath,
  type InsuranceYear,
} from "@/lib/v4/calc/insurance";
import type { Insurance, PlanInput, YearlyResult } from "@/lib/v4/calc/types";

const MAN = 10000;
const pol = (raw: Partial<Insurance>): Insurance => normalizeInsurance(raw as never, 30, 100);

// curAge から to 歳まで1年ずつ回して、年齢ごとの結果を返す
function runYears(list: Insurance[], curAge: number, to: number, kidOffsets: number[] = [], death: InsuranceDeath | null = null) {
  const st = createInsuranceState(list, curAge);
  const out = new Map<number, InsuranceYear>();
  for (let a = curAge; a <= to; a++) out.set(a, insuranceYear(list, st, a, 1, kidOffsets, death));
  return out;
}

test("INS-01 定期保険の更新型: 10年ごとに保険料が「上がり方」だけ上がる（物価では増やさない）", () => {
  // 月3,000円・30歳から・10年更新・更新ごとに+50%・保障は65歳まで
  //   30〜39歳: 3,000×12 = 36,000円
  //   40〜49歳: 36,000×1.5 = 54,000円
  //   50〜59歳: 36,000×1.5² = 81,000円
  //   66歳: 保障が終わっているので0
  const p = pol({ type: "定期保険", payMode: "monthly", premM: 3000, start: 30, end: 65, coverEnd: 65, renewYears: 10, renewRate: 50 });
  assert.equal(premiumAt(p, 39, 1), 36_000);
  assert.equal(premiumAt(p, 40, 1), 54_000);
  assert.equal(premiumAt(p, 50, 1), 81_000);
  assert.equal(premiumAt(p, 66, 1), 0);
  // 生命保険は契約時の保険料で固定（物価の倍率1.3をかけない）。損害保険だけ物価に合わせて増やす
  assert.equal(premiumAt(p, 40, 1.3), 54_000);
  const fire = pol({ type: "損害保険", payMode: "yearly", premM: 50_000, start: 30, end: 100 });
  assert.equal(Math.round(premiumAt(fire, 40, 1.3)), 65_000); // 50,000×1.3
});

test("INS-02 養老保険の満期金は一時所得: (受取 − 払込累計 − 50万)×1/2。特別控除50万は1年に1回", () => {
  // 月2万・30〜59歳（30年）→ 払込 240,000×30 = 7,200,000円。60歳で満期金800万
  //   一時所得 = 800万 − 720万 − 50万 = 30万 → 総合課税に加えるのは 1/2 の15万（所得税法34条・22条2項2号）
  const p = pol({ type: "養老保険", payMode: "monthly", premM: 20_000, start: 30, end: 59, maturityAge: 60, maturityAmount: 800 * MAN });
  const y = runYears([p], 30, 60);
  assert.equal(y.get(59)!.prem, 240_000);
  assert.equal(y.get(60)!.prem, 0);
  assert.equal(y.get(60)!.payout, 800 * MAN);
  assert.equal(y.get(60)!.taxable["本人"], 15 * MAN);
  assert.equal(y.get(60)!.separateTax, 0);
  // 同じ年に同じ保険が2本満期 → 差益80万×2 = 160万。控除50万は1回だけ → (160万−50万)/2 = 55万
  //   （1本ずつ控除すると (80−50)/2×2 = 30万になってしまう）
  const y2 = runYears([p, { ...p }], 30, 60);
  assert.equal(y2.get(60)!.taxable["本人"], 55 * MAN);
});

test("INS-03 終身保険の解約返戻金は一時所得。今より前に払った保険料も必要経費に入る", () => {
  // 月1万・40歳から払込・60歳で解約して300万。今50歳
  //   払込済み（40〜49歳）120,000×10 = 1,200,000、これから（50〜59歳）1,200,000 → 合計2,400,000
  //   解約の年（60歳）以降は保険料なし
  //   一時所得 = 300万 − 240万 − 50万 = 10万 → 1/2 で5万
  const p = pol({ type: "終身保険", payMode: "monthly", premM: 10_000, start: 40, end: 65, surrenderAge: 60, surrenderAmount: 300 * MAN });
  const y = runYears([p], 50, 61);
  assert.equal(y.get(59)!.prem, 120_000);
  assert.equal(y.get(60)!.prem, 0);
  assert.equal(y.get(60)!.payout, 300 * MAN);
  assert.equal(y.get(60)!.taxable["本人"], 5 * MAN);
  assert.equal(y.get(61)!.payout, 0);
  assert.equal(deathCoverActive(p, 60), false); // 解約したら死亡保障もなくなる
});

test("INS-04 一時払養老保険で5年以内の満期は金融類似商品: 差益×20.315%の源泉分離（総合課税には入れない）", () => {
  // 40歳に500万を一時払、満期金580万 → 差益80万
  //   45歳満期（保険期間5年）→ 金融類似商品: 80万×20.315% = 162,520円（所得税法174条8号・209条の2）、一時所得には入れない
  //   46歳満期（6年）→ 一時所得: (80万−50万)/2 = 15万、源泉分離なし
  const five = pol({ type: "養老保険", payMode: "single", premM: 500 * MAN, start: 40, maturityAge: 45, maturityAmount: 580 * MAN });
  const y5 = runYears([five], 40, 45);
  assert.equal(y5.get(40)!.prem, 500 * MAN);
  assert.equal(y5.get(41)!.prem, 0);
  assert.equal(Math.round(y5.get(45)!.separateTax), 162_520);
  assert.equal(y5.get(45)!.taxable["本人"], 0);

  const six = { ...five, maturityAge: 46 };
  const y6 = runYears([six], 40, 46);
  assert.equal(y6.get(46)!.separateTax, 0);
  assert.equal(y6.get(46)!.taxable["本人"], 15 * MAN);
});

test("INS-05 個人年金の雑所得: 年金額 − 年金額×(払込総額÷受取見込総額)。割合は小数第2位まで切り上げ", () => {
  // 月15,500円・40〜59歳（20年）→ 払込 186,000×20 = 3,720,000円
  // 60歳から年50万×10年（確定年金）→ 受取見込 500万
  //   必要経費の割合 = 372万÷500万 = 0.744 → 切り上げ 0.75（所得税法施行令183条1項）
  //   雑所得 = 50万 − 50万×0.75 = 125,000円（毎年）。70歳からは受取なし
  const p = pol({ type: "個人年金保険", payMode: "monthly", premM: 15_500, start: 40, end: 59, annuityStart: 60, annuityYears: 10, annuityY: 50 * MAN });
  const st = createInsuranceState([p], 40);
  assert.equal(st.annuityCostRatio[0], 0.75);
  const y = runYears([p], 40, 70);
  assert.equal(y.get(60)!.payout, 50 * MAN);
  assert.equal(y.get(60)!.taxable["本人"], 125_000);
  assert.equal(y.get(69)!.taxable["本人"], 125_000);
  assert.equal(y.get(70)!.payout, 0);
  let total = 0;
  for (let a = 60; a <= 70; a++) total += y.get(a)!.payout;
  assert.equal(total, 500 * MAN);
});

test("INS-06 学資保険: 契約者（本人）が亡くなると以後の保険料は免除、祝い金は遺族が受け取る", () => {
  // 月1万・35歳から・子は本人35歳のときに生まれた（offset 35）・18歳で200万
  // 本人が40歳で死亡 → 40歳から保険料0（払込免除）。払込は35〜39歳の 120,000×5 = 600,000円
  // 53歳（子18歳）に200万 → 受け取るのは遺族（配偶者）
  //   一時所得 = 200万 − 60万 − 50万 = 90万 → 1/2 で45万（配偶者の所得）
  //   （亡くなった契約者が払った保険料も、相続で引き継いだ契約なので必要経費に入る: 所得税基本通達34-4）
  const p = pol({ type: "学資保険", contractor: "本人", insured: "子", kid: 0, payMode: "monthly", premM: 10_000, start: 35, end: 52, eduPayouts: [{ kidAge: 18, amount: 200 * MAN }] });
  assert.equal(p.waiver, true); // 学資保険は払込免除が既定
  const death: InsuranceDeath = { who: "本人", age: 40 };
  const y = runYears([p], 35, 53, [35], death);
  assert.equal(y.get(39)!.prem, 120_000);
  assert.equal(y.get(40)!.prem, 0);
  assert.equal(y.get(52)!.prem, 0);
  assert.equal(y.get(40)!.deathLump, 0); // 被保険者は子なので死亡保険金は出ない
  assert.equal(y.get(53)!.payout, 200 * MAN);
  assert.equal(y.get(53)!.taxable["配偶者"], 45 * MAN);
  assert.equal(y.get(53)!.taxable["本人"], 0);
  // 払込免除が付いていなければ、亡くなった後も保険料は続く
  const noWaiver = { ...p, waiver: false };
  assert.equal(runYears([noWaiver], 35, 40, [35], death).get(40)!.prem, 120_000);
});

test("INS-07 収入保障保険: 亡くなった年から満了（65歳）まで毎年。満了間際なら最低支払保証の年数は出る", () => {
  // 月10万・保険期間65歳まで・最低支払保証5年
  //   50歳で死亡 → 50〜64歳の15年 × 120万 = 1,800万
  //   62歳で死亡 → 満了まで3年しかないが最低保証5年 → 62〜66歳の5年 × 120万 = 600万
  const p = pol({ type: "収入保障保険", insured: "本人", contractor: "本人", payMode: "monthly", premM: 3000, start: 30, end: 65, coverEnd: 65, incomeProtM: 10 * MAN, incomeProtMinYears: 5 });
  const sum = (deathAge: number) => {
    const y = runYears([p], 45, 75, [], { who: "本人", age: deathAge });
    const paidAges = [...y].filter(([, v]) => v.incomeProt > 0).map(([a]) => a);
    return { total: paidAges.reduce((s, a) => s + y.get(a)!.incomeProt, 0), first: paidAges[0], last: paidAges[paidAges.length - 1] };
  };
  assert.deepEqual(sum(50), { total: 1800 * MAN, first: 50, last: 64 });
  assert.deepEqual(sum(62), { total: 600 * MAN, first: 62, last: 66 });
});

test("INS-08 死亡保険金: 契約者＝被保険者＝本人なら相続税（500万×法定相続人が非課税）、契約者が配偶者なら配偶者の一時所得", () => {
  // A: 契約者・被保険者とも本人、3,000万 → みなし相続財産
  // B: 契約者は配偶者、被保険者は本人、1,000万 → 配偶者の一時所得（国税庁 No.1750）
  // C: 契約者は本人、被保険者は配偶者、500万 → 本人が亡くなっても保険金は出ない（相続財産の保険金には入れない）
  const A = pol({ type: "定期保険", insured: "本人", contractor: "本人", premM: 5000, start: 30, end: 65, coverEnd: 65, deathBenefit: 3000 * MAN });
  const B = pol({ type: "定期保険", insured: "本人", contractor: "配偶者", premM: 5000, start: 30, end: 65, coverEnd: 65, deathBenefit: 1000 * MAN });
  const C = pol({ type: "終身保険", insured: "配偶者", contractor: "本人", premM: 5000, start: 30, end: 65, deathBenefit: 500 * MAN });
  const plan: PlanInput = { ...EMPTY_PLAN, curAge: 50, homeOwned: false, useHomeLoan: false, res: [], ins: [A, B, C] };
  const row = { age: 50, ass: { c: 0, nisa: 0, toku: 0, k: 0, g: 0, dc: 0 }, hlBal: 0, reD: [] } as unknown as YearlyResult;
  // 法定相続人3人（配偶者・子2人）→ 非課税 500万×3 = 1,500万 → 課税される保険金 3,000万 − 1,500万 = 1,500万
  const b3 = estateBreakdown(plan, row, 3);
  assert.equal(b3.insuranceGross, 3000 * MAN);
  assert.equal(b3.insurance, 1500 * MAN);
  // 法定相続人1人 → 3,000万 − 500万 = 2,500万
  assert.equal(estateBreakdown(plan, row, 1).insurance, 2500 * MAN);

  // B の一時所得: 配偶者が30〜49歳に払った保険料 60,000×20 = 1,200,000
  //   (1,000万 − 120万 − 50万)/2 = 415万 → 配偶者の所得。本人側には何も足さない
  const y = runYears([A, B, C], 50, 50, [], { who: "本人", age: 50 }).get(50)!;
  assert.equal(y.deathLump, 4000 * MAN); // A＋B（C は配偶者にかけた保険）
  assert.equal(y.taxable["配偶者"], 415 * MAN);
  assert.equal(y.taxable["本人"], 0);
});
