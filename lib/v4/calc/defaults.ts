import type { PlanInput } from "./types";

export const DEFAULT_PLAN: PlanInput = {
  baseDate: "",
  selfBirth: "",
  spouseBirth: "",
  spouseWork: "work",
  spouseIncY: 0,
  spouseIncStart: 30,
  spouseIncEnd: 60,
  curAge: 35,
  endAge: 100,
  infl: 1.5,
  taxRate: 20,
  taxRatePen: 10,
  taxMode: "detailed",
  inheritances: [],
  lifeExpenses: [],
  otherLoans: [],
  careEvents: [],
  cashFloor: 2_000_000,
  allowNegCash: false,
  drawOrder: "auto",
  drawCustomOrder: ["toku", "g", "k", "nisa"],

  jukuM: { pre: 15000, e13: 35000, e46: 50000, jh: 70000, hs: 80000, ronin: 120000 },

  cashBal: 5_000_000,
  cashRate: 0.002,               // 普通・定期預金の金利（2026年の水準で年0.2%程度）

  // NISA口座（非課税）
  nisaBal: 0,
  nisaCost: 0,
  nisaR: 4.0,
  nisaTsumitateM: 50_000,        // つみたて投資枠（月10万まで）
  nisaGrowthM: 0,                // 成長投資枠（月20万まで）
  nisaEndAge: 60,
  nisaSplit: { on: false, fundBal: 0, fundR: 4.0, stockBal: 0, stockR: 6.0 },

  // 特定口座（課税）
  tokuBal: 3_000_000,
  tokuCost: 0,
  tokuR: 4.0,
  saveTokuM: 0,
  saveTokuEndAge: 60,
  tokuSplit: { on: false, fundBal: 0, fundR: 4.0, stockBal: 0, stockR: 6.0 },
  nisaOverflowToToku: true,

  cryptoBal: 0,
  cryptoCost: 0,
  cryptoR: 0,
  cryptoTaxRate: 30,
  saveCryptoM: 0,
  saveCryptoEndAge: 60,

  goldBal: 0,
  goldCost: 0,
  goldR: 3.0,
  saveGoldM: 0,
  saveGoldEndAge: 60,

  // iDeCo・企業型DC
  dcType: "employee-none",
  dcBal: 0,
  dcR: 4.0,
  saveDcM: 0,
  dcEmployerM: 0,
  saveDcEndAge: 65,
  dcJoinAge: 35,
  dcStartAge: 65,
  dcMethod: "lump",
  dcYears: 10,

  childAllowance: true,
  penIndex: 1.0,                 // 物価1.5%に対しマクロ経済スライドで年金は低めに改定
  hlDeduct: false,
  hlDeductEndAge: 48,
  hlDeductLimit: 30_000_000,

  mcRisk: "balanced",

  risk: {
    who: "self",
    deathAge: 35,
    spouseSex: "female",
    livingRate: 70,              // FPの目安: 子ありで現在の7割、夫婦のみで6割
    danshin: true,
    deathInsurance: 0,
    incomeProtM: 0,
    incomeProtEndAge: 60,
  },

  jobs: [
    { name: "現職", start: 30, end: 60, inc: 6_000_000, raise: 2.0, sev: 10_000_000, sevAge: 60 },
  ],
  sideJobs: [{ name: "副業", start: 35, end: 50, inc: 500_000 }],
  penStartA: 65,
  penAmtA: 150000,
  useSpousePen: true,
  penStartB: 65,
  penAmtB: 60000,
  selfPension: {
    mode: "auto",
    category: "kosei",
    koseiYears: 38,
    koseiAvgIncome: 6_000_000,
    kokuminMonths: 480,
    manualMonth: 150_000,
  },
  spousePension: {
    mode: "auto",
    category: "dependent",
    koseiYears: 0,
    koseiAvgIncome: 0,
    kokuminMonths: 480,
    manualMonth: 60_000,
  },

  livingM: 200000,
  specialY: 500000,
  rentM: 20000,                  // 持ち家なので管理費・修繕積立金相当（賃貸なら家賃）
  homeTaxY: 0,
  useHomeLoan: true,
  hlBal: 30_000_000,
  hlRate: 0.7,
  hlTerm: 30,
  hlStart: 35,

  homeOwned: true,
  homePropType: "house",
  homeStructure: "wood",
  homeBuiltYear: new Date().getFullYear() - 5,
  homePurchasePrice: 0,
  homeLandRatio: 50,
  homeCurrentValueOverride: 0,

  lifeEvents: [],
  kids: [],
  res: [
    {
      name: "物件1",
      rent: 80000,
      cost: 150000,
      propTax: 100000,
      bal: 15_000_000,
      rate: 2.0,
      term: 20,
      start: 35,
      propType: "mansion",
      structure: "rc",
      builtYear: new Date().getFullYear() - 5,
      purchasePrice: 25_000_000,
      landRatio: 30,
      currentValueOverride: 0,
    },
  ],
  ins: [],
};

// はじめての人の出発点。サンプルの数字（誰かの年収・ローン・物件）は入れず、
// 本人が入力した分だけで計算する。サンプルはメニューの「サンプルを読み込む」で DEFAULT_PLAN を使う。
export const EMPTY_PLAN: PlanInput = {
  ...DEFAULT_PLAN,
  spouseWork: "none",
  spouseIncY: 0,
  jobs: [{ name: "勤務先", start: 22, end: 60, inc: 0, raise: 1.5, sev: 0, sevAge: 60 }],
  sideJobs: [],
  res: [],
  kids: [],
  ins: [],
  inheritances: [],
  lifeExpenses: [],
  otherLoans: [],
  careEvents: [],
  cashBal: 0,
  nisaTsumitateM: 0,
  tokuBal: 0,
  livingM: 0,
  specialY: 0,
  rentM: 0,
  homeOwned: false,
  useHomeLoan: false,
  hlBal: 0,
  selfPension: { ...DEFAULT_PLAN.selfPension, koseiYears: 0, koseiAvgIncome: 0 },
};
