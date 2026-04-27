export type SchoolType = "pub" | "pri" | "none";

export interface KidStages {
  k: SchoolType;
  e: SchoolType;
  j: SchoolType;
  h: SchoolType;
  u: SchoolType;
  g: SchoolType;
}

export interface KidOptions {
  ronin: boolean;
  dorm: boolean;
  send: number;
  // 旧フィールド（自動マイグレーション用に残置）
  grad?: boolean;
  dormU?: boolean;
  dormG?: boolean;
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
  raise: number;       // 昇給率(%/年・複利)
  sev: number;
  sevAge: number;
}

export interface SideJob {
  name: string;
  start: number;
  end: number;
  inc: number;
}

export type RealEstateType = "house" | "mansion" | "land";
export type BuildingStructure = "wood" | "lightSteel" | "heavySteel" | "rc" | "src";

export interface RealEstate {
  name: string;
  rent: number;       // 月額家賃収入（円・物件全体）
  cost: number;       // 年間管理費＋修繕積立費（円）
  propTax: number;    // 年間固定資産税（円）
  bal: number;        // ローン残高（円）
  rate: number;       // 金利（%）
  term: number;       // ローン期間（年）
  start: number | string;
  // 評価額算定（簿価計算）用
  propType: RealEstateType;       // 物件種別
  structure: BuildingStructure;   // 建物構造（戸建てのみ意味あり）
  builtYear: number;              // 築年（西暦）
  purchasePrice: number;          // 購入価格（円）
  landRatio: number;              // 土地価格比率(%)（戸建てのみ意味あり、0-100）
  currentValueOverride: number;   // 現在評価額の手動上書き（0なら自動計算）
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

export type DrawAsset = "f" | "s" | "k" | "dc" | "g";

export interface JukuMonthly {
  pre: number;
  e13: number;
  e46: number;
  jh: number;
  hs: number;
  ronin: number;
}

export interface InheritanceEvent {
  age: number;       // 受け取る年齢（本人基準）
  amount: number;    // 円（一時収入）
  label: string;
}

export interface LifeExpenseEvent {
  age: number;       // 支出年齢（本人基準）
  amount: number;    // 円（一時支出）
  label: string;     // 例「リフォーム」「車買替」
}

export interface OtherLoan {
  label: string;         // 例「自動車ローン」「奨学金」
  monthlyPay: number;    // 月々の返済額（円）
  remainMonths: number;  // 残り返済月数
}

export interface CareEvent {
  startAge: number;        // 介護開始時の本人年齢
  durationYears: number;   // 介護期間
  monthlyCost: number;     // 月額（円）
  label: string;           // 例「親A介護」
}

export type TaxMode = "simple" | "detailed";

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
  taxMode: TaxMode;
  inheritances: InheritanceEvent[];
  lifeExpenses: LifeExpenseEvent[];
  otherLoans: OtherLoan[];
  careEvents: CareEvent[];
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
  goldBal: number;
  goldR: number;
  saveGoldM: number;
  saveGoldEndAge: number;
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
  selfPension: PensionInput;
  spousePension: PensionInput;

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

// 年金被保険者区分
//   kosei : 2号 (会社員・公務員 / 厚生年金 + 国民年金)
//   kokumin : 1号 (自営業・無職 / 国民年金のみ・自分で納付)
//   dependent : 3号 (会社員配偶者の被扶養者 / 国民年金のみ・保険料免除)
export type PensionCategory = "kosei" | "kokumin" | "dependent";

export type PensionMode = "auto" | "manual";

export interface PensionInput {
  mode: PensionMode;
  category: PensionCategory;
  // --- 自動計算用 ---
  koseiYears: number;          // 厚生年金加入年数(2号のみ)
  koseiAvgIncome: number;      // 厚生年金加入時の平均年収(賞与込み・円)
  kokuminMonths: number;       // 国民年金 納付済月数 (0-480, 満額=480)
  // --- 手動入力用 ---
  manualMonth: number;         // 月額(円)。modeがmanualの時に使用
}

export interface PensionBreakdown {
  monthly: number;             // 合計 月額(円)
  basicMonthly: number;        // 老齢基礎年金 月額(円)
  koseiMonthly: number;        // 老齢厚生年金 月額(円)
  adjustment: number;          // 繰上げ・繰下げ係数 (1.0=本来)
}

export interface AssetSnapshot {
  c: number;
  f: number;
  s: number;
  k: number;
  dc: number;
  g: number;
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
  inherit: number;       // 当年に受け取った相続（一時収入）
  lifeExp: number;       // 当年のライフイベント一時支出
  otherLoanPay: number;  // 当年のその他ローン返済額
  care: number;          // 当年の介護支出
  socialIns: number;     // 社会保険料合計（詳細税モードのみ）
}

export interface SimulationSummary {
  rows: YearlyResult[];
  finalNetWorth: number;
  minCash: number;
  maxEdu: number;
  totalHome: number;
  shortfallAge: number | null;
}
