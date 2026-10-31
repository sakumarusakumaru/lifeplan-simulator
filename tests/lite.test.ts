// Lite → 標準版の変換（lib/lite/toPlan.ts）と Lite の結果（lib/lite/result.ts）の検証テスト
// 期待値は、toPlan.ts・result.ts・types.ts のコメントに書かれた設計のルールと、元利均等返済の式から手で計算したもの
import assert from "node:assert/strict";
import { test } from "node:test";

import { liteAccuracy, liteBase, liteResult } from "@/lib/lite/result";
import { liteToPlan } from "@/lib/lite/toPlan";
import { LITE_DEFAULT, type LiteInput } from "@/lib/lite/types";

const MAN = 10000;
const Y = new Date().getFullYear();
const q = (o: Partial<LiteInput>): LiteInput => ({ ...LITE_DEFAULT, ...o });

test("LITE-01 年齢は1月1日生まれとみなし、年収（万円）は円に。前提は物価1.5%・昇給1.5%・100歳まで", () => {
  // 40歳・年収600万・配偶者38歳（会社員・年収300万）・子5歳、65歳まで働く
  //   誕生日: 本人 (今年−40)-01-01、配偶者 (今年−38)-01-01、子 (今年−5)-01-01・本人35歳のときの子（offset 35）
  //   会社員の厚生年金: 22歳から65歳まで → 43年、平均年収600万
  const p = liteToPlan(q({ age: 40, income: 600, retireAge: 65, hasSpouse: true, spouseAge: 38, spouseWork: "employee", spouseIncome: 300, kidAges: [5] }));
  assert.equal(p.selfBirth, `${Y - 40}-01-01`);
  assert.equal(p.spouseBirth, `${Y - 38}-01-01`);
  assert.equal(p.curAge, 40);
  assert.equal(p.endAge, 100);
  assert.equal(p.infl, 1.5);
  assert.equal(p.jobs[0].inc, 6_000_000);
  assert.equal(p.jobs[0].raise, 1.5);
  assert.equal(p.jobs[0].end, 65);
  assert.equal(p.spouseIncY, 3_000_000);
  assert.equal(p.selfPension.category, "kosei");
  assert.equal(p.selfPension.koseiYears, 43);
  assert.equal(p.selfPension.koseiAvgIncome, 6_000_000);
  assert.equal(p.kids[0].birth, `${Y - 5}-01-01`);
  assert.equal(p.kids[0].offset, 35);
});

test("LITE-02 ローン残高は、月の返済と残り年数から金利1%の元利均等で逆算（年金現価）", () => {
  // 月10万・残り20年・年1%: r = 0.01/12、n = 240
  //   残高 = 10万 × (1 − (1+r)^−240) ÷ r = 21,744,126.5… → 21,744,127円
  //   （検算: 2,000万を20年1%で借りると月91,980円 → 10万円なら 2,000万×100,000/91,980 ≒ 2,174万）
  // 今の持ち家（戸建て）の維持費は「家賃/管理費」の欄に 1.5万/月、固定資産税は10万/年
  const p = liteToPlan(q({ age: 40, home: "loan", loanM: 10, loanYears: 20, homeType: "house" }));
  assert.equal(p.useHomeLoan, true);
  assert.equal(p.hlBal, 21_744_127);
  assert.equal(p.hlRate, 1);
  assert.equal(p.hlTerm, 20);
  assert.equal(p.hlStart, 40);
  assert.equal(p.homeOwned, true);
  assert.equal(p.rentM, 15_000);
  assert.equal(p.homeTaxY, 100_000);
});

test("LITE-03 持ち家（ローンなし・マンション）: 管理費・修繕積立金3万/月は家賃の欄、ローンはなし", () => {
  const p = liteToPlan(q({ age: 50, home: "owned", homeType: "mansion", loanM: 10 }));
  assert.equal(p.homeOwned, true);
  assert.equal(p.useHomeLoan, false);
  assert.equal(p.rentM, 30_000);
  assert.equal(p.homeTaxY, 100_000);
  // 賃貸なら家賃そのまま・固定資産税なし
  const r = liteToPlan(q({ home: "rent", rentM: 8 }));
  assert.equal(r.rentM, 80_000);
  assert.equal(r.homeTaxY, 0);
  assert.equal(r.homeOwned, false);
});

