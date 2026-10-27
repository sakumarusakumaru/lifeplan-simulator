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
  // 退職金の受け取り方: 一時金（退職所得）／年金（企業年金として分割）／一部を年金
  sevMethod?: "lump" | "annuity" | "mix";
  sevYears?: number;    // 年金で受け取る年数
  sevRate?: number;     // 年金の給付利率（%/年）。分割中も残りに利息がつく
  sevLumpPct?: number;  // 一部を年金にする場合の、一時金の割合（%）
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
  | "定期保険"
  | "収入保障保険"
  | "終身保険"
  | "養老保険"
  | "個人年金保険"
  | "学資保険"
  | "医療保険"
  | "がん・三大疾病"
  | "就業不能保険"
  | "介護保険"
  | "損害保険"
  | "共済"
  | "その他";

export type Insured = "本人" | "配偶者" | "子" | "その他";

// 保険1件。年齢はすべて本人の年齢（学資保険の受取だけ子どもの年齢）。
// 種類ごとに使う項目が違う（どれを使うかは insurance.ts の HAS）
export interface Insurance {
  name: string;
  company: string;              // 保険会社（引き継ぎ書用・計算には使わない）
  type: InsuranceType;
  insured: Insured;             // 被保険者（この人が亡くなると死亡保険金）
  beneficiary: string;          // 受取人（引き継ぎ書用・計算には使わない）
  contractor: "本人" | "配偶者"; // 契約者＝保険料を払い、満期金・年金を受け取る人（保険料控除・一時所得の対象）
  payMode: "monthly" | "yearly" | "single"; // 月払・年払・一時払
  premM: number;                // 保険料（月払は月額、年払は年額、一時払は払込額）
  start: number;                // 払込開始（契約した年齢。過去でもよい）
  end: number;                  // 払込終了（終身払なら最終年齢）
  coverEnd: number;             // 保障の終わりの年齢（定期・収入保障・医療など。0=終身）
  renewYears: number;           // 更新型: 何年ごとに更新（0=更新なし・全期型）
  renewRate: number;            // 更新型: 更新ごとに保険料が何%上がるか
  deathBenefit: number;         // 死亡保険金（一時金）
  incomeProtM: number;          // 収入保障保険: 亡くなったときの年金月額
  incomeProtMinYears: number;   // 収入保障保険: 最低支払保証期間（年）
  maturityAge: number;          // 養老保険: 満期の年齢
  maturityAmount: number;       // 養老保険: 満期保険金
  surrenderAge: number;         // 解約して返戻金を受け取る年齢（0=解約しない）
  surrenderAmount: number;      // そのときの解約返戻金（設計書の返戻金表から）
  annuityStart: number;         // 個人年金: 受取開始年齢
  annuityYears: number;         // 個人年金: 受取年数（0=終身年金）
  annuityY: number;             // 個人年金: 年金年額
  qualifiedAnnuity: boolean;    // 個人年金: 税制適格特約あり（個人年金保険料控除の対象）
  kid: number;                  // 学資保険: 何番目の子ども（0始まり）
  eduPayouts: { kidAge: number; amount: number }[]; // 学資保険: 祝い金・満期金（子の年齢）
  waiver: boolean;              // 契約者が亡くなったら以後の保険料を払わなくてよい（払込免除）
  currency: "円" | "米ドル" | "豪ドル" | "変額"; // 外貨建て・変額は受取額が円で決まっていない
  benefitDay: number;           // 医療: 入院日額 ／ 共済: 入院日額（計算には使わない）
  benefitLump: number;          // がん・三大疾病・介護: 一時金（計算には使わない）
  benefitM: number;             // 就業不能・介護: 月額給付（計算には使わない）
  quakePremY: number;           // 損害保険: うち地震保険料（年額・地震保険料控除）
  deductKind: "自動" | "一般" | "介護医療" | "個人年金" | "地震" | "なし"; // 保険料控除の区分（自動=種類から判定。控除証明書に合わせて変えられる）
  stepAge: number;              // 共済: 保障が減る年齢（0=減らない）
  stepDeathBenefit: number;     // 共済: 減った後の死亡保障
  rebateRate: number;           // 共済: 割戻率（%・掛金に対して）
  ikueiM: number;               // 学資保険: 育英年金（契約者が亡くなったときの月額）
  ikueiUntilKidAge: number;     // 学資保険: 育英年金を受け取る子どもの年齢の上限
  memo: string;
  enabled: boolean;
}

export type DrawOrderMode = "auto" | "custom";

// ver4: 取り崩しは「口座」単位。DC は受取開始年齢に自動で受け取るため取り崩し対象外。
//   toku = 特定口座（課税）/ nisa = NISA口座（非課税）/ k = 暗号資産 / g = 金
export type DrawAsset = "toku" | "nisa" | "k" | "g";

// iDeCo・企業型DC の加入区分（掛金上限の判定に使う）
export type DcType =
  | "employee-none"   // 会社員（企業年金なし）
  | "employee-dc"     // 会社員（企業型DCのみ）
  | "employee-db"     // 会社員（DBあり）・公務員
  | "self-employed"   // 自営業・フリーランス（第1号）
  | "dependent";      // 専業主婦（夫）（第3号）

