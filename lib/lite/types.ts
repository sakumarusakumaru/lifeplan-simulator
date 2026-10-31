// ver4 Lite の入力。金額はすべて「万円」で持つ（はじめての人が考えやすい単位）
export type LiteWork = "employee" | "self";                         // 会社員・公務員 ／ 自営業・フリーランス
export type LiteSpouseWork = "employee" | "part" | "none" | "self"; // 会社員・公務員 ／ パート ／ 働いていない ／ 自営業
export type LiteEdu = "public" | "uniPrivate" | "private";          // ずっと公立 ／ 大学だけ私立 ／ 中学から私立
export type LiteHome = "rent" | "loan" | "owned";                   // 賃貸 ／ 持ち家（ローンあり） ／ 持ち家（ローンなし）

export interface LiteInput {
  age: number;
  hasSpouse: boolean;
  spouseAge: number;
  spouseSex: "female" | "male"; // 配偶者は妻か夫か（遺族年金の計算に使う）
  kidAges: number[];
  edu: LiteEdu;

  work: LiteWork;
  income: number;        // 年収（額面・万円）
  retireAge: number;     // 何歳まで働くか
  severance: number;     // 退職金の見込み（万円。わからなければ0）
  spouseWork: LiteSpouseWork;
  spouseIncome: number;  // 配偶者の年収（額面・万円）

  livingM: number;       // 毎月の生活費（住まい・教育費を除く・万円）
  home: LiteHome;
  rentM: number;         // 家賃（万円/月）
  loanM: number;         // 住宅ローンの返済（万円/月）
  loanYears: number;     // ローンの残り年数
  homeType: LiteBuyType; // 持ち家（今の家・これから買う家）がマンションか戸建てか（維持費が違う）

  cash: number;          // 預金・現金（万円）
  invest: number;        // 投資（NISA・株・投資信託など）の合計（万円）
  investM: number;       // 毎月の積立（万円）

  // ── 05 予定があれば ──
  futureKids: number;    // これから持つ予定の子の人数
  futureKidsIn: number;  // 1人目が生まれるのは何年後か（2人目からは2年おき）
  buyHome: boolean;      // 家を買う予定（賃貸の人だけ）
  buyAge: number;
  buyPrice: number;      // 家の値段（万円）
  buyDown: number;       // 頭金（万円）
  events: LiteEvent[];   // 大きな出費の予定（3件まで）
  spouseRetireAge: number; // 配偶者が何歳まで働くか

  // ── 06 わかれば精度が上がる ──
  pensionSelf: number;   // ねんきん定期便の見込み額（65歳から・万円/月。0＝自動で見積もる）
  pensionSpouse: number;
  penStart: number;      // 年金をもらい始める年齢（60〜75）
  retireLivingM: number; // 働き終わったあとの生活費（万円/月。0＝いまと同じ）
  dcBal: number;         // iDeCo・企業型DCの残高（万円）
  dcM: number;           // iDeCo・企業型DCの掛金（自分で出す分・万円/月）

  // 任意の項目に答えたか（「ない」と答えたのも含む）。精度メーターに使う
  ans: Partial<Record<LiteAnswerKey, boolean>>;
}

export type LiteBuyType = "mansion" | "house";
export interface LiteEvent {
  label: string;
  age: number;
  amount: number; // 万円
}
export type LiteAnswerKey = "kidsPlan" | "homePlan" | "events" | "pension" | "pensionSpouse" | "retireLiving" | "dc";

export const LITE_DEFAULT: LiteInput = {
  age: 35,
  hasSpouse: false,
  spouseAge: 35,
  spouseSex: "female",
  kidAges: [],
  edu: "public",
  work: "employee",
  income: 0,
  retireAge: 65,
  severance: 0,
  spouseWork: "employee",
  spouseIncome: 0,
  livingM: 0,
  home: "rent",
  rentM: 0,
  loanM: 0,
  loanYears: 30,
  homeType: "mansion",
  cash: 0,
  invest: 0,
  investM: 0,
  futureKids: 0,
  futureKidsIn: 2,
  buyHome: false,
  buyAge: 40,
  buyPrice: 4000,
  buyDown: 400,
  events: [],
  spouseRetireAge: 65,
  pensionSelf: 0,
  pensionSpouse: 0,
  penStart: 65,
  retireLivingM: 0,
  dcBal: 0,
  dcM: 0,
  ans: {},
};

// 計算で置いている前提（画面に出す）
export const LITE_ASSUMPTIONS = {
  infl: 1.5,        // 物価上昇率（%/年）
  investR: 4.0,     // 投資の利回り（%/年）
  raise: 1.5,       // 昇給率（%/年）＝物価並み
  loanRate: 1.0,    // 住宅ローン金利（%）
  homeTaxY: 10,     // 持ち家の固定資産税（万円/年）
  upkeepMansionM: 3, // マンションの管理費・修繕積立金（万円/月）
  upkeepHouseM: 1.5, // 戸建ての修繕のための積立（万円/月）
  buyCostRate: 7,   // 家を買うときの諸費用（値段の%）
  buyLoanYears: 35, // これから借りる住宅ローンの年数
  endAge: 100,
};