test("LITE-04 これから買う家: 家賃は買うまで、維持費は固定資産税の欄に足す。借入は値段−頭金、35年（80歳完済まで）", () => {
  // 35歳・家賃12万・40歳で4,000万のマンション・頭金400万
  //   家賃の欄 = 12万（買った年から止まる）
  //   固定資産税の欄 = 10万 + 3万×12 = 46万/年
  //   借入 = 4,000万 − 400万 = 3,600万、35年（40歳+35 = 75歳 ≤ 80）、40歳から
  //   40歳の出費 = 頭金400万 + 諸費用 4,000万×7% = 280万 → 680万
  const p = liteToPlan(q({ age: 35, home: "rent", rentM: 12, buyHome: true, buyAge: 40, buyPrice: 4000, buyDown: 400, homeType: "mansion" }));
  assert.equal(p.rentM, 120_000);
  assert.equal(p.homeTaxY, 460_000);
  assert.equal(p.homeOwned, true);
  assert.equal(p.homeBuyAge, 40);
  assert.equal(p.hlBal, 3600 * MAN);
  assert.equal(p.hlTerm, 35);
  assert.equal(p.hlStart, 40);
  assert.deepEqual(
    p.lifeExpenses.find((e) => e.age === 40),
    { age: 40, amount: 680 * MAN, label: "家の頭金・諸費用" },
  );
  // 50歳で買うなら 80−50 = 30年
  assert.equal(liteToPlan(q({ age: 35, home: "rent", buyHome: true, buyAge: 50, buyPrice: 4000, buyDown: 400 })).hlTerm, 30);
});

test("LITE-05 投資の合計は新NISAに。積立はつみたて枠（月10万）まで → 残りを成長枠（月20万まで）", () => {
  // 合計300万・月15万 → NISA残高300万、つみたて10万、成長5万
  const a = liteToPlan(q({ invest: 300, investM: 15 }));
  assert.equal(a.nisaBal, 300 * MAN);
  assert.equal(a.nisaSplit.fundBal, 300 * MAN);
  assert.equal(a.nisaTsumitateM, 100_000);
  assert.equal(a.nisaGrowthM, 50_000);
  assert.equal(a.nisaOverflowToToku, true);
  // 月5万 → つみたて5万・成長0
  const b = liteToPlan(q({ investM: 5 }));
  assert.equal(b.nisaTsumitateM, 50_000);
  assert.equal(b.nisaGrowthM, 0);
  // 月35万 → つみたて10万・成長は年240万の枠＝月20万まで（残り5万は特定口座へ）
  const c = liteToPlan(q({ investM: 35 }));
  assert.equal(c.nisaTsumitateM, 100_000);
  assert.equal(c.nisaGrowthM, 200_000);
});

test("LITE-06 配偶者の年金: パート年収130万以上は厚生年金、130万未満で本人が会社員なら扶養（第3号）。妻/夫は risk.spouseSex へ", () => {
  const base = { age: 40, hasSpouse: true, spouseAge: 40, work: "employee" as const, income: 500 };
  // パート130万 → 厚生年金、22歳から65歳まで43年、平均130万
  const a = liteToPlan(q({ ...base, spouseWork: "part", spouseIncome: 130 }));
  assert.equal(a.spousePension.category, "kosei");
  assert.equal(a.spousePension.koseiYears, 43);
  assert.equal(a.spousePension.koseiAvgIncome, 130 * MAN);
  // パート129万 → 扶養（第3号）
  assert.equal(liteToPlan(q({ ...base, spouseWork: "part", spouseIncome: 129 })).spousePension.category, "dependent");
  // 本人が自営業なら、配偶者が働いていなくても国民年金（第1号）
  assert.equal(liteToPlan(q({ ...base, work: "self", spouseWork: "none" })).spousePension.category, "kokumin");
  // 配偶者が夫
  assert.equal(liteToPlan(q({ ...base, spouseSex: "male" })).risk.spouseSex, "male");
  assert.equal(liteToPlan(q({ ...base, spouseSex: "female" })).risk.spouseSex, "female");
});

