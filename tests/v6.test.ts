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

test("V6-04 配当: 特定口座は20.315%を引いて、NISAは非課税で現金に入る", () => {
  const plan = { ...base, nisaBal: 1000 * MAN, tokuBal: 0, spTokuBal: 5000 * MAN };
  const noDiv = simulate(plan);
  const div = simulate({ ...plan, divNisaY: 3, spDivTokuY: 4 });
  const r = div.rows[0];
  near(r.divGross, 230 * MAN, 1);
  near(r.divTax, 200 * MAN * 0.20315, 1);
  near(r.income - noDiv.rows[0].income, 230 * MAN - 200 * MAN * 0.20315, 1);
  // 受け取った分だけ現金が増える（口座の値上がりは同じ）
  near(r.ass.c - noDiv.rows[0].ass.c, (230 * MAN - 200 * MAN * 0.20315) * (1 + base.cashRate * (1 - 0.20315)), 1);
  near(r.ass.toku, noDiv.rows[0].ass.toku, 1);
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
