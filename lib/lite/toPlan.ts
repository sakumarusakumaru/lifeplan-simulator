// ver4 Lite の入力を、ver4 の計算エンジン（PlanInput）に変換する。
// Lite で聞かない項目は ver4 の「はじめての人」の値（EMPTY_PLAN）のまま。前提は LITE_ASSUMPTIONS
import { EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import type { Kid, PensionInput, PlanInput, SchoolType } from "@/lib/v4/calc/types";

import { LITE_ASSUMPTIONS as A, type LiteInput } from "./types";

const MAN = 10000;
const WORK_START = 22; // 厚生年金に入り始めた年齢の目安

// 今日の時点でちょうど age 歳になる誕生日（年齢だけ聞くので1月1日生まれとみなす）
const birthOf = (age: number) => `${new Date().getFullYear() - age}-01-01`;

// 毎月の返済額と残り年数から、ローン残高を逆算する（元利均等・金利は前提の値）
export function loanBalance(monthly: number, years: number, ratePct = A.loanRate) {
  const r = ratePct / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  return r === 0 ? monthly * n : (monthly * (1 - Math.pow(1 + r, -n))) / r;
}

function schools(edu: LiteInput["edu"]): Kid["s"] {
  const p: SchoolType = "pub";
  if (edu === "private") return { k: "pri", e: p, j: "pri", h: "pri", u: "pri", g: "none" };
  if (edu === "uniPrivate") return { k: p, e: p, j: p, h: p, u: "pri", g: "none" };
  return { k: p, e: p, j: p, h: p, u: p, g: "none" };
}

export function liteToPlan(q: LiteInput): PlanInput {
  const income = Math.max(0, q.income) * MAN;
  const spouseIncome = q.hasSpouse && q.spouseWork !== "none" ? Math.max(0, q.spouseIncome) * MAN : 0;
  const retire = Math.max(q.age, q.retireAge);
  const employee = q.work === "employee";

  // 年金: 会社員は22歳から働く年齢まで厚生年金、自営業は国民年金を満額納めたとみなす
  const selfPension: PensionInput = {
    ...EMPTY_PLAN.selfPension,
    mode: "auto",
    category: employee ? "kosei" : "kokumin",
    koseiYears: employee ? Math.max(0, Math.min(retire, 70) - WORK_START) : 0,
    koseiAvgIncome: employee ? income : 0,
    kokuminMonths: 480,
  };
  // 配偶者: 会社員なら厚生年金。パート・働いていない人は、本人が会社員なら扶養（第3号）、自営業なら国民年金
  const spouseKosei = q.spouseWork === "employee";
  const spouseDependent = !spouseKosei && q.spouseWork !== "self" && employee && spouseIncome < 130 * MAN;
  const spousePension: PensionInput = {
    ...EMPTY_PLAN.spousePension,
    mode: "auto",
    category: spouseKosei ? "kosei" : spouseDependent ? "dependent" : "kokumin",
    koseiYears: spouseKosei ? Math.max(0, 65 - WORK_START) : 0,
    koseiAvgIncome: spouseKosei ? spouseIncome : 0,
    kokuminMonths: 480,
  };

  const kids: Kid[] = q.kidAges.map((a, i) => ({
    name: `子${i + 1}`,
    birth: birthOf(a),
    offset: q.age - a,
    s: schools(q.edu),
    opt: { ronin: false, dorm: false, send: 50_000 },
  }));

  const owner = q.home !== "rent";
  const loan = q.home === "loan" && q.loanM > 0 && q.loanYears > 0;
  const investM = Math.max(0, q.investM) * MAN;
  const invest = Math.max(0, q.invest) * MAN;

  return {
    ...EMPTY_PLAN,
    selfBirth: birthOf(q.age),
    spouseBirth: q.hasSpouse ? birthOf(q.spouseAge) : "",
    curAge: q.age,
    endAge: A.endAge,
    infl: A.infl,
    spouseWork: spouseIncome > 0 ? "work" : "none",
    spouseIncY: spouseIncome,
    spouseIncStart: q.hasSpouse ? q.spouseAge : 30,
    spouseIncEnd: 65,
    useSpousePen: q.hasSpouse,
    jobs: [
      {
        name: employee ? "勤務先" : "事業",
        start: Math.min(q.age, WORK_START),
        end: retire,
        inc: income,
        raise: A.raise,
        sev: Math.max(0, q.severance) * MAN,
        sevAge: retire,
      },
    ],
    selfPension,
    spousePension,
    kids,
    livingM: Math.max(0, q.livingM) * MAN,
    rentM: q.home === "rent" ? Math.max(0, q.rentM) * MAN : 0,
    homeOwned: owner,
    homeTaxY: owner ? A.homeTaxY * MAN : 0,
    useHomeLoan: loan,
    hlBal: loan ? Math.round(loanBalance(q.loanM * MAN, q.loanYears)) : 0,
    hlRate: A.loanRate,
    hlTerm: loan ? q.loanYears : 30,
    hlStart: q.age,
    cashBal: Math.max(0, q.cash) * MAN,
    // 投資はまとめて新NISAに入っているとみなす（積立が枠を超えた分は特定口座へ）
    nisaBal: invest,
    nisaCost: 0,
    nisaR: A.investR,
    nisaSplit: { on: true, fundBal: invest, fundR: A.investR, stockBal: 0, stockR: 6.0, oldBal: 0, oldR: A.investR },
    nisaTsumitateM: Math.min(investM, 100_000),
    nisaGrowthM: Math.min(Math.max(0, investM - 100_000), 200_000),
    nisaEndAge: retire,
    nisaOverflowToToku: true,
    dcType: employee ? "employee-none" : "self-employed",
    risk: { ...EMPTY_PLAN.risk, deathAge: q.age },
  };
}

// ver4 に渡したあと「まだ入れていないこと」（精度を上げるための次の入力）
export const NEXT_INPUTS = [
  "ねんきん定期便の見込み額（年金を正確に）",
  "退職金・企業年金・iDeCo",
  "賞与や昇給の見込み、配偶者の働き方の変化",
  "保険（死亡保障・医療・学資・個人年金）",
  "車・旅行・リフォームなど大きな出費",
  "親からの相続・介護",
];
