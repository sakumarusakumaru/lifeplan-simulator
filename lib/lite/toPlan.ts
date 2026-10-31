// ver4 Lite の入力を、ver4 の計算エンジン（PlanInput）に変換する。
// Lite で聞かない項目は ver4 の「はじめての人」の値（EMPTY_PLAN）のまま。前提は LITE_ASSUMPTIONS
import { EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import type { Kid, LifeExpenseEvent, PensionInput, PlanInput, SchoolType } from "@/lib/v4/calc/types";

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

// 受け取りを早める・遅らせると年金額が変わる（繰上げ 1か月0.4%減・繰下げ 1か月0.7%増、60〜75歳）
export function pensionFactor(startAge: number) {
  const m = (Math.min(75, Math.max(60, startAge)) - 65) * 12;
  return m < 0 ? 1 + m * 0.004 : 1 + m * 0.007;
}

function schools(edu: LiteInput["edu"]): Kid["s"] {
  const p: SchoolType = "pub";
  if (edu === "private") return { k: "pri", e: p, j: "pri", h: "pri", u: "pri", g: "none" };
  if (edu === "uniPrivate") return { k: p, e: p, j: p, h: p, u: "pri", g: "none" };
  return { k: p, e: p, j: p, h: p, u: p, g: "none" };
}

export function liteToPlan(q: LiteInput): PlanInput {
  const year = new Date().getFullYear();
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
    koseiYears: spouseKosei ? Math.max(0, Math.min(q.spouseRetireAge, 70) - WORK_START) : 0,
    koseiAvgIncome: spouseKosei ? spouseIncome : 0,
    kokuminMonths: 480,
  };

  // ねんきん定期便の見込み額を入れたら、それを使う（受け取りを始める年齢で増減させる）
  if (q.pensionSelf > 0) Object.assign(selfPension, { mode: "manual", manualMonth: Math.round(q.pensionSelf * MAN * pensionFactor(q.penStart)) });
  if (q.hasSpouse && q.pensionSpouse > 0) Object.assign(spousePension, { mode: "manual", manualMonth: Math.round(q.pensionSpouse * MAN) });

  const kids: Kid[] = q.kidAges.map((a, i) => ({
    name: `子${i + 1}`,
    birth: birthOf(a),
    offset: q.age - a,
    s: schools(q.edu),
    opt: { ronin: false, dorm: false, send: 50_000 },
  }));
  // これから生まれる予定の子（1人目は futureKidsIn 年後、2人目からは2年おき）
  for (let i = 0; i < Math.max(0, Math.min(5, q.futureKids)); i++) {
    const inY = Math.max(0, q.futureKidsIn) + i * 2;
    kids.push({ name: `子${kids.length + 1}（予定）`, birth: `${year + inY}-01-01`, offset: q.age + inY, s: schools(q.edu), opt: { ronin: false, dorm: false, send: 50_000 } });
  }

  // 大きな出費の予定と、家を買うときの頭金・諸費用
  const lifeExpenses: LifeExpenseEvent[] = q.events
    .filter((e) => e.amount > 0 && e.age >= q.age)
    .map((e) => ({ age: e.age, amount: e.amount * MAN, label: e.label || "大きな出費" }));
  const buy = q.home === "rent" && q.buyHome && q.buyAge > q.age && q.buyPrice > 0;
  const buyLoan = buy ? Math.max(0, q.buyPrice - q.buyDown) * MAN : 0;
  const buyLoanYears = Math.max(5, Math.min(A.buyLoanYears, 80 - q.buyAge));
  if (buy) lifeExpenses.push({ age: q.buyAge, amount: (Math.min(q.buyDown, q.buyPrice) + (q.buyPrice * A.buyCostRate) / 100) * MAN, label: "家の頭金・諸費用" });

  const owner = q.home !== "rent" || buy;
  const upkeepM = q.homeType === "house" ? A.upkeepHouseM : A.upkeepMansionM;
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
    spouseIncEnd: q.spouseRetireAge,
    useSpousePen: q.hasSpouse,
    penStartA: Math.min(75, Math.max(60, q.penStart)),
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
    livingRetireM: q.retireLivingM > 0 ? q.retireLivingM * MAN : 0,
    livingRetireAge: retire,
    lifeExpenses,
    // 今の持ち家の維持費（マンションは管理費・修繕積立金、戸建ては修繕の積立）は詳細版の「家賃/管理費(月)」へ。
    // これから買う家は、買った年から家賃の欄が止まるので、維持費は固定資産税の欄に足す
    rentM: q.home === "rent" ? Math.max(0, q.rentM) * MAN : owner ? upkeepM * MAN : 0,
    homeOwned: owner,
    homeBuyAge: buy ? q.buyAge : 0,
    homeTaxY: owner ? (A.homeTaxY + (buy ? upkeepM * 12 : 0)) * MAN : 0,
    ...(buy
      ? {
          homePropType: q.homeType,
          homeStructure: q.homeType === "house" ? ("wood" as const) : ("rc" as const),
          homeBuiltYear: year + (q.buyAge - q.age),
          homePurchasePrice: q.buyPrice * MAN,
          homeLandRatio: q.homeType === "house" ? 50 : 30,
        }
      : {}),
    useHomeLoan: loan || buyLoan > 0,
    hlBal: loan ? Math.round(loanBalance(q.loanM * MAN, q.loanYears)) : buyLoan,
    hlRate: A.loanRate,
    hlTerm: loan ? q.loanYears : buyLoan > 0 ? buyLoanYears : 30,
    hlStart: buy ? q.buyAge : q.age,
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
    dcBal: Math.max(0, q.dcBal) * MAN,
    dcR: A.investR,
    saveDcM: Math.max(0, q.dcM) * MAN,
    dcJoinAge: q.age,
    saveDcEndAge: Math.min(retire, 65),
    dcStartAge: 65,
    risk: { ...EMPTY_PLAN.risk, deathAge: q.age },
  };
}
