// 相続税の検証テスト。期待値は相続税法の式から手で計算した値
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PLAN } from "@/lib/v4/calc/defaults";
import { basicDeduction, inheritanceTax, planInheritance, rateTax, scanSpouseRatios, withLandCut, type EstateBreakdown } from "@/lib/v4/calc/inheritance";
import type { AssetSnapshot, PlanInput, YearlyResult } from "@/lib/v4/calc/types";

const MAN = 10000;

// 45歳で亡くなる本人。家・不動産・保険・ローンなし、財産は現金だけ（engine2.test.ts と同じ条件）
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

test("INH-01 基礎控除: 3,000万＋600万×法定相続人（3人で4,800万）", () => {
  assert.equal(basicDeduction(3), 4800 * MAN);
  assert.equal(basicDeduction(1), 3600 * MAN);
});

test("INH-02 速算表", () => {
  assert.equal(rateTax(1000 * MAN), 100 * MAN); // 10%
  assert.equal(rateTax(2600 * MAN), 340 * MAN); // 15%−50万
  assert.equal(rateTax(5000 * MAN), 800 * MAN); // 20%−200万
  assert.equal(rateTax(10000 * MAN), 2300 * MAN); // 30%−700万
  assert.equal(rateTax(60000 * MAN), 25800 * MAN); // 50%−4,200万
});

test("INH-03 課税価格1億・配偶者と子2人・法定相続分: 総額630万、配偶者は軽減で0、子は合計315万", () => {
  // 課税遺産 1億−4,800万 = 5,200万 → 配偶者2,600万: 340万、子1,300万×2: 145万×2 → 総額630万
  const r = inheritanceTax(10000 * MAN, true, 2, 0.5);
  assert.equal(r.totalTax, 630 * MAN);
  assert.equal(r.people.find((x) => x.who === "spouse")?.payable, 0);
  assert.equal(r.payable, 315 * MAN);
});

test("INH-04 配偶者の税額軽減は1億6,000万円か法定相続分の多い方まで", () => {
  // 課税価格3億・配偶者が全部: 法定相続分1.5億 < 1.6億 → 1.6億までが軽減、残り1.4億分は課税
  const r = inheritanceTax(30000 * MAN, true, 2, 1);
  const total = r.totalTax;
  const expectedPayable = Math.round(total - (total * (16000 * MAN)) / (30000 * MAN));
  assert.equal(r.payable, expectedPayable);
});

test("INH-05 未成年者控除: (18歳−年齢)×10万円", () => {
  // 子1人だけ・課税価格5,000万: 課税遺産1,400万 → 税160万。10歳の子は80万を引く
  const r = inheritanceTax(5000 * MAN, false, 1, 0, [10]);
  assert.equal(r.totalTax, 160 * MAN);
  assert.equal(r.payable, 80 * MAN);
});

const breakdown = (home: number, landCut: number, total: number): EstateBreakdown =>
  ({ financial: 0, home, homeLandCut: landCut, realEstate: 0, props: [], loans: 0, insurance: 0, insuranceGross: 0, retirement: 0, retirementGross: 0, total, spouseOwn: 0 }) as unknown as EstateBreakdown;

test("INH-06 小規模宅地等の特例は、配偶者が相続した分だけ（自宅から先に相続とみなす）", () => {
  // 自宅の評価4,000万（うち土地3,000万→8割減2,400万）、特例後の課税価格は 金融6,000万＋自宅1,600万 = 7,600万
  const b = breakdown(1600 * MAN, 2400 * MAN, 7600 * MAN);
  // 配偶者が半分（特例前1億の5,000万）→ 自宅4,000万を全部相続できる → 特例は全部使える
  assert.equal(withLandCut(b, 0.5).homeLandCut, 2400 * MAN);
  // 配偶者が2割（2,000万）→ 自宅の半分だけ → 特例も半分
  assert.equal(withLandCut(b, 0.2).homeLandCut, 1200 * MAN);
  // 配偶者が相続しない → 特例なし
  assert.equal(withLandCut(b, 0).homeLandCut, 0);
});

