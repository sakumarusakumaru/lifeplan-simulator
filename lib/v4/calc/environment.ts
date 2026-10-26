// シナリオ比較の「外的環境」。自分では選べない世の中の変化を重ねて試算する。
//   大暴落: N年に1度、その年の株式・投信・DCが約4割下落（リーマン・ショック級）。暗号資産は約6割
//   金利上昇: 住宅ローン・不動産ローン金利が上がる（変動金利を想定し、今から上乗せ）。預金金利も半分だけ上がる
//   物価: 物価上昇率を置き換え。年金は物価の7割しか追いつかない、給与は据え置きとみなす（厳しめ）
//   運用の低迷: NISA・特定口座・DCの想定利回りを下げる
//   年金の目減り: 年金額の改定率を下げる（マクロ経済スライドの強化など）
import type { PlanInput } from "./types";

export interface EnvInput {
  crashEvery: number; // 0 = なし / 7・10・15・20 年に1度
  rateUp: number;     // 金利の上昇幅（%）
  infl: number;       // 0 = 入力どおり / 2・3・4（%）
  returnDown: number; // 運用利回りの低下（%）
  penCut: number;     // 年金改定率の低下（%/年）
}

export const ENV_NONE: EnvInput = { crashEvery: 0, rateUp: 0, infl: 0, returnDown: 0, penCut: 0 };

export const ENV_OPTIONS: {
  key: keyof EnvInput;
  label: string;
  note: string;
  choices: { value: number; label: string }[];
}[] = [
  {
    key: "crashEvery",
    label: "大暴落（リーマン・ショック級）",
    note: "その年、株式・投信・DCが約4割下がる",
    choices: [
      { value: 0, label: "なし" },
      { value: 20, label: "20年に1度" },
      { value: 15, label: "15年に1度" },
      { value: 10, label: "10年に1度" },
      { value: 7, label: "7年に1度" },
    ],
  },
  {
    key: "rateUp",
    label: "金利の上昇",
    note: "住宅ローン・不動産ローン（変動金利を想定）に上乗せ",
    choices: [
      { value: 0, label: "なし" },
      { value: 0.5, label: "+0.5%" },
      { value: 1, label: "+1%" },
      { value: 2, label: "+2%" },
    ],
  },
  {
    key: "infl",
    label: "物価の上昇",
    note: "給与は据え置き、年金は物価の7割しか上がらないとみなす",
    choices: [
      { value: 0, label: "入力どおり" },
      { value: 2, label: "年2%" },
      { value: 3, label: "年3%" },
      { value: 4, label: "年4%" },
    ],
  },
  {
    key: "returnDown",
    label: "運用の低迷",
    note: "NISA・特定口座・DCの想定利回りを下げる",
    choices: [
      { value: 0, label: "なし" },
      { value: 1, label: "−1%" },
      { value: 2, label: "−2%" },
    ],
  },
  {
    key: "penCut",
    label: "年金の目減り",
    note: "年金額の改定率を毎年下げる（30年で約14〜26%減）",
    choices: [
      { value: 0, label: "なし" },
      { value: 0.5, label: "年0.5%" },
      { value: 1, label: "年1%" },
    ],
  },
];

export function envActive(env: EnvInput): boolean {
  return Object.values(env).some((v) => v !== 0);
}

export function applyEnvPlan(plan: PlanInput, env: EnvInput): PlanInput {
  if (!envActive(env)) return plan;
  const p: PlanInput = { ...plan };
  if (env.rateUp) {
    p.hlRate = plan.hlRate + env.rateUp;
    p.res = plan.res.map((r) => ({ ...r, rate: r.rate + env.rateUp }));
    p.cashRate = plan.cashRate + env.rateUp / 2 / 100;
  }
  if (env.infl && env.infl !== plan.infl) {
    const d = env.infl - plan.infl;
    p.infl = env.infl;
    p.penIndex = (plan.penIndex ?? 0) + d * 0.7;
  }
  if (env.returnDown) {
    p.nisaR = plan.nisaR - env.returnDown;
    p.tokuR = plan.tokuR - env.returnDown;
    p.dcR = plan.dcR - env.returnDown;
  }
  if (env.penCut) p.penIndex = (p.penIndex ?? plan.penIndex ?? 0) - env.penCut;
  return p;
}

// 大暴落の年だけ下落させる利回りの列（それ以外の年は入力どおり）。最初の暴落は周期の半分の年
export function envReturns(plan: PlanInput, env: EnvInput) {
  if (!env.crashEvery) return undefined;
  const years = Math.max(1, plan.endAge - plan.curAge + 1);
  const sec: number[] = [];
  const gold: number[] = [];
  const crypto: number[] = [];
  const first = Math.round(env.crashEvery / 2);
  for (let t = 0; t < years; t++) {
    const crash = t >= first && (t - first) % env.crashEvery === 0;
    sec.push(crash ? -0.42 : 0);
    gold.push(0);
    crypto.push(crash ? -0.6 : 0);
  }
  return { sec, gold, crypto };
}

export function crashAges(plan: PlanInput, env: EnvInput): number[] {
  if (!env.crashEvery) return [];
  const first = Math.round(env.crashEvery / 2);
  const out: number[] = [];
  for (let t = first; t <= plan.endAge - plan.curAge; t += env.crashEvery) out.push(plan.curAge + t);
  return out;
}
