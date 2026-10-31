// 税・社会保険の検証テスト。期待値は法令の式から手で計算した値（コードから写していない）。
// ID は検証チェックリスト（80_outbox/2026_1031_ライフプラン計算の検証チェックリスト_ver1.md）と対応する
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calcEmployeeShaho,
  calcKokuho,
  haigushaKojo,
  calcShotokuzei,
  calcTaishokuTax,
  kisoKojoIncomeTax,
  koutekiNenkinKojo,
  kyuyoShotokuKojo,
  surtaxRate,
  taishokuShotoku,
  taishokuShotokuKojo,
  widowDeduction,
} from "@/lib/v4/calc/tax";

const MAN = 10000;

test("TAX-01 所得税の速算表（課税所得500万円）: 500万×20%−42.75万 = 57.25万", () => {
  assert.equal(calcShotokuzei(500 * MAN), 572_500);
});

test("TAX-02 速算表の境目がつながる（195万・330万・695万）", () => {
  assert.equal(calcShotokuzei(195 * MAN), 97_500); // 195万×5%
  assert.equal(calcShotokuzei(330 * MAN), 232_500); // 330万×10%−9.75万
  assert.equal(calcShotokuzei(695 * MAN), 962_500); // 695万×20%−42.75万
  assert.equal(calcShotokuzei(4000 * MAN), 13_204_000); // 4,000万×40%−279.6万
});

test("TAX-03 課税所得は1,000円未満を切り捨て", () => {
  assert.equal(calcShotokuzei(1_234_567), 61_700); // 1,234,000×5%
});

test("TAX-04 付加税（復興・防衛特別所得税）: 2047年分まで2.1%、2048年分から1%", () => {
  assert.equal(surtaxRate(2026), 0.021);
  assert.equal(surtaxRate(2047), 0.021);
  assert.equal(surtaxRate(2048), 0.01);
});

test("TAX-05 給与所得控除（最低保障を超える帯）", () => {
  assert.equal(kyuyoShotokuKojo(300 * MAN, 2026), 98 * MAN); // 300万×30%+8万
  assert.equal(kyuyoShotokuKojo(500 * MAN, 2026), 144 * MAN); // 500万×20%+44万
  assert.equal(kyuyoShotokuKojo(800 * MAN, 2026), 190 * MAN); // 800万×10%+110万
  assert.equal(kyuyoShotokuKojo(1200 * MAN, 2026), 195 * MAN); // 上限
});

test("TAX-06 公的年金等控除（他の所得1,000万以下）", () => {
  assert.equal(koutekiNenkinKojo(200 * MAN, 66), 110 * MAN); // 65歳以上・330万以下
  assert.equal(koutekiNenkinKojo(400 * MAN, 66), 127.5 * MAN); // 400万×25%+27.5万
  assert.equal(koutekiNenkinKojo(100 * MAN, 62), 60 * MAN); // 65歳未満・130万以下
  assert.equal(koutekiNenkinKojo(50 * MAN, 62), 50 * MAN); // 年金額が上限
});

test("TAX-07 基礎控除（所得税）2026年分: 合計所得489万以下104万、489万超655万以下67万", () => {
  assert.equal(kisoKojoIncomeTax(300 * MAN, 2026), 104 * MAN);
  assert.equal(kisoKojoIncomeTax(600 * MAN, 2026), 67 * MAN);
  assert.equal(kisoKojoIncomeTax(2000 * MAN, 2026), 62 * MAN);
});

test("TAX-08 退職所得控除: 20年以下40万×年数（最低80万）、20年超800万+70万×(年数−20)", () => {
  assert.equal(taishokuShotokuKojo(1), 80 * MAN);
  assert.equal(taishokuShotokuKojo(3), 120 * MAN);
  assert.equal(taishokuShotokuKojo(20), 800 * MAN);
  assert.equal(taishokuShotokuKojo(30), 1500 * MAN);
  assert.equal(taishokuShotokuKojo(19.2), 800 * MAN); // 1年未満の端数は1年に切り上げ
});

test("TAX-09 退職金2,500万円・勤続30年（2026年）: 税は108万4,523円", () => {
  // 控除1,500万 → (2,500万−1,500万)÷2 = 500万
  // 所得税 500万×20%−42.75万 = 57.25万、付加税 2.1% = 12,022.5円、住民税 10% = 50万
  assert.equal(calcTaishokuTax(2500 * MAN, 30, 2026), 1_084_523);
});

