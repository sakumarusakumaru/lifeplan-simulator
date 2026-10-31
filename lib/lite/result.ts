// ver4 Lite の結果: ver4 の計算エンジンで試算し、はじめての人向けの数字だけを取り出す（金額は今の価値）
import { generateLifeEvents } from "@/lib/v4/calc/generateLifeEvents";
import { runMonteCarlo } from "@/lib/v4/calc/montecarlo";
import { toRealValue } from "@/lib/v4/calc/realValue";
import { requiredCoverage, simulate } from "@/lib/v4/calc/simulate";
import type { PlanInput, YearlyResult } from "@/lib/v4/calc/types";

import { liteToPlan } from "./toPlan";
import type { LiteInput } from "./types";

// 現金・預金と投資（NISA・特定口座・DCなど）の合計。家やローンは入れない
export const finOf = (r: YearlyResult) => r.ass.c + r.ass.nisa + r.ass.toku + r.ass.k + r.ass.g + r.ass.dc;

function run(q: LiteInput) {
  const plan = liteToPlan(q);
  const sim = toRealValue(simulate(plan), plan);
  const at = (age: number) => sim.rows.find((r) => r.age === age) ?? sim.rows[sim.rows.length - 1];
  const last = sim.rows[sim.rows.length - 1];
  return {
    plan,
    rows: sim.rows,
    shortfallAge: sim.shortfallAge,
    retire: finOf(at(Math.max(q.age, q.retireAge))),
    final: last ? finOf(last) : 0,
    peak: Math.max(0, ...sim.rows.map(finOf)),
    nowBalance: sim.rows[0] ? sim.rows[0].income - sim.rows[0].exp : 0,
  };
}

// 結果の要約だけ（スマホの下の帯用）
export const liteBase = (q: LiteInput) => run(q);

export interface LiteTip {
  label: string;
  shortfallAge: number | null;
  final: number;
  gain: number; // 100歳時点のお金の増え方（今の価値）
}

