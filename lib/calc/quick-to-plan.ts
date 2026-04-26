import { DEFAULT_PLAN } from "./defaults";
import type { QuickInput } from "./quick-types";
import type { PlanInput } from "./types";

const TAX_RATE = 20;

export function quickToPlan(q: QuickInput): PlanInput {
  const baseYear = new Date().getFullYear();
  const selfBirth = `${baseYear - q.curAge}-07-01`;
  const spouseBirth = q.hasSpouse ? `${baseYear - q.spouseAge}-07-01` : `${baseYear - 35}-07-01`;

  // net → gross
  const selfGrossY = Math.round((q.selfIncomeNet / (1 - TAX_RATE / 100)) * 10000);
  const spouseGrossY = q.hasSpouse && q.spouseIncomeNet > 0
    ? Math.round((q.spouseIncomeNet / (1 - TAX_RATE / 100)) * 10000)
    : 0;

  // assets split: 50% cash / 30% fund / 20% stock
  const totalYen = q.totalAssets * 10000;
  const cashBal = Math.round(totalYen * 0.5);
  const fundBal = Math.round(totalYen * 0.3);
  const stockBal = Math.round(totalYen * 0.2);

  // pension: assume started working at 22
  const workStartAge = 22;
  const totalKoseiYears = Math.max(0, q.workEndAge - workStartAge);
  const kokuminMonths = Math.min(480, totalKoseiYears * 12);

  // spouse pension category
  const spousePensionCategory = q.hasSpouse && q.spouseIncomeNet > 0 ? "kosei" : "dependent";
  const spouseKoseiYears = spousePensionCategory === "kosei"
    ? Math.max(0, q.workEndAge - workStartAge)
    : 0;

  // kids: all public school
  const kids = q.kidAges.map((kidAge, i) => ({
    name: `子${i + 1}`,
    birth: `${baseYear - kidAge}-07-01`,
    offset: q.curAge - kidAge,
    s: { k: "pub" as const, e: "pub" as const, j: "pub" as const, h: "pub" as const, u: "pub" as const },
    opt: { ronin: false, grad: false, dormU: false, dormG: false, send: 100000 },
  }));

  // living cost: average of current and retirement target
  const livingM = Math.round((q.livingM + q.retireLivingM) / 2) * 10000;

  const hlBal = q.hasHomeLoan && q.hlBal > 0 ? q.hlBal * 10000 : 0;

  // retirement bonus: 2 years of gross salary
  const sevAmt = selfGrossY * 2;

  const spouseIncStart = q.hasSpouse ? q.spouseAge : 30;
  const spouseIncEnd = q.hasSpouse
    ? q.spouseAge + Math.max(0, q.workEndAge - q.curAge)
    : 65;

  return {
    ...DEFAULT_PLAN,
    baseDate: `${baseYear}-07-01`,
    selfBirth,
    spouseBirth,
    curAge: q.curAge,
    endAge: 100,
    taxRate: TAX_RATE,
    taxMode: "simple",
    inheritances: [],
    lifeExpenses: [],
    otherLoans: [],
    careEvents: [],
    infl: 1.0,
    cashFloor: 2_000_000,
    allowNegCash: false,
    drawOrder: "auto-tiered",
    drawCustomOrder: ["f", "s", "dc", "k"],

    cashBal,
    cashRate: 0.001,
    fundBal,
    fundR: 4.0,
    saveFundM: 0,
    saveFundEndAge: 60,
    stockBal,
    stockR: 5.0,
    saveStockM: 0,
    saveStockEndAge: 60,
    cryptoBal: 0,
    cryptoR: 0,
    saveCryptoM: 0,
    saveCryptoEndAge: 60,
    dcBal: 0,
    dcR: 4.0,
    saveDcM: 0,
    saveDcEndAge: 60,

    jobs: [{
      name: "現職",
      start: q.curAge,
      end: q.workEndAge,
      inc: selfGrossY,
      sev: sevAmt,
      sevAge: q.workEndAge,
    }],
    sideJobs: [],

    spouseWork: q.hasSpouse && q.spouseIncomeNet > 0 ? "work" : "none",
    spouseIncY: spouseGrossY,
    spouseIncStart,
    spouseIncEnd,

    penStartA: 65,
    penAmtA: 0,
    penStartB: 65,
    penAmtB: 0,
    useSpousePen: q.hasSpouse,
    selfPension: {
      mode: "auto",
      category: "kosei",
      koseiYears: totalKoseiYears,
      koseiAvgIncome: selfGrossY,
      kokuminMonths,
      manualMonth: 0,
    },
    spousePension: {
      mode: "auto",
      category: spousePensionCategory,
      koseiYears: spouseKoseiYears,
      koseiAvgIncome: spouseGrossY,
      kokuminMonths: Math.min(480, spouseKoseiYears * 12),
      manualMonth: 0,
    },

    livingM,
    specialY: 0,
    rentM: 0,
    homeTaxY: 0,
    useHomeLoan: q.hasHomeLoan && hlBal > 0,
    hlBal,
    hlRate: q.hlRate,
    hlTerm: q.hlRemainYears,
    hlStart: q.curAge,

    kids,
    res: [],
    ins: [],
    lifeEvents: [],
    jukuM: DEFAULT_PLAN.jukuM,
  };
}
