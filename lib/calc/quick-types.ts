export interface QuickInput {
  curAge: number;
  hasSpouse: boolean;
  spouseAge: number;
  kidAges: number[];
  selfIncomeNet: number;   // 手取り年収（万円）
  spouseIncomeNet: number; // 配偶者 手取り年収（万円）
  workEndAge: number;
  totalAssets: number;     // 貯蓄・投資総額（万円）
  hasHomeLoan: boolean;
  hlBal: number;           // ローン残高（万円）
  hlRate: number;          // 金利（%）
  hlRemainYears: number;   // 残り年数
  livingM: number;         // 現在の月生活費（万円）
  retireLivingM: number;   // 老後の月生活費（万円）
}

export const DEFAULT_QUICK: QuickInput = {
  curAge: 40,
  hasSpouse: true,
  spouseAge: 38,
  kidAges: [10],
  selfIncomeNet: 500,
  spouseIncomeNet: 200,
  workEndAge: 65,
  totalAssets: 500,
  hasHomeLoan: true,
  hlBal: 2500,
  hlRate: 0.5,
  hlRemainYears: 25,
  livingM: 30,
  retireLivingM: 20,
};
