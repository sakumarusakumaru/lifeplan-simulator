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
