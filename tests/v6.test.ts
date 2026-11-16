// ver6: 夫婦それぞれのNISA・特定口座と、配当・分配金の受け取り
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PLAN, EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import { estateBreakdown } from "@/lib/v4/calc/inheritance";
import { simulate } from "@/lib/v4/calc/simulate";
import type { PlanInput } from "@/lib/v4/calc/types";

const MAN = 10000;
const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}（許容 ±${tol}）`);

// 本人40歳・配偶者38歳の会社員世帯。現金は多めにして取り崩しが起きないように
const base: PlanInput = {
  ...DEFAULT_PLAN,
  ...EMPTY_PLAN,
  baseDate: "2026-01-01",
  selfBirth: "1986-01-01",
  spouseBirth: "1988-01-01",
  curAge: 40,
  endAge: 100,
  taxMode: "detailed",
  jobs: [{ name: "勤務先", start: 22, end: 65, inc: 1500 * MAN, raise: 0, sev: 0, sevAge: 65, sevMethod: "lump" }],
  livingM: 20 * MAN,
  cashBal: 3000 * MAN,
  cashFloor: 100 * MAN,
  nisaBal: 0,
  nisaR: 4,
  tokuBal: 0,
  tokuR: 4,
  nisaTsumitateM: 0,
  nisaGrowthM: 0,
  saveTokuM: 0,
  nisaOverflowToToku: true,
  res: [],
  ins: [],
  otherLoans: [],
  kids: [],
  sideJobs: [],
  lifeExpenses: [],
  inheritances: [],
} as PlanInput;

test("V6-01 NISAの年間枠は1人ずつ: 夫婦で月30万ずつ（つみたて10万＋成長20万）は全額NISAに入る", () => {
  const both = simulate({ ...base, nisaTsumitateM: 10 * MAN, nisaGrowthM: 20 * MAN, nisaEndAge: 60, spNisaTsumitateM: 10 * MAN, spNisaGrowthM: 20 * MAN, spNisaEndAge: 60 });
  assert.equal(both.rows[0].nisaIn, 720 * MAN);
  assert.equal(both.rows[0].nisaOverflow, 0);
  // 本人だけで同じ額（月60万）を入れると、半分は枠を超えて特定口座へ
  const selfOnly = simulate({ ...base, nisaTsumitateM: 20 * MAN, nisaGrowthM: 40 * MAN, nisaEndAge: 60 });
  assert.equal(selfOnly.rows[0].nisaIn, 360 * MAN);
  assert.equal(selfOnly.rows[0].nisaOverflow, 360 * MAN);
  assert.equal(selfOnly.rows[0].tokuIn, 360 * MAN);
});

test("V6-02 配偶者の生涯枠も別: 配偶者が1,800万に達したら、本人の枠が空いていても配偶者の分は特定口座へ", () => {
  const r = simulate({ ...base, spNisaBal: 1800 * MAN, spNisaTsumitateM: 10 * MAN, spNisaEndAge: 60, nisaTsumitateM: 10 * MAN, nisaEndAge: 60 });
  assert.equal(r.rows[0].nisaIn, 120 * MAN); // 本人の分だけ
  assert.equal(r.rows[0].tokuIn, 120 * MAN); // 配偶者の分は特定口座
  near(r.rows[0].spToku, 120 * MAN * 1.04, 1);
});

test("V6-03 配偶者名義の残高は世帯の合計の内数として同じ利回りで増える", () => {
  const r = simulate({ ...base, nisaBal: 1000 * MAN, spNisaBal: 500 * MAN, spTokuBal: 300 * MAN });
  near(r.rows[0].spNisa, 520 * MAN, 1);
  near(r.rows[0].spToku, 312 * MAN, 1);
  near(r.rows[0].ass.nisa, 1560 * MAN, 1);
  near(r.rows[0].ass.toku, 312 * MAN, 1);
});

test("V6-04 配当: 特定口座は20.315%を引いて、NISAは非課税で現金に入る。受け取った分だけ口座の値上がりが減る（合計のもうけは同じ）", () => {
  const plan = { ...base, nisaBal: 1000 * MAN, tokuBal: 0, spTokuBal: 5000 * MAN };
  const noDiv = simulate(plan);
  const div = simulate({ ...plan, divNisaY: 3, spDivTokuY: 4 });
  const r = div.rows[0];
  near(r.divGross, 230 * MAN, 1);
  near(r.divTax, 200 * MAN * 0.20315, 1);
  near(r.income - noDiv.rows[0].income, 230 * MAN - 200 * MAN * 0.20315, 1);
  // 受け取った分だけ現金が増える
  near(r.ass.c - noDiv.rows[0].ass.c, (230 * MAN - 200 * MAN * 0.20315) * (1 + base.cashRate * (1 - 0.20315)), 1);
  // 口座は 値上がり＝合計4%−配当 で増える（特定口座 5,000万×1.00、NISA 1,000万×1.01）
  near(r.ass.toku, 5000 * MAN, 1);
  near(r.ass.nisa, 1010 * MAN, 1);
  // 口座＋受け取った配当（税引き前）は、受け取らない場合の口座と同じ
  near(r.ass.toku + r.ass.nisa + r.divGross, noDiv.rows[0].ass.toku + noDiv.rows[0].ass.nisa, 1);
});

test("V6-05 配当で生活費をまかなう: 配当が生活費を上回れば、取り崩しは起きない", () => {
  const retired: PlanInput = { ...base, jobs: [], cashBal: 200 * MAN, cashFloor: 100 * MAN, tokuBal: 10000 * MAN, divTokuY: 4, livingM: 20 * MAN };
  const r = simulate(retired).rows.slice(0, 10);
  // 1億×4%＝400万、税引き後 約319万 ＞ 生活費240万＋国民年金・国保 約55万（配当は申告不要なので国保・住民税は増えない）
  assert.ok(r.every((x) => x.draw === 0), "取り崩しなし");
  const noDiv = simulate({ ...retired, divTokuY: 0 }).rows.slice(0, 10);
  assert.ok(noDiv.some((x) => x.draw > 0), "配当がなければ取り崩す");
});

test("V6-06 相続: 配偶者名義の口座は、本人名義の割合にかかわらず配偶者の財産", () => {
  const plan = { ...base, nisaBal: 1000 * MAN, spNisaBal: 2000 * MAN, inheritSet: { selfSharePct: 100, spouseMode: "legal" as const, smallLand: false } };
  const row = simulate(plan).rows[0];
  const b = estateBreakdown(plan, row, 2, 1, plan.inheritSet, true);
  const household = row.ass.c + row.ass.nisa + row.ass.toku + row.ass.k + row.ass.g;
  near(b.financial, household - row.spNisa - row.spToku, 1);
  near(b.spouseOwn, row.spNisa + row.spToku, 1);
});

test("V6-07 何も入れなければ ver5 と同じ: 配偶者の口座・配当を0で入れても結果は変わらない", () => {
  const plan = { ...DEFAULT_PLAN } as PlanInput;
  const a = simulate(plan);
  const b = simulate({ ...plan, spNisaBal: 0, spTokuBal: 0, spNisaTsumitateM: 0, spSaveTokuM: 0, divNisaY: 0, divTokuY: 0, spDivNisaY: 0, spDivTokuY: 0 });
  assert.equal(a.rows.length, b.rows.length);
  a.rows.forEach((x, i) => {
    assert.equal(x.ass.c, b.rows[i].ass.c);
    assert.equal(x.nw, b.rows[i].nw);
  });
  assert.equal(a.shortfallAge, b.shortfallAge);
});

test("V6-08 配偶者の積立を終える年齢が未入力なら60歳（画面の表示と同じ）", () => {
  // 月5万（年60万）なら生涯枠1,800万に届く前に60歳になる
  const r = simulate({ ...base, spNisaTsumitateM: 5 * MAN, spSaveTokuM: 5 * MAN });
  assert.equal(r.rows[0].nisaIn, 60 * MAN);
  assert.equal(r.rows[0].tokuIn, 60 * MAN);
  // 配偶者は38歳 → 60歳になる前の年（59歳）まで積み立てる
  const last = r.rows.find((x) => x.age === 40 + (59 - 38))!;
  const after = r.rows.find((x) => x.age === 40 + (60 - 38))!;
  assert.equal(last.nisaIn, 60 * MAN);
  assert.equal(after.nisaIn, 0);
  assert.equal(after.tokuIn, 0);
});

test("V6-09 配偶者がいなければ、残っている配偶者の口座・配当は数えない", () => {
  const solo = { ...base, spouseBirth: "" };
  const a = simulate(solo);
  const b = simulate({ ...solo, spNisaBal: 1000 * MAN, spTokuBal: 500 * MAN, spDivTokuY: 4, spNisaTsumitateM: 10 * MAN });
  b.rows.forEach((x, i) => {
    assert.equal(x.nw, a.rows[i].nw);
    assert.equal(x.divGross, 0);
    assert.equal(x.spNisa, 0);
  });
});

test("V6-10 受け取り始める年齢までは再投資（配当は入らない）。特定口座は再投資する配当にも20.315%がかかる", () => {
  const r = simulate({ ...base, tokuBal: 1000 * MAN, tokuR: 5, divTokuY: 3, divStartAge: 42 }).rows;
  const pre = 1 + (5 - 3 * 0.20315) / 100;
  assert.equal(r[0].divGross, 0);
  near(r[0].ass.toku, 1000 * MAN * pre, 1);
  assert.equal(r[1].divGross, 0);
  near(r[2].divGross, 1000 * MAN * pre * pre * 0.03, 1); // 42歳から受け取る
  near(r[2].ass.toku, 1000 * MAN * pre * pre * 1.02, 1);
  // NISAは再投資する配当も非課税なので、合計の利回りどおり
  const n = simulate({ ...base, nisaBal: 1000 * MAN, nisaR: 5, divNisaY: 3, divStartAge: 42 }).rows;
  near(n[0].ass.nisa, 1050 * MAN, 1);
});

test("V6-10b その年の積立は合計の利回りで増える（口座＋配当＝（年初＋積立）×（1＋合計））", () => {
  const r = simulate({ ...base, nisaBal: 1000 * MAN, nisaR: 5, divNisaY: 4, nisaTsumitateM: 10 * MAN, nisaGrowthM: 20 * MAN, nisaEndAge: 60 }).rows[0];
  near(r.ass.nisa + r.divGross, 1360 * MAN * 1.05, 1);
  const t = simulate({ ...base, spTokuBal: 1000 * MAN, tokuR: 5, spDivTokuY: 4, spSaveTokuM: 30 * MAN, spSaveTokuEndAge: 60 }).rows[0];
  near(t.ass.toku + t.divGross, 1360 * MAN * 1.05, 1);
  near(t.spToku, t.ass.toku, 1);
});

test("V6-11 本人と配偶者で配当の利回りが違えば、それぞれの値上がりで増える", () => {
  const r = simulate({ ...base, nisaBal: 1000 * MAN, spNisaBal: 1000 * MAN, nisaR: 5, divNisaY: 0, spDivNisaY: 4 }).rows[0];
  near(r.spNisa, 1010 * MAN, 1);
  near(r.ass.nisa, 1050 * MAN + 1010 * MAN, 1);
  near(r.divGross, 40 * MAN, 1);
});

test("V6-12 取り崩しは名義の割合で売る（配偶者の割合が保たれ、残高は負にならない）", () => {
  const retired: PlanInput = { ...base, jobs: [], cashBal: 100 * MAN, cashFloor: 100 * MAN, livingM: 30 * MAN, nisaBal: 6000 * MAN, spNisaBal: 4000 * MAN, nisaR: 0 };
  const rows = simulate(retired).rows;
  const drew = rows.filter((x) => x.draw > 0 && x.ass.nisa > 1);
  assert.ok(drew.length > 3);
  for (const x of drew) near(x.spNisa / x.ass.nisa, 0.4, 1e-9);
  assert.ok(rows.every((x) => x.spNisa >= 0 && x.spToku >= 0));
});

test("V6-13 今の価値に直すと、配当と配偶者の残高も物価で割り戻される", async () => {
  const { toRealValue } = await import("@/lib/v4/calc/realValue");
  const plan = { ...base, infl: 2, spTokuBal: 1000 * MAN, spDivTokuY: 4 };
  const nominal = simulate(plan);
  const real = toRealValue(nominal, plan);
  const i = 10;
  const f = Math.pow(1.02, nominal.rows[i].age - plan.curAge);
  near(real.rows[i].divGross, nominal.rows[i].divGross / f, 1);
  near(real.rows[i].spToku, nominal.rows[i].spToku / f, 1);
});

// ── ver6.2: 配偶者の勤務先・副業・iDeCo ──
const couple: PlanInput = {
  ...base,
  spouseWork: "work",
  spouseIncY: 400 * MAN,
  spouseIncStart: 25,
  spouseIncEnd: 60,
  spousePension: { mode: "auto", category: "kosei", koseiYears: 35, koseiAvgIncome: 400 * MAN, kokuminMonths: 480, manualMonth: 0 },
  useSpousePen: true,
  penStartB: 65,
};
const spJob = (o: Partial<PlanInput["jobs"][number]> = {}) => ({ name: "配偶者の勤務先", start: 25, end: 60, inc: 400 * MAN, raise: 0, sev: 0, sevAge: 60, sevMethod: "lump" as const, ...o });

test("V6-20 配偶者の勤務先を新しい形で入れても、同じ内容なら前の入れ方（年収・開始・終了）と同じ結果", () => {
  const a = simulate(couple);
  const b = simulate({ ...couple, spJobs: [spJob()] });
  a.rows.forEach((x, i) => {
    near(x.nw, b.rows[i].nw, 1e-6);
    near(x.taxWage, b.rows[i].taxWage, 1e-6);
  });
});

test("V6-21 配偶者の昇給: 年収は配偶者の年齢に沿って複利で増える", () => {
  const r = simulate({ ...couple, spJobs: [spJob({ raise: 2 })] }).rows;
  near(r[0].wageSpouse, 400 * MAN, 1);
  near(r[10].wageSpouse, 400 * MAN * Math.pow(1.02, 10), 1);
  // 配偶者は38歳 → 60歳になる年（本人62歳）から給与なし
  assert.equal(r.find((x) => x.age === 62)!.wageSpouse, 0);
  assert.ok(r.find((x) => x.age === 61)!.wageSpouse > 0);
});

test("V6-22 配偶者の退職金: 配偶者の勤続年数で退職所得控除を引く（本人が同じ条件で受け取るときと同じ税）", () => {
  // 勤続35年の控除は 800万＋70万×15＝1,850万。1,500万なら税0、3,000万なら (3,000−1,850)÷2 に課税
  const low = simulate({ ...couple, spJobs: [spJob({ sev: 1500 * MAN })] }).rows.find((x) => x.age === 62)!;
  near(low.sevGross, 1500 * MAN, 1);
  assert.equal(low.sevTax, 0);
  const high = simulate({ ...couple, spJobs: [spJob({ sev: 3000 * MAN })] }).rows.find((x) => x.age === 62)!;
  // 本人が 25〜60歳・退職金3,000万のとき（本人60歳＝同じ2046年ではないので、税額の式で確かめる）
  const selfSame = simulate({ ...base, jobs: [{ name: "勤務先", start: 25, end: 60, inc: 400 * MAN, raise: 0, sev: 3000 * MAN, sevAge: 60, sevMethod: "lump" }] }).rows.find((x) => x.age === 60)!;
  assert.ok(high.sevTax > 0);
  near(high.sevTax, selfSame.sevTax, 20_000); // 年による税制の差（防衛特別所得税など）の分だけ許容
});

test("V6-23 配偶者の副業は配偶者の所得として課税される（本人の副業に入れるより税が少ない）", () => {
  const asSpouse = simulate({ ...couple, spSideJobs: [{ name: "副業", start: 30, end: 60, inc: 100 * MAN }] }).rows[0];
  const asSelf = simulate({ ...couple, sideJobs: [{ name: "副業", start: 30, end: 65, inc: 100 * MAN }] }).rows[0];
  near(asSpouse.sideInc, 100 * MAN, 1);
  near(asSelf.sideInc, 100 * MAN, 1);
  // 本人は年収1,500万で税率が高いので、同じ100万でも配偶者の所得にしたほうが税が少ない
  assert.ok(asSpouse.taxWage < asSelf.taxWage - 5 * MAN);
});

test("V6-24 配偶者のiDeCo: 掛金は配偶者の所得から引かれ、残高は配偶者名義の内数。受取は配偶者の年齢で", () => {
  const off = simulate(couple);
  const on = simulate({ ...couple, spSaveDcM: 20000, spDcType: "employee-none", spDcStartAge: 60, spDcMethod: "lump", spDcJoinAge: 38 });
  const r0 = on.rows[0];
  assert.equal(r0.dcContribSelf, 24 * MAN);
  near(r0.spDc, 24 * MAN * (1 + couple.dcR / 100), 1);
  near(r0.ass.dc, r0.spDc, 1);
  // 所得控除: 24万×（所得税＋住民税）ぶん税が減る
  assert.ok(off.rows[0].taxWage - r0.taxWage > 3 * MAN);
  // 配偶者60歳（本人62歳）で一時金。受け取ると残高は0
  const pay = on.rows.find((x) => x.age === 62)!;
  assert.ok(pay.dcLump > 500 * MAN);
  assert.equal(pay.spDc, 0);
  near(pay.ass.dc, 0, 1e-6);
  // 掛金は60歳の前の年まで
  assert.equal(on.rows.find((x) => x.age === 61)!.dcContribSelf, 24 * MAN);
  assert.equal(pay.dcContribSelf, 0);
});

test("V6-25 本人と配偶者のDCは別々: 本人が受け取っても配偶者の残高は残る", () => {
  const r = simulate({ ...couple, dcBal: 500 * MAN, dcStartAge: 60, dcMethod: "lump", spDcBal: 300 * MAN, spDcStartAge: 65, spDcMethod: "lump" }).rows;
  const at60 = r.find((x) => x.age === 60)!;
  near(at60.dcLump, 500 * MAN * Math.pow(1 + couple.dcR / 100, 20), 1);
  near(at60.ass.dc, at60.spDc, 1);
  assert.ok(at60.spDc > 300 * MAN);
  // 配偶者65歳＝本人67歳で受け取る
  const at67 = r.find((x) => x.age === 67)!;
  assert.ok(at67.dcLump > 300 * MAN);
  assert.equal(at67.spDc, 0);
});

test("V6-26 配偶者が働いていない設定なら、残っている勤務先・副業は数えない。配偶者がいなければDCも数えない", () => {
  const none = simulate({ ...couple, spouseWork: "none", spJobs: [spJob()], spSideJobs: [{ name: "副業", start: 30, end: 60, inc: 100 * MAN }] }).rows[0];
  assert.equal(none.wageSpouse, 0);
  assert.equal(none.sideInc, 0);
  const solo = simulate({ ...couple, spouseBirth: "", spDcBal: 300 * MAN, spSaveDcM: 20000 }).rows[0];
  assert.equal(solo.spDc, 0);
  assert.equal(solo.ass.dc, 0);
  assert.equal(solo.dcContribSelf, 0);
});

test("V6-27 配偶者が亡くなる試算: 配偶者のDCと在職中の退職金（按分）が一時金として入り、以後の給与は0", () => {
  const plan: PlanInput = {
    ...couple,
    spJobs: [spJob({ sev: 1000 * MAN })],
    spDcBal: 300 * MAN,
    risk: { ...couple.risk, who: "spouse", deathAge: 50 },
  };
  const r = simulate(plan, { death: true }).rows;
  const at = r.find((x) => x.age === 50)!;
  const before = r.find((x) => x.age === 49)!;
  // 配偶者は48歳: 退職金 1,000万×(48−25)/(60−25)、DCは前年末の残高
  near(at.deathLump, 1000 * MAN * (23 / 35) + before.spDc, 1);
  assert.equal(at.spDc, 0);
  assert.equal(at.wageSpouse, 0);
});

test("V6-28 相続: 配偶者名義のDCは本人の遺産（退職手当金等）に入れない", () => {
  const plan = { ...couple, dcBal: 400 * MAN, spDcBal: 300 * MAN, inheritSet: { selfSharePct: 100, spouseMode: "legal" as const, smallLand: false } };
  const row = simulate(plan).rows[0];
  const b = estateBreakdown(plan, row, 1, 1, plan.inheritSet, true);
  near(b.retirementGross, row.ass.dc - row.spDc, 1);
});

// ── ver6.2 レビューで見つかった点 ──
test("V6-30 配偶者が亡くなる試算: 勤務先を新しい形で入れても、遺族厚生年金は前の入れ方と同じ", () => {
  const withKid: PlanInput = { ...couple, kids: [{ name: "子", birth: "2020-01-01", offset: 34, s: { k: "pub", e: "pub", j: "pub", h: "pub", u: "pub", g: "none" }, opt: { ronin: false, dorm: false, send: 0 } }], risk: { ...couple.risk, who: "spouse", deathAge: 50 }, spousePension: { ...couple.spousePension, koseiYears: 0, koseiAvgIncome: 0 } };
  const legacy = simulate(withKid, { death: true }).rows;
  const neo = simulate({ ...withKid, spJobs: [spJob()] }, { death: true }).rows;
  const sum = (rows: typeof legacy, k: "survKosei" | "survKiso") => rows.reduce((a, x) => a + x[k], 0);
  assert.ok(sum(legacy, "survKosei") > 0);
  near(sum(neo, "survKosei"), sum(legacy, "survKosei"), 1);
  near(sum(neo, "survKiso"), sum(legacy, "survKiso"), 1);
});

test("V6-31 働き方: 選んでも厚生年金の入力を壊さない", async () => {
  const { applySelfWork, applySpWork, selfWorkOf, spWorkOf, spDcTypeOf } = await import("@/lib/v4/calc/workStyle");
  // 本人「働いていない」は年金の種類を変えない（退職した元会社員の厚生年金が残る）
  const retired: PlanInput = { ...couple, jobs: [], selfPension: { mode: "auto", category: "kosei", koseiYears: 38, koseiAvgIncome: 600 * MAN, kokuminMonths: 480, manualMonth: 0 } };
  const p1 = { ...retired, ...applySelfWork(retired, "none") };
  assert.equal(p1.selfPension.category, "kosei");
  assert.equal(selfWorkOf(p1), "none");
  // 本人を自営業に変えても、厚生年金の配偶者は変えない。扶養の配偶者だけ国民年金に入れ替える
  const p2 = { ...couple, ...applySelfWork(couple, "self") };
  assert.equal(p2.spousePension.category, "kosei");
  const dep: PlanInput = { ...couple, spouseWork: "none", spousePension: { ...couple.spousePension, category: "dependent" } };
  const p3 = { ...dep, ...applySelfWork(dep, "self") };
  assert.equal(p3.spousePension.category, "kokumin");
  assert.equal(spWorkOf(p3), "none");
  const p4 = { ...p3, ...applySelfWork(p3, "employee") };
  assert.equal(p4.spousePension.category, "dependent");
  // 60歳以上の元会社員の配偶者が「働いていない」: 厚生年金のまま。60歳未満は扶養に
  assert.equal(applySpWork(couple, "none", "employee", 62).spousePension!.category, "kosei");
  assert.equal(applySpWork(couple, "none", "employee", 45).spousePension!.category, "dependent");
  // 表示は実際のデータを優先（保存した働き方と食い違っても、spouseWork が none なら「働いていない」）
  assert.equal(spWorkOf({ ...couple, spWork: "employee", spouseWork: "none" }), "none");
  assert.equal(spWorkOf({ ...couple, spWork: "part", spousePension: { ...couple.spousePension, category: "kosei" } }), "employee");
  // iDeCoの区分は、未設定なら年金の種類から
  assert.equal(spDcTypeOf(dep), "dependent");
  assert.equal(spDcTypeOf(couple), "employee-none");
  assert.equal(spDcTypeOf({ ...couple, spDcType: "employee-db" }), "employee-db");
});

test("V6-32 専業主婦（第3号）のiDeCoは月2.3万が上限のまま（区分を選んでいなくても）", () => {
  const dep: PlanInput = { ...couple, spouseWork: "none", spousePension: { ...couple.spousePension, category: "dependent" }, spSaveDcM: 50000 };
  const rows = simulate(dep).rows;
  assert.equal(rows[0].dcContribSelf, 23000 * 12);
  assert.equal(rows[3].dcContribSelf, 23000 * 12); // 2027年以降も2.3万
});

test("V6-33 簡易税モード: 所得のない配偶者のiDeCoで世帯の税は減らない", () => {
  const dep: PlanInput = { ...couple, taxMode: "simple", spouseWork: "none", spousePension: { ...couple.spousePension, category: "dependent" } };
  const off = simulate(dep).rows[0];
  const on = simulate({ ...dep, spSaveDcM: 23000 }).rows[0];
  near(on.taxWage, off.taxWage, 1);
});

test("V6-34 本人が亡くなる試算: 配偶者の会社掛金は続き、配偶者が自分で出す掛金は止まる", () => {
  const plan: PlanInput = { ...couple, spJobs: [spJob()], spDcType: "employee-dc", spSaveDcM: 10000, spDcEmployerM: 20000, risk: { ...couple.risk, who: "self", deathAge: 45 } };
  const r = simulate(plan, { death: true }).rows;
  const y44 = r.find((x) => x.age === 44)!;
  const y46 = r.find((x) => x.age === 46)!;
  const y47 = r.find((x) => x.age === 47)!;
  assert.equal(y44.dcContribSelf, 12 * MAN);
  assert.equal(y46.dcContribSelf, 0);
  // 46→47歳の残高は、会社掛金24万を足して運用した分だけ増える
  near(y47.spDc, (y46.spDc + 24 * MAN) * (1 + couple.dcR / 100), 1);
});

test("V6-35 配偶者のDC: 加入年齢が空欄なら注意を出し、受取開始を過ぎていても期間が逆転しない", () => {
  const old: PlanInput = { ...couple, spouseBirth: "1964-01-01", spouseWork: "none", spDcBal: 800 * MAN, spDcStartAge: 60, spDcMethod: "lump" };
  const r = simulate(old);
  assert.ok(r.warnings.some((w) => w.text.includes("加入した年齢")));
  // 62歳なので最初の年に受け取る
  near(r.rows[0].dcLump, 800 * MAN, 1);
  assert.ok(Number.isFinite(r.rows[0].dcTax) && r.rows[0].dcTax >= 0);
  // 加入年齢を入れれば（30歳から30年）控除1,500万で税0
  const ok = simulate({ ...old, spDcJoinAge: 30 });
  assert.equal(ok.rows[0].dcTax, 0);
  assert.ok(!ok.warnings.some((w) => w.text.includes("加入した年齢")));
});