test("TAX-10 短期退職手当等（勤続5年以下）: 控除後300万を超える部分は1/2にしない", () => {
  // 勤続3年・1,000万: 控除120万 → 880万。300万までは1/2で150万、超える580万は全額 → 730万
  assert.equal(taishokuShotoku(1000 * MAN, 120 * MAN, true), 730 * MAN);
  assert.equal(taishokuShotoku(1000 * MAN, 120 * MAN, false), 440 * MAN);
});

test("TAX-11 会社員の社会保険料（2026年度・35歳・年収600万。標準報酬月額の等級で計算）", () => {
  // モデル: 年収を月給×12＋賞与（月給×2を年2回）に分ける → 報酬月額37.5万・賞与75万×2
  // 標準報酬月額: 37.5万は「37万以上39.5万未満」の等級で 38万（協会けんぽの保険料額表）
  // 標準賞与額: 75万（千円未満なし・上限内）
  // 厚生年金 9.15%: 月 38万×9.15% = 34,770×12 = 417,240 ＋ 賞与 75万×9.15% = 68,625×2 = 137,250 → 554,490
  // 健康保険 4.95%: 月 18,810×12 = 225,720 ＋ 賞与 37,125×2 = 74,250 → 299,970
  // 子ども・子育て支援金 0.115%: 月 437×12 ＋ 賞与 862.5→862（50銭以下切捨て）×2 = 5,244+1,724 = 6,968
  // 雇用保険 0.5%: 30,000 / 介護保険は40歳から
  const r = calcEmployeeShaho(600 * MAN, 35, 2026);
  assert.equal(r.pension, 554_490);
  assert.equal(r.health, 299_970 + 6_968 + 30_000); // 336,938
  assert.equal(r.kaigo, 0);
  assert.equal(r.total, 554_490 + 336_938);
});

test("TAX-12 介護保険料は40〜64歳だけ（1.62%の折半・標準報酬38万）", () => {
  // 月 38万×0.81% = 3,078×12 = 36,936 ＋ 賞与 75万×0.81% = 6,075×2 = 12,150 → 49,086
  assert.equal(calcEmployeeShaho(600 * MAN, 45, 2026).kaigo, 49_086);
  assert.equal(calcEmployeeShaho(600 * MAN, 65, 2026).kaigo, 0);
});

test("TAX-13 ひとり親控除: 2026年分は所得税35万・住民税30万、2027年分から38万・33万（令和8年度改正）", () => {
  assert.deepEqual(widowDeduction(true, "female", 2026), { income: 35 * MAN, jumin: 30 * MAN });
  assert.deepEqual(widowDeduction(true, "male", 2027), { income: 38 * MAN, jumin: 33 * MAN });
  assert.deepEqual(widowDeduction(false, "female", 2027), { income: 27 * MAN, jumin: 26 * MAN }); // 寡婦控除は据え置き
});

test("TAX-14 配偶者控除: 納税者の合計所得900万超は国税庁の表の額（1万円単位の切り上げ）", () => {
  // 出典: 国税庁「令和8年分 源泉所得税の改正のあらまし」p.2
  assert.equal(haigushaKojo(800 * MAN, 0, 50, "income"), 38 * MAN);
  assert.equal(haigushaKojo(920 * MAN, 0, 50, "income"), 26 * MAN);
  assert.equal(haigushaKojo(970 * MAN, 0, 50, "income"), 13 * MAN);
  assert.equal(haigushaKojo(920 * MAN, 0, 72, "income"), 32 * MAN); // 老人控除対象配偶者48万の2/3
  assert.equal(haigushaKojo(1010 * MAN, 0, 50, "income"), 0);
  // 住民税: 老人控除対象配偶者は38万（通し検証で発見したバグの回帰テスト。
  //   配偶者特別控除の33万上限を老人加算にかけない）。特別控除側の上限は従来どおり
  assert.equal(haigushaKojo(800 * MAN, 0, 72, "jumin"), 38 * MAN);
  assert.equal(haigushaKojo(800 * MAN, 0, 50, "jumin"), 33 * MAN);
  assert.equal(haigushaKojo(800 * MAN, 98 * MAN, 50, "jumin"), 33 * MAN); // 特別控除36万→住民税上限33万
});

test("TAX-15 国民健康保険（医療＋支援分）の上限は令和8年度93万", () => {
  assert.equal(calcKokuho(5000 * MAN, 35), 93 * MAN);
});
