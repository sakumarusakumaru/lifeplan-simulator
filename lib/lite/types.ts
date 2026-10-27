// ver4 Lite の入力。金額はすべて「万円」で持つ（はじめての人が考えやすい単位）
export type LiteWork = "employee" | "self";                         // 会社員・公務員 ／ 自営業・フリーランス
export type LiteSpouseWork = "employee" | "part" | "none" | "self"; // 会社員・公務員 ／ パート ／ 働いていない ／ 自営業
export type LiteEdu = "public" | "uniPrivate" | "private";          // ずっと公立 ／ 大学だけ私立 ／ 中学から私立
export type LiteHome = "rent" | "loan" | "owned";                   // 賃貸 ／ 持ち家（ローンあり） ／ 持ち家（ローンなし）

export interface LiteInput {
  age: number;
  hasSpouse: boolean;
  spouseAge: number;
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

  cash: number;          // 預金・現金（万円）
  invest: number;        // 投資（NISA・株・投資信託など）の合計（万円）
  investM: number;       // 毎月の積立（万円）
}

export const LITE_DEFAULT: LiteInput = {
  age: 35,
  hasSpouse: false,
  spouseAge: 35,
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
  cash: 0,
  invest: 0,
  investM: 0,
};

// 計算で置いている前提（画面に出す）
export const LITE_ASSUMPTIONS = {
  infl: 1.5,        // 物価上昇率（%/年）
  investR: 4.0,     // 投資の利回り（%/年）
  raise: 1.5,       // 昇給率（%/年）＝物価並み
  loanRate: 1.0,    // 住宅ローン金利（%）
  homeTaxY: 10,     // 持ち家の固定資産税など（万円/年）
  endAge: 100,
};
