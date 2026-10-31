// 計算エンジン全体の検証テスト（ver5.8 で直した所が元に戻らないように）
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_PLAN } from "@/lib/v4/calc/defaults";
import { planInheritance } from "@/lib/v4/calc/inheritance";
import { deflator, toRealValue } from "@/lib/v4/calc/realValue";
import { requiredCoverage, simulate } from "@/lib/v4/calc/simulate";
import type { PlanInput } from "@/lib/v4/calc/types";

const MAN = 10000;
// 35歳・配偶者32歳（3歳下）のサンプル
const base: PlanInput = { ...DEFAULT_PLAN, selfBirth: "1991-05-10", spouseBirth: "1994-08-01", curAge: 35 };

test("ENG-01 お金が足りなくなる年齢 = 預金がマイナスになる最初の年（売れる資産を売り切ったあと）", () => {
  const r = simulate({ ...base, livingM: 60 * MAN });
  const first = r.rows.find((x) => x.ass.c < 0);
  assert.equal(r.shortfallAge, first?.age ?? null);
  assert.ok(r.shortfallAge !== null);
  const row = r.rows.find((x) => x.age === r.shortfallAge)!;
  assert.equal(row.ass.nisa + row.ass.toku + row.ass.g + row.ass.k, 0); // 売れる投資は残っていない
});

test("ENG-02 本人が亡くなる試算は、年下の配偶者が最終年齢になるまで続く", () => {
  const d = simulate({ ...base, risk: { ...base.risk, who: "self", deathAge: 40 } }, { death: true });
  const spouseAgeNow = 32;
  assert.equal(d.rows[d.rows.length - 1].age, base.endAge + (base.curAge - spouseAgeNow));
});

test("ENG-03 必要保障額: 亡くならなくても足りなくなるプランは出さない（null）", () => {
  const p = { ...base, livingM: 60 * MAN, risk: { ...base.risk, who: "self" as const, deathAge: 40 } };
  assert.ok(simulate(p).shortfallAge !== null);
  assert.equal(requiredCoverage(p), null);
});

test("ENG-04 相続は名目で計算してから今の価値に割り戻す（二重に割り戻さない）", () => {
  // 家・不動産・保険を外し、金融資産だけの相続にして比べる
  const p: PlanInput = { ...base, homeOwned: false, useHomeLoan: false, res: [], ins: [] };
  const r = simulate(p);
  const age = 70;
  const row = r.rows.find((x) => x.age === age)!;
  const f = deflator(p, age);
  const realOk = planInheritance(p, row, true, 0, f).breakdown.total;
  const nominal = planInheritance(p, row, true, 0, 1).breakdown.total;
  assert.ok(Math.abs(realOk - nominal / f) < 1, "今の価値 = 名目 ÷ 物価の倍率");
  // 換算済みの行を渡すと二重になる（画面ではこれをしない）
  const realRow = toRealValue(r, p).rows.find((x) => x.age === age)!;
  const doubled = planInheritance(p, realRow, true, 0, f).breakdown.total;
  assert.ok(doubled < realOk);
});

test("ENG-05 退職所得の勤続年数は、勤め先の間の空白を数えない", () => {
  // 22〜30歳（8年）と40〜60歳（20年）→ 28年。退職金は合わせて3,000万を60歳で
  // 控除 800万+70万×8 = 1,360万 → (3,000万−1,360万)÷2 = 820万
  // 所得税 820万×23%−63.6万 = 125万。60歳は2051年なので付加税は1%（防衛特別所得税だけ）= 12,500円、住民税82万 → 2,082,500円
  const p: PlanInput = {
    ...base,
    saveDcM: 0,
    dcBal: 0,
    dcEmployerM: 0,
    jobs: [
      { ...base.jobs[0], name: "A", start: 22, end: 30, sev: 1000 * MAN, sevAge: 60 },
      { ...base.jobs[0], name: "B", start: 40, end: 60, sev: 2000 * MAN, sevAge: 60 },
    ],
  };
  const row = simulate(p).rows.find((x) => x.age === 60)!;
  assert.equal(Math.round(row.sevTax), 2_082_500);
});

test("ENG-06 働き終わったあとの生活費: 切り替える年齢が未入力なら、最後に働き終わる年齢で切り替える", () => {
  const p: PlanInput = { ...base, livingM: 20 * MAN, livingRetireM: 15 * MAN, livingRetireAge: undefined };
  const r = simulate(p);
  const end = Math.max(...p.jobs.map((j) => j.end));
  const before = r.rows.find((x) => x.age === end - 1)!;
  const after = r.rows.find((x) => x.age === end)!;
  const inflAt = (age: number) => Math.pow(1 + p.infl / 100, age - p.curAge);
  assert.ok(Math.abs(before.basicL - 20 * MAN * 12 * inflAt(end - 1)) < 1);
  assert.ok(Math.abs(after.basicL - 15 * MAN * 12 * inflAt(end)) < 1);
});