export type DcPayoutMethod = "lump" | "annuity";

// 口座の中身を「投信」と「株」に分けて入れるとき用（利回りが違うため）。
// 合計と、評価額で加重平均した利回りを nisaBal/nisaR・tokuBal/tokuR に反映する
export interface SplitInput {
  on: boolean;
  fundBal: number;
  fundR: number;
  stockBal: number;
  stockR: number;
  // NISAのみ: 旧NISA（2023年までに買った分）。非課税だが新NISAの生涯枠には数えない
  oldBal?: number;
  oldR?: number;
}

// 家族に渡す「お金の引き継ぎ書」用の入力（口座番号・暗証番号は入れない）
export interface HandoverPolicy {
  company: string;
  kind: string;
  insured: string;
  beneficiary: string;
  benefit: number;
  contact: string;
}
export interface HandoverContact {
  role: string;
  name: string;
  phone: string;
}
// 引き継ぎ書の1項目（口座1つ・ローン1件・契約1件など）。欄の定義は handoverSchema.ts
export interface HandoverItem {
  id: string;
  cat: string;                     // CATEGORIES の id
  src?: string;                    // シミュレーターの入力から作った項目（"cash" "nisa" "hl" など）。金額は入力から自動
  f: Record<string, string>;       // 欄の値（口座番号・ID・パスワードはここに入れない）
  amount?: number;                 // 金額（src の項目で未指定なら入力から自動）
}

export interface HandoverInput {
  version?: number;                // 2 = 項目別の形式に移行済み
  items?: HandoverItem[];
  docs?: Record<string, string>;   // 重要書類・印鑑の保管場所
  profile?: Record<string, string>;
  wish?: Record<string, string>;   // 医療・介護・葬儀・お墓などの希望
  insExtra?: Record<string, Record<string, string>>; // 保険ごとの保管場所・担当者（キー: ins-番号）
  pension?: Record<string, Record<string, string>>;  // 公的年金（キー: self / spouse）
  catStatus?: Record<string, string>; // 区分ごとの「ある・ない・わからない」
  givenTo?: string;                // 写しを渡した相手
  author: string;
  where: Record<string, string>;   // 財産ごとの金融機関名・保管場所（旧形式。連絡先の電話番号などにも使う）
  extraAssets: { label: string; where: string; amount: number }[];
  policies: HandoverPolicy[];
  contacts: HandoverContact[];
  will: "none" | "self" | "hokan" | "notary";
  willPlace: string;
  wishes: string;                   // 葬儀・お墓・形見などの希望
  message: string;                  // 家族へのひとこと
}

// 相続税の試算の設定
export interface InheritSettings {
  selfSharePct: number;  // 夫婦の財産（現金・運用資産・自宅）のうち本人名義の割合（%）。残りは配偶者名義
  spouseMode: "legal" | "all" | "cap16" | "none" | "best" | "custom"; // 一次相続の分け方: 法定相続分／配偶者が全部／1億6千万円まで／配偶者は相続しない／一次＋二次が最も少ない割合／自分で決める
  smallLand: boolean;    // 自宅の土地に小規模宅地等の特例（330㎡まで80%減）を使う
  shares?: number[];     // 「自分で決める」の割合（%）。配偶者がいれば [配偶者, 子1, 子2, …]、いなければ [子1, 子2, …]
}