test("LITE-07 これから生まれる子: 1人目は○年後、2人目からは2年おき（1月1日生まれ）", () => {
  // 30歳・今3歳の子1人・予定3人・1人目は1年後
  //   既存: (今年−3)-01-01、offset 27
  //   予定: 今年+1・+3・+5 年の1月1日、offset 31・33・35
  const p = liteToPlan(q({ age: 30, kidAges: [3], futureKids: 3, futureKidsIn: 1 }));
  assert.equal(p.kids.length, 4);
  assert.deepEqual(
    p.kids.map((k) => [k.birth, k.offset]),
    [
      [`${Y - 3}-01-01`, 27],
      [`${Y + 1}-01-01`, 31],
      [`${Y + 3}-01-01`, 33],
      [`${Y + 5}-01-01`, 35],
    ],
  );
});

test("LITE-08 入力の充実度: 必須だけで60%、任意の重みで残り40%", () => {
  // 50歳・配偶者なし・賃貸・任意は何も答えていない
  //   重み: 定期便12、老後の生活費8、DC5、子3、家3、出費3 = 34、達成0 → 60%。次にすすめるのは重み最大の定期便
  const a = liteAccuracy(q({ age: 50 }));
  assert.deepEqual(a, { pct: 60, next: "ねんきん定期便の見込み額" });
  // 49歳 → 定期便は入れなくても達成（12/34）→ 60 + 40×12/34 = 74.1 → 74%
  assert.equal(liteAccuracy(q({ age: 49 })).pct, 74);
  // 配偶者あり・全部答えた → 100%
  const all = liteAccuracy(
    q({ age: 55, hasSpouse: true, pensionSelf: 15, pensionSpouse: 8, ans: { retireLiving: true, dc: true, kidsPlan: true, homePlan: true, events: true } }),
  );
  assert.deepEqual(all, { pct: 100, next: null });
});

test("LITE-09 足りない人の積立・足りる人の余裕は、0.5万円きざみの最小値（積立は60万、余裕は50万が上限）", () => {
  const isStep = (x: number) => Math.abs(x * 2 - Math.round(x * 2)) < 1e-9;
  // 足りない人: needMonthly 積み増せば100歳まで足り、0.5万少ないと足りない
  //   （働いている間の黒字がないと、積立を増やしても足りるようにはならない → 60万でも足りなければ null の設計）
  const short = q({ age: 40, income: 600, livingM: 16, rentM: 8, cash: 300 });
  const rs = liteResult(short);
  assert.ok(rs.shortfallAge !== null, "このサンプルは足りなくなる");
  assert.equal(rs.room, null);
  const need = rs.needMonthly;
  assert.ok(need !== null && need > 0 && need <= 60 && isStep(need), `needMonthly=${need}`);
  assert.equal(liteBase({ ...short, investM: short.investM + need! }).shortfallAge, null);
  assert.notEqual(liteBase({ ...short, investM: short.investM + need! - 0.5 }).shortfallAge, null);

  // 足りる人: 生活費を room 増やしても足り、さらに0.5万増やすと足りない
  const rich = q({ age: 40, income: 900, livingM: 15, rentM: 10, cash: 3000, invest: 1000 });
  const rr = liteResult(rich);
  assert.equal(rr.shortfallAge, null);
  assert.equal(rr.needMonthly, null);
  const room = rr.room!;
  assert.ok(room >= 0 && room <= 50 && isStep(room), `room=${room}`);
  assert.equal(liteBase({ ...rich, livingM: rich.livingM + room }).shortfallAge, null);
  if (room < 50) assert.notEqual(liteBase({ ...rich, livingM: rich.livingM + room + 0.5 }).shortfallAge, null);
});