test("INH-11 おすすめの分け方: 配偶者の割合を総当たりして、一次＋二次の合計が最も少ない割合を選ぶ", () => {
  // 課税価格2億（現金だけ・特例や保険なし）、配偶者名義の財産0、子2人（成人）
  // 一次: 基礎控除4,800万 → 課税遺産1億5,200万
  //   法定相続分で分けて 配偶者7,600万: ×30%−700万 = 1,580万、子3,800万×2: (×20%−200万)=560万×2 → 総額2,700万
  //   配偶者の軽減は max(1.6億, 法定分1億)=1.6億まで → 割合 r ≤ 0.8 なら配偶者の税は0、子は 2,700万×(1−r)
  // 二次: 配偶者の財産 = 2億×r（配偶者の一次の税0のとき）、基礎控除4,200万、子2人で等分
  //   r=0.25: 一次2,025万 ＋ 二次 (5,000万−4,200万)/2=400万→40万×2=80万  = 2,105万
  //   r=0.30: 一次1,890万 ＋ 二次 (6,000万−4,200万)/2=900万→90万×2=180万 = 2,070万 ← 最小
  //   r=0.35: 一次1,755万 ＋ 二次 (7,000万−4,200万)/2=1,400万→(×15%−50万)=160万×2=320万 = 2,075万
  //   r=0.50: 一次1,350万 ＋ 二次 (1億−4,200万)/2=2,900万→385万×2=770万 = 2,120万（法定相続分）
  //   r=0.80: 一次540万 ＋ 二次 (1.6億−4,200万)/2=5,900万→(×30%−700万)=1,070万×2=2,140万 = 2,680万（1億6,000万円まで）
  const b = breakdown(0, 0, 20000 * MAN);
  const r = scanSpouseRatios(b, true, 2, []);
  assert.equal(r.bestRatio, 0.3);
  assert.equal(r.bestTotal, 2070 * MAN);
  // 名前のついた分け方の値も手計算と一致
  const opt = (m: string) => r.options.find((o) => o.mode === m)!;
  assert.equal(opt("legal").total, 2120 * MAN);
  assert.equal(opt("cap16").ratio, 0.8);
  assert.equal(opt("cap16").total, 2680 * MAN);
  assert.equal(opt("none").total, 2700 * MAN);
  assert.equal(opt("best").ratio, 0.3);
  // おすすめは、総当たりした全候補の中で合計が最小（0〜100%の5%刻み＋法定分＋1億6,000万円まで）
  assert.ok(r.scan.length >= 21);
  for (const x of r.scan) assert.ok(x.total >= r.bestTotal, `${x.ratio}: ${x.total} >= ${r.bestTotal}`);
  // planInheritance で「おすすめ」を選ぶと、その割合で一次相続を計算する
  const plan = inhPlan({ inheritSet: { selfSharePct: 100, spouseMode: "best", smallLand: true } });
  const p = planInheritance(plan, inhRow(45, { c: 20000 * MAN }), true, 2);
  assert.equal(p.spouseRatio, 0.3);
  assert.equal(p.first.payable, 1890 * MAN);
  assert.equal(p.second?.payable, 180 * MAN);
  assert.equal(p.total, 2070 * MAN);
});

test("INH-12 おすすめは配偶者がいないとき・子がいないときは出ない", () => {
  const b = breakdown(0, 0, 20000 * MAN);
  // 配偶者なし（子2人）: 比較の候補なし・おすすめなし
  const noSpouse = scanSpouseRatios(b, false, 2, []);
  assert.equal(noSpouse.scan.length, 0);
  assert.equal(noSpouse.options.length, 0);
  assert.equal(noSpouse.bestRatio, 0);
  // 配偶者あり・子なし: 二次相続の比較はできない
  const noKids = scanSpouseRatios(b, true, 0, []);
  assert.equal(noKids.options.length, 0);
  // planInheritance でも、配偶者がいなければ「おすすめ」を選んでいても子だけで相続（配偶者の割合0・二次相続なし）
  //   子2人・課税価格2億: 基礎控除4,200万 → 1億5,800万 → 子7,900万×2: (×30%−700万)=1,670万×2 = 3,340万
  const plan = inhPlan({ inheritSet: { selfSharePct: 100, spouseMode: "best", smallLand: true } });
  const p = planInheritance(plan, inhRow(45, { c: 20000 * MAN }), false, 2);
  assert.equal(p.options.length, 0);
  assert.equal(p.spouseRatio, 0);
  assert.equal(p.second, null);
  assert.equal(p.first.payable, 3340 * MAN);
  assert.equal(p.total, 3340 * MAN);
});