export interface RiskInput {
  who: "self" | "spouse";       // 亡くなる人
  deathAge: number;             // 亡くなる時の本人の年齢（本人基準）
  spouseSex: "female" | "male"; // 配偶者の性別（遺族年金の条件が男女で違う）
  livingRate: number;           // 死亡後の生活費（基本生活費・特別費）の割合（%）
  danshin: boolean;             // 住宅ローンの団体信用生命保険（本人が亡くなると残債0）
  deathInsurance: number;       // 加入中の死亡保険金（一時金・亡くなる人にかかっている分）
  incomeProtM: number;          // 収入保障保険（月額）
  incomeProtEndAge: number;     // 収入保障保険の受取終了（本人の年齢基準）
}

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
  taxRate: number;       // 簡易モード: 給与・副業・家賃収入にかける税・社保率（%）
  taxRatePen: number;    // 簡易モード: 年金にかける税・社保率（%）
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
  cashRate: number;         // 預金金利（年・小数）。利息には20.315%が源泉徴収される

  // ver4: 投資は「商品（投信/株）」ではなく「口座（NISA/特定口座）」で管理する。
  // 税金のかかり方は口座で決まり、投信か株かの違いは想定利回りの違いでしかないため。
  //   *Cost = 取得額（元本・簿価）。0 のときは残高と同額（含み益なし）とみなす。

  // NISA口座（非課税）— つみたて投資枠と成長投資枠を別に入力し、年間枠・生涯枠を自動チェック
  nisaBal: number;
  nisaCost: number;
  nisaR: number;
  nisaTsumitateM: number;   // つみたて投資枠 月額（上限 年120万＝月10万）
  nisaGrowthM: number;      // 成長投資枠 月額（上限 年240万＝月20万）
  nisaEndAge: number;
  nisaSplit: SplitInput;

  // 特定口座（課税）— 売却時に含み益へ20.315%
  tokuBal: number;
  tokuCost: number;
  tokuR: number;
  saveTokuM: number;
  saveTokuEndAge: number;
  tokuSplit: SplitInput;
  // NISA枠を超えた積立は特定口座へ回す（オフなら枠超過分は現金のまま）
  nisaOverflowToToku: boolean;

  // 暗号資産 — 売却益は雑所得（総合課税）。税率は所得に応じて15〜55%
  cryptoBal: number;
  cryptoCost: number;
  cryptoR: number;
  cryptoTaxRate: number;    // 売却益にかかる税率（%・目安）
  cryptoSeparate2028?: boolean; // 2028年以降は分離課税20.315%とみなす（予定。false なら総合課税のまま）
  saveCryptoM: number;
  saveCryptoEndAge: number;

  // 金・コモディティ — 金ETF等を想定し売却益に20.315%
  goldBal: number;
  goldCost: number;
  goldR: number;
  saveGoldM: number;
  saveGoldEndAge: number;

  // iDeCo・企業型DC（確定拠出年金）
  dcType: DcType;
  dcBal: number;
  dcR: number;
  saveDcM: number;          // 本人掛金（iDeCo・マッチング拠出）月額。全額が所得控除
  dcEmployerM: number;      // 会社掛金（企業型DCの事業主掛金）月額。手取りからは出ない
  saveDcEndAge: number;     // 掛金をやめる年齢
  dcJoinAge: number;        // 加入した年齢（退職所得控除の年数計算に使う）
  dcStartAge: number;       // 受取開始年齢（60〜75）
  dcMethod: DcPayoutMethod; // 一時金 or 年金
  dcYears: number;          // 年金受取の場合の受取年数（5〜20）

  // 制度系
  childAllowance: boolean;  // 児童手当を収入に含める
  penIndex: number;         // 年金額の改定率（%/年）。マクロ経済スライドで物価上昇率より低め
  hlDeduct: boolean;        // 住宅ローン控除を適用中
  hlDeductEndAge: number;   // 住宅ローン控除が終わる年齢
  hlDeductLimit: number;    // 住宅ローン控除の借入限度額（円）

  // もしもの備え（死亡時のシミュレーション）
  risk: RiskInput;

  // 家族に渡す「お金の引き継ぎ書」
  handover: HandoverInput;

  // 相続税の試算の設定（未設定なら既定値）
  inheritSet?: InheritSettings;

  // 運用の振れ幅（モンテカルロ）のリスク水準
  mcRisk: "stable" | "balanced" | "aggressive";

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

  // 持ち家（自宅）の評価額算定用 - BSの資産側に計上
  homeOwned: boolean;             // 持ち家かどうか
  homePropType: RealEstateType;
  homeStructure: BuildingStructure;
  homeBuiltYear: number;
  homePurchasePrice: number;
  homeLandRatio: number;          // 0-100 (戸建てのみ意味あり)
  homeCurrentValueOverride: number; // 0なら自動計算

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
  nisa: number;    // NISA口座（時価）
  toku: number;    // 特定口座（時価）
  k: number;       // 暗号資産
  dc: number;      // iDeCo・企業型DC
  g: number;       // 金
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
  insPayout: number;      // 保険の満期金・解約返戻金・祝い金・年金（税引き前）
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
  // ver4 追加
  childAllow: number;    // 児童手当
  sevGross: number;      // 退職金（額面）
  sevTax: number;        // 退職金にかかった税（退職所得・分離課税）
  dcPayout: number;      // DC受取額（額面）
  dcTax: number;         // DC受取にかかった税
  dcContribSelf: number; // DC本人掛金（所得控除の対象）
  hlDeduct: number;      // 住宅ローン控除による減税額
  saleTax: number;       // 取り崩し時の売却益課税（特定口座・金・暗号資産）
  nisaCost: number;      // NISA 簿価残高（生涯枠1,800万の消化状況）
  nisaOverflow: number;  // NISA枠を超えて特定口座／現金に回った額
  sevAnnuity: number;    // 退職金を年金で受け取っている分（公的年金等として課税）
  latentTax: number;     // その年末に課税口座（特定口座・金・暗号資産）を全部売ったらかかる税金（含み益への課税）
  // もしもの備え（死亡シナリオのときだけ値が入る）
  dead: boolean;         // 死亡後の年か
  survKiso: number;      // 遺族基礎年金
  survKosei: number;     // 遺族厚生年金
  survChukorei: number;  // 中高齢寡婦加算
  deathLump: number;     // 死亡時の一時金（保険金・死亡退職金・DC死亡一時金）
  incomeProt: number;    // 収入保障保険
}

export interface SimulationWarning {
  level: "info" | "warn";
  text: string;
}

export interface SimulationSummary {
  rows: YearlyResult[];
  finalNetWorth: number;
  minCash: number;
  maxEdu: number;
  totalHome: number;
  shortfallAge: number | null;
  warnings: SimulationWarning[];
}
