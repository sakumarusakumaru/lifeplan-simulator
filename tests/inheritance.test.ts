// 相続税の検証テスト。期待値は相続税法の式から手で計算した値
import assert from "node:assert/strict";
import { test } from "node:test";

import { basicDeduction, inheritanceTax, rateTax, withLandCut, type EstateBreakdown } from "@/lib/v4/calc/inheritance";

const MAN = 10000;

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