// 条件を満たす最小の値を、0.5万円きざみで二分探索する（ok(hi) が偽なら null）
function solve(ok: (x: number) => boolean, hi: number): number | null {
  if (!ok(hi)) return null;
  let lo = 0;
  while (hi - lo > 0.5) {
    const mid = Math.round(((lo + hi) / 2) * 2) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function liteResult(q: LiteInput) {
  const base = run(q);
  // 足りない人: 100歳まで足りるには、毎月の積立をあといくら増やせばよいか（働いている間）
  const needMonthly = base.shortfallAge !== null ? solve((x) => run({ ...q, investM: q.investM + x }).shortfallAge === null, 60) : null;
  // 足りる人: 生活費を月いくらまで増やしても100歳まで足りるか（余裕）
  const room =
    base.shortfallAge === null
      ? (() => {
          const fails = (x: number) => run({ ...q, livingM: q.livingM + x, retireLivingM: q.retireLivingM > 0 ? q.retireLivingM + x : 0 }).shortfallAge !== null;
          const firstFail = solve(fails, 50);
          return firstFail === null ? 50 : Math.max(0, firstFail - 0.5);
        })()
      : null;
  // 3つの小さな行動で、どれだけ変わるか
  const variants: { label: string; q: LiteInput; ok: boolean }[] = [
    { label: "生活費を月1万円へらす", q: { ...q, livingM: Math.max(0, q.livingM - 1) }, ok: q.livingM >= 1 },
    { label: "積立を月1万円ふやす", q: { ...q, investM: q.investM + 1 }, ok: q.investM + 1 <= 30 },
    { label: "2年長く働く", q: { ...q, retireAge: q.retireAge + 2 }, ok: q.retireAge + 2 <= 75 },
  ];
  const tips: LiteTip[] = variants
    .filter((v) => v.ok)
    .map((v) => {
      const r = run(v.q);
      return { label: v.label, shortfallAge: r.shortfallAge, final: r.final, gain: r.final - base.final };
    });
  return {
    ...base,
    tips,
    needMonthly,
    room,
    accuracy: liteAccuracy(q),
    events: liteEvents(base.plan),
    lifetime: liteLifetime(base.rows),
    teasers: liteTeasers(q, base),
  };
}

// グラフに付ける、その人のできごと（子どもの大学入学・家を買う・ローン完済・働き終わる・年金など）
export function liteEvents(plan: PlanInput): { age: number; label: string }[] {
  const ev = generateLifeEvents(plan).map((e) => ({
    age: e.age,
    label: e.label.replace(/^(勤務先|事業)退職/, "働き終わる").replace("年金受給", "年金が始まる").replace("配偶者年金", "配偶者の年金が始まる"),
  }));
  if (plan.homeBuyAge && plan.homeBuyAge > plan.curAge) ev.push({ age: plan.homeBuyAge, label: "家を買う" });
  // 同じ年齢はまとめる
  const byAge = new Map<number, string>();
  for (const e of ev) byAge.set(e.age, byAge.has(e.age) ? `${byAge.get(e.age)}・${e.label}` : e.label);
  return [...byAge].map(([age, label]) => ({ age, label })).sort((a, b) => a.age - b.age).slice(0, 8);
}

// 一生で動かすお金の総額（今の価値）
export function liteLifetime(rows: YearlyResult[]) {
  const sum = (f: (r: YearlyResult) => number) => rows.reduce((a, r) => a + f(r), 0);
  return {
    income: sum((r) => r.income), // 手取りの収入（給与・年金・退職金など、税と社会保険料を引いたあと）
    tax: sum((r) => r.taxWage + r.sevTax + r.dcTax + r.saleTax), // 税金と社会保険料
    edu: sum((r) => r.edu),
    home: sum((r) => r.home),
    pension: sum((r) => r.penNet),
    living: sum((r) => r.basic + r.special),
  };
}

export interface LiteTeaser {
  key: string;
  title: string; // 何についての数字か
  value: string; // その人の数字
  note: string; // 何を前提にした粗い数字か
  more: string; // 詳細版で何ができるか
}

const manOf = (yen: number) => {
  const v = Math.round(yen / 10000);
  return Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1)}億円` : `${v.toLocaleString()}万円`;
};

// 詳細版でわかることを、その人の数字で予告する（Liteの少ない入力から出した粗い数字）
export function liteTeasers(q: LiteInput, base: ReturnType<typeof run>): LiteTeaser[] {
  const plan = base.plan;
  const out: LiteTeaser[] = [];
  const r0 = base.rows[0];

  // 税金と社会保険料（今年）
  const gross = (q.income + (q.hasSpouse && q.spouseWork !== "none" ? q.spouseIncome : 0)) * 10000;
  if (r0 && gross > 0 && r0.taxWage > 0) {
    const pct = Math.round((1 - r0.taxWage / gross) * 100);
    out.push({
      key: "tax",
      title: "いまの手取り",
      value: `額面の約${pct}%（税金と社会保険料は年約${manOf(r0.taxWage)}）`,
      note: "所得税・住民税・社会保険料を2026年の制度で計算。控除は基本的なものだけ",
      more: "iDeCo・住宅ローン控除・生命保険料控除・副業まで入れると、手取りが変わります",
    });
  }

  // もしも（配偶者か子どもがいる人）
  if (q.hasSpouse || q.kidAges.length + q.futureKids > 0) {
    const dPlan: PlanInput = { ...plan, risk: { ...plan.risk, who: "self", deathAge: q.age } };
    const dead = simulate(dPlan, { death: true }).rows.find((r) => r.dead && r.survKiso + r.survKosei + r.survChukorei > 0);
    const monthly = dead ? Math.round((dead.survKiso + dead.survKosei + dead.survChukorei) / 12) : 0;
    const need = requiredCoverage(dPlan);
    out.push({
      key: "death",
      title: "あなたが今亡くなった場合",
      value: `${monthly > 0 ? `遺族年金は月約${manOf(monthly)}` : "遺族年金はほぼ出ない計算"}。${need === null ? "亡くならなくても足りなくなる計算のため、足りない保障額は出していません" : need === Infinity ? "保険金をいくら足しても足りない計算" : need > 0 ? `足りない保障の目安は約${manOf(need)}` : "保険がなくても足りる計算"}`,
      note: `加入中の保険は入れていない（Liteでは聞いていないため）。配偶者が${q.hasSpouse ? (q.spouseSex === "male" ? "夫" : "妻") : "いない"}、生活費は今の7割として計算`,
      more: "入っている保険・団信・亡くなる年齢・配偶者が亡くなった場合まで入れて、必要な保障額と相続を確かめられます",
    });
  }

  // 条件を重ねる
  if (q.penStart < 70 && q.retireAge + 2 <= 75) {
    const r = run({ ...q, retireAge: q.retireAge + 2, penStart: 70 });
    out.push({
      key: "combo",
      title: "2年長く働き、年金を70歳から受け取ると",
      value:
        r.shortfallAge === base.shortfallAge
          ? `${r.shortfallAge === null ? `${plan.endAge}歳まで足りるのは同じで` : `足りなくなる年齢は${r.shortfallAge}歳のままで`}、${plan.endAge}歳のお金が約${manOf(Math.abs(r.final - base.final))}${r.final >= base.final ? "多く" : "少なく"}なる`
          : r.shortfallAge === null
            ? `${plan.endAge}歳まで足りる計算になる（いまは${base.shortfallAge}歳で足りなくなる）`
            : `足りなくなる年齢が${r.shortfallAge}歳に（いまは${base.shortfallAge ?? `${plan.endAge}歳まで足りる`}${base.shortfallAge ? "歳" : ""}）`,
      note: "2つの条件を同時に変えた試算",
      more: "働く年数・年金・積立・生活費など20近い条件を、いくつでも重ねて比べられます",
    });
  }

  // 教育費のピーク
  if (q.kidAges.length + q.futureKids > 0) {
    const peak = base.rows.reduce((m, r) => (r.edu > m.edu ? r : m), base.rows[0]);
    if (peak && peak.edu > 0) {
      out.push({
        key: "edu",
        title: "教育費がいちばん多い年",
        value: `あなたが${peak.age}歳の年に、年約${manOf(peak.edu)}`,
        note: "学校の選び方の答えと、文部科学省などの調査の平均から",
        more: "子どもごとに、幼稚園から大学院まで公立・私立・下宿・浪人・塾代を選べます",
      });
    }
  }

  // 金利が上がったら（ローンがある人）
  if (plan.useHomeLoan) {
    const up = toRealValue(simulate({ ...plan, hlRate: plan.hlRate + 1 }), plan);
    const last = up.rows[up.rows.length - 1];
    const diff = (last ? finOf(last) : 0) - base.final;
    out.push({
      key: "rate",
      title: "住宅ローンの金利が1%上がると",
      value: `100歳のお金が約${manOf(Math.abs(diff))}${diff < 0 ? "少なくなる" : "変わる"}${up.shortfallAge && up.shortfallAge !== base.shortfallAge ? `。${up.shortfallAge}歳で足りなくなる計算` : ""}`,
      note: "今から返し終わるまで、ずっと1%高い場合",
      more: "金利の上昇・物価の上昇・大暴落・年金の目減りを選んで、全部の結果を計算し直せます",
    });
  }
  return out;
}

// 運用が毎年上下した場合（1,000通り）。重いので、押したときだけ計算する
export function liteMonteCarlo(q: LiteInput) {
  const r = runMonteCarlo(liteToPlan(q), "balanced");
  return { rate: Math.round(r.successRate * 100), worst: r.worstDepletionAge };
}

export type LiteResult = ReturnType<typeof liteResult>;

// 入力の充実度: 必須の14問で60%。任意の項目に答えるほど上がる（「ない」と答えたのも答えたことにする）。計算の正しさではない
export function liteAccuracy(q: LiteInput) {
  const items: { key: string; label: string; w: number; done: boolean }[] = [
    // 50歳未満は定期便の額を入れないほうが近い（自動計算をすすめている）ので、入れなくても達成とみなす
    { key: "pension", label: "ねんきん定期便の見込み額", w: 12, done: q.pensionSelf > 0 || q.age < 50 },
    ...(q.hasSpouse ? [{ key: "pensionSpouse", label: "配偶者の年金の見込み額", w: 6, done: q.pensionSpouse > 0 }] : []),
    { key: "retireLiving", label: "働き終わったあとの生活費", w: 8, done: !!q.ans.retireLiving },
    { key: "dc", label: "iDeCo・企業型DC", w: 5, done: !!q.ans.dc },
    { key: "kidsPlan", label: "子どもの予定", w: 3, done: !!q.ans.kidsPlan },
    ...(q.home === "rent" ? [{ key: "homePlan", label: "家を買う予定", w: 3, done: !!q.ans.homePlan }] : []),
    { key: "events", label: "大きな出費の予定", w: 3, done: !!q.ans.events },
  ];
  const total = items.reduce((a, x) => a + x.w, 0);
  const got = items.filter((x) => x.done).reduce((a, x) => a + x.w, 0);
  const pct = Math.round(60 + (40 * got) / Math.max(1, total));
  const next = items.filter((x) => !x.done).sort((a, b) => b.w - a.w)[0]?.label ?? null;
  return { pct, next };
}
