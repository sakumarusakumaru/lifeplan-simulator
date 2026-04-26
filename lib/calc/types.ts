export type SchoolType = "pub" | "pri";

export interface KidStages {
  k: SchoolType;
  e: SchoolType;
  j: SchoolType;
  h: SchoolType;
  u: SchoolType;
}

export interface KidOptions {
  ronin: boolean;
  grad: boolean;
  dormU: boolean;
  dormG: boolean;
  send: number;
}

export interface Kid {
  name: string;
  birth: string;
  offset: number;
  s: KidStages;
  opt: KidOptions;
}

export interface Job {
  name: string;
  start: number;
  end: number;
  inc: number;
  sev: number;
  sevAge: number;
}

export interface SideJob {
  name: string;
  start: number;
  end: number;
  inc: number;
}

export interface RealEstate {
  name: string;
  rent: number;
  cost: number;
  bal: number;
  rate: number;
  term: number;
  start: number | string;
}

export type InsuranceType =
  | "生命（死亡・収入保障）"
  | "医療"
  | "がん・三大疾病"
  | "就業不能"
  | "介護"
  | "火災・地震"
  | "自動車"
  | "個人賠償・その他損保"
  | "貯蓄型"
  | "その他";

export type Insured = "本人" | "配偶者" | "子" | "その他";

export interface Insurance {
  name: string;
  type: InsuranceType;
  insured: Insured;
  premM: number;
  start: number;
  end: number;
  memo: string;
  enabled: boolean;
}

export type DrawOrderMode =
  | "auto-tiered"
  | "custom"
  | "fund-stock-crypto"
  | "stock-fund-crypto";

export type DrawAsset = "f" | "s" | "k" | "dc";

export interface JukuMonthly {
  pre: number;
  e13: number;
  e46: number;
  jh: number;
  hs: number;
  ronin: number;
}

export interface PlanInput {
  baseDate: string;
  selfBirth: string;
  spouseBirth: string;
  spouseWork: "work" | "none";
  spouseIncY: number;
  spouseIncStart: number;
  spouseIncEnd: number;
  curAge: number;
  endAge: number;
  infl: number;
  taxRate: number;
  cashFloor: number;
  allowNegCash: boolean;
  drawOrder: DrawOrderMode;
  drawCustomOrder: DrawAsset[];

  jukuM: JukuMonthly;

  cashBal: number;
  cashRate: number;
  fundBal: number;
  fundR: number;
  saveFundM: number;
  saveFundEndAge: number;
  stockBal: number;
  stockR: number;
  saveStockM: number;
  saveStockEndAge: number;
  cryptoBal: number;
  cryptoR: number;
  saveCryptoM: number;
  saveCryptoEndAge: number;
  dcBal: number;
  dcR: number;
  saveDcM: number;
  saveDcEndAge: number;

  jobs: Job[];
  sideJobs: SideJob[];
  penStartA: number;
  penAmtA: number;
  useSpousePen: boolean;
  penStartB: number;
  penAmtB: number;

  livingM: number;
  specialY: number;
  rentM: number;
  homeTaxY: number;
  useHomeLoan: boolean;
  hlBal: number;
  hlRate: number;
  hlTerm: number;
  hlStart: number;

  kids: Kid[];
  res: RealEstate[];
  ins: Insurance[];
  lifeEvents: LifeEvent[];
}

export interface LifeEvent {
  label: string;
  age: number;
}

export interface AssetSnapshot {
  c: number;
  f: number;
  s: number;
  k: number;
  dc: number;
}

export interface RealEstateRowDetail {
  bal: number;
  flow: number;
  rent: number;
}

export interface EduTotalDetail {
  name: string;
  val: number;
}

export interface EduSplitDetail {
  name: string;
  tuition: number;
  juku: number;
}

export interface YearlyResult {
  age: number;
  nw: number;
  cf: number;
  draw: number;
  ass: AssetSnapshot;
  reInc: number;
  net: number;
  income: number;
  exp: number;
  inv: number;
  edu: number;
  eduT: number;
  eduJ: number;
  home: number;
  homeRent: number;
  homeTax: number;
  homePay: number;
  ins: number;
  basic: number;
  basicL: number;
  special: number;
  hlBal: number;
  reD: RealEstateRowDetail[];
  eduD: EduTotalDetail[];
  eduKD: EduSplitDetail[];
  taxWage: number;
  reRentTot: number;
  reCostTot: number;
  rePayTot: number;
  reTaxTot: number;
  jobNet: number;
  penNet: number;
}

export interface SimulationSummary {
  rows: YearlyResult[];
  finalNetWorth: number;
  minCash: number;
  maxEdu: number;
  totalHome: number;
  shortfallAge: number | null;
}
