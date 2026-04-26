// 日本の税・社会保険料の精密計算（2024年度ベース、簡略化版）
//
// 含めるもの:
//   - 給与所得控除
//   - 公的年金等控除
//   - 基礎控除・配偶者控除・扶養控除
//   - 社会保険料控除（健康保険・厚生年金・雇用保険を概算）
//   - 所得税（累進5-45%）
//   - 復興特別所得税（所得税の2.1%）
//   - 住民税（10%一律・所得割のみ）
//   - 退職所得控除（退職金）
//
// 含めないもの（簡略化）:
//   - 各種税額控除（住宅ローン控除・配当控除など）
//   - ふるさと納税の控除
//   - 国民健康保険料の精密計算（自営業時）
//   - 介護保険料（40-65歳の上乗せ）
//   - 後期高齢者医療保険料（75歳以上）

const MAN = 10000;

// 給与所得控除（2020年改正後）
function kyuyoShotokuKojo(wageY: number): number {
  if (wageY <= 162.5 * MAN) return 55 * MAN;
  if (wageY <= 180 * MAN) return wageY * 0.4 - 10 * MAN;
  if (wageY <= 360 * MAN) return wageY * 0.3 + 8 * MAN;
  if (wageY <= 660 * MAN) return wageY * 0.2 + 44 * MAN;
  if (wageY <= 850 * MAN) return wageY * 0.1 + 110 * MAN;
  return 195 * MAN;
}

// 公的年金等控除（簡略・公的年金等収入のみのケース）
export function koutekiNenkinKojo(penY: number, age: number): number {
  if (penY <= 0) return 0;
  if (age >= 65) {
    if (penY <= 330 * MAN) return 110 * MAN;
    if (penY <= 410 * MAN) return penY * 0.25 + 27.5 * MAN;
    if (penY <= 770 * MAN) return penY * 0.15 + 68.5 * MAN;
    if (penY <= 1000 * MAN) return penY * 0.05 + 145.5 * MAN;
    return 195.5 * MAN;
  }
  if (penY <= 130 * MAN) return 60 * MAN;
  if (penY <= 410 * MAN) return penY * 0.25 + 27.5 * MAN;
  if (penY <= 770 * MAN) return penY * 0.15 + 68.5 * MAN;
  if (penY <= 1000 * MAN) return penY * 0.05 + 145.5 * MAN;
  return 195.5 * MAN;
}

// 社会保険料率（厚生年金・健康保険・雇用保険の本人負担分・概算）
//   厚生年金 18.3% ÷ 2 = 9.15%
//   健康保険 9.84%平均 ÷ 2 = 4.92%（協会けんぽ）
//   雇用保険 0.6%
//   合計 約 14.67%
// 標準報酬月額の上限65万までで頭打ちの簡易対応:
//   年収 65×12+賞与上限 ≈ 約 1100万 で社保が頭打ち
const SHAHO_RATE = 0.1467;
const SHAHO_CAP = 1100 * MAN; // ざっくり上限

export function calcShakaiHoken(wageY: number): number {
  const base = Math.min(wageY, SHAHO_CAP);
  return Math.round(base * SHAHO_RATE);
}

// 国民健康保険料（自営・退職後の概算）：所得割7%+均等割6万 程度
export function calcKokuho(taxableY: number): number {
  return Math.round(Math.max(0, taxableY) * 0.07 + 6 * MAN);
}

// 介護保険料（40歳以上の上乗せ・概算 1.5%）
function calcKaigoHoken(wageY: number, age: number): number {
  if (age < 40) return 0;
  if (age >= 65) return 0; // 65歳以上は別途
  const base = Math.min(wageY, SHAHO_CAP);
  return Math.round(base * 0.0091);
}

// 所得税の累進計算（速算表）
export function calcShotokuzei(taxableY: number): number {
  const t = Math.max(0, Math.floor(taxableY));
  if (t <= 195 * MAN) return t * 0.05;
  if (t <= 330 * MAN) return t * 0.1 - 9.75 * MAN;
  if (t <= 695 * MAN) return t * 0.2 - 42.75 * MAN;
  if (t <= 900 * MAN) return t * 0.23 - 63.6 * MAN;
  if (t <= 1800 * MAN) return t * 0.33 - 153.6 * MAN;
  if (t <= 4000 * MAN) return t * 0.4 - 279.6 * MAN;
  return t * 0.45 - 479.6 * MAN;
}

// 住民税（所得割10%・均等割5,000円・配当控除等は無視）
export function calcJuminzei(taxableY: number): number {
  const t = Math.max(0, taxableY);
  return Math.round(t * 0.1) + 5000;
}

// 退職所得控除
//   勤続20年以下: 40万 × 勤続年数（最低80万）
//   勤続20年超 : 800万 + 70万 × (勤続年数-20)
function taishokuShotokuKojo(years: number): number {
  if (years <= 20) return Math.max(80 * MAN, 40 * MAN * years);
  return 800 * MAN + 70 * MAN * (years - 20);
}

// 退職金にかかる税（一時金として受給した場合の所得税+復興+住民税）
//   退職所得 = (退職金 - 退職所得控除) × 1/2
export function calcTaishokuTax(retirementY: number, workYears: number): number {
  const kojo = taishokuShotokuKojo(workYears);
  const taxable = Math.max(0, (retirementY - kojo) / 2);
  const it = calcShotokuzei(taxable);
  const fk = it * 0.021;
  const jm = taxable * 0.1;
  return Math.round(it + fk + jm);
}

export interface TaxBreakdown {
  shahoSelf: number;       // 自分の社会保険料
  shahoSpouse: number;     // 配偶者の社会保険料
  kokuhoSelf: number;      // 自分の国保料（退職後）
  kokuhoSpouse: number;    // 配偶者の国保料
  kaigoSelf: number;       // 介護保険料（40-64歳）
  kaigoSpouse: number;     // 配偶者の介護保険料
  shotokuzeiSelf: number;  // 自分の所得税
  shotokuzeiSpouse: number;
  fukkouSelf: number;      // 復興特別所得税
  fukkouSpouse: number;
  juminSelf: number;       // 住民税
  juminSpouse: number;
  total: number;           // 合計負担
  netAfterTax: number;     // 手取り合計
  taxableSelf: number;     // 自分の課税所得（参考値）
}

export interface TaxInput {
  selfWageY: number;       // 自分の給与収入
  spouseWageY: number;     // 配偶者の給与収入
  selfPenY: number;        // 自分の年金収入
  spousePenY: number;      // 配偶者の年金収入
  selfAge: number;
  spouseAge: number;
  hasSpouse: boolean;
  numKidsForFuyo: number;  // 16歳以上23歳未満の扶養親族数
  selfWorking: boolean;    // 給与所得者か（社保に入る）
  spouseWorking: boolean;
}

const KISO_KOJO = 48 * MAN;            // 基礎控除（合計所得2400万以下）
const HAIGUSHA_KOJO_PERSONAL = 38 * MAN; // 配偶者控除（所得税）
const HAIGUSHA_KOJO_JUMIN = 33 * MAN;    // 配偶者控除（住民税）
const FUYO_KOJO_PERSONAL = 38 * MAN;     // 扶養控除（一般・所得税）
const FUYO_KOJO_TOKUTEI = 63 * MAN;      // 特定扶養控除（19-22歳・所得税）
const FUYO_KOJO_JUMIN_TOKUTEI = 45 * MAN;
const KISO_KOJO_JUMIN = 43 * MAN;

function fuyoKojoEstimateForKid(kidAge: number, kind: "income" | "jumin"): number {
  if (kidAge < 16) return 0; // 16歳未満は児童手当の方
  if (kidAge >= 19 && kidAge < 23) {
    return kind === "income" ? FUYO_KOJO_TOKUTEI : FUYO_KOJO_JUMIN_TOKUTEI;
  }
  return kind === "income" ? FUYO_KOJO_PERSONAL : 33 * MAN;
}

// 配偶者の所得が高いと配偶者控除消失（簡略：配偶者年収103万超で消失）
const HAIGUSHA_LIMIT = 103 * MAN;

// 詳細税計算メイン
export function calcDetailedTaxV2(
  inp: TaxInput,
  kidAges: number[], // 子どもの当年齢
): TaxBreakdown {
  // 社会保険料
  const shahoSelf = inp.selfWorking ? calcShakaiHoken(inp.selfWageY) : 0;
  const shahoSpouse = inp.spouseWorking ? calcShakaiHoken(inp.spouseWageY) : 0;
  const kaigoSelf = inp.selfWorking ? calcKaigoHoken(inp.selfWageY, inp.selfAge) : 0;
  const kaigoSpouse = inp.spouseWorking ? calcKaigoHoken(inp.spouseWageY, inp.spouseAge) : 0;

  // 退職後（給与なし、年金あり）の場合、国民健康保険料がかかる
  // 簡略：給与収入0かつ年金収入あり、かつ年齢65未満なら国保
  const kokuhoSelf = !inp.selfWorking && inp.selfPenY > 0 && inp.selfAge < 75
    ? calcKokuho(inp.selfPenY)
    : 0;
  const kokuhoSpouse = !inp.spouseWorking && inp.spousePenY > 0 && inp.spouseAge < 75
    ? calcKokuho(inp.spousePenY)
    : 0;

  // 各人の合計所得（給与所得 + 年金所得）
  const selfWageShotoku = Math.max(0, inp.selfWageY - kyuyoShotokuKojo(inp.selfWageY));
  const selfPenShotoku = Math.max(0, inp.selfPenY - koutekiNenkinKojo(inp.selfPenY, inp.selfAge));
  const selfTotalShotoku = selfWageShotoku + selfPenShotoku;

  const spouseWageShotoku = Math.max(0, inp.spouseWageY - kyuyoShotokuKojo(inp.spouseWageY));
  const spousePenShotoku = Math.max(0, inp.spousePenY - koutekiNenkinKojo(inp.spousePenY, inp.spouseAge));
  const spouseTotalShotoku = spouseWageShotoku + spousePenShotoku;

  // 配偶者控除の適用（自分の所得から控除）
  const spouseWageRaw = inp.spouseWageY;
  const useHaigushaKojo = inp.hasSpouse && spouseWageRaw <= HAIGUSHA_LIMIT;

  // 扶養控除（自分の所得から控除）
  let fuyoKojoIncomeSelf = 0;
  let fuyoKojoJuminSelf = 0;
  for (const ka of kidAges) {
    fuyoKojoIncomeSelf += fuyoKojoEstimateForKid(ka, "income");
    fuyoKojoJuminSelf += fuyoKojoEstimateForKid(ka, "jumin");
  }

  // 自分の課税所得（所得税基準）
  const selfDeductionsIncome =
    KISO_KOJO +
    shahoSelf + kaigoSelf + kokuhoSelf +
    (useHaigushaKojo ? HAIGUSHA_KOJO_PERSONAL : 0) +
    fuyoKojoIncomeSelf;
  const selfTaxable = Math.max(0, selfTotalShotoku - selfDeductionsIncome);

  // 配偶者の課税所得（所得税基準）
  const spouseDeductionsIncome = KISO_KOJO + shahoSpouse + kaigoSpouse + kokuhoSpouse;
  const spouseTaxable = Math.max(0, spouseTotalShotoku - spouseDeductionsIncome);

  // 所得税
  const itSelf = calcShotokuzei(selfTaxable);
  const itSpouse = calcShotokuzei(spouseTaxable);
  const fkSelf = itSelf * 0.021;
  const fkSpouse = itSpouse * 0.021;

  // 住民税（控除額が所得税と少し違う）
  const selfDeductionsJumin =
    KISO_KOJO_JUMIN +
    shahoSelf + kaigoSelf + kokuhoSelf +
    (useHaigushaKojo ? HAIGUSHA_KOJO_JUMIN : 0) +
    fuyoKojoJuminSelf;
  const selfTaxableJumin = Math.max(0, selfTotalShotoku - selfDeductionsJumin);
  const jmSelf = calcJuminzei(selfTaxableJumin);

  const spouseDeductionsJumin = KISO_KOJO_JUMIN + shahoSpouse + kaigoSpouse + kokuhoSpouse;
  const spouseTaxableJumin = Math.max(0, spouseTotalShotoku - spouseDeductionsJumin);
  const jmSpouse = inp.hasSpouse ? calcJuminzei(spouseTaxableJumin) : 0;

  const total = Math.round(
    shahoSelf + shahoSpouse +
    kokuhoSelf + kokuhoSpouse +
    kaigoSelf + kaigoSpouse +
    itSelf + itSpouse +
    fkSelf + fkSpouse +
    jmSelf + jmSpouse,
  );

  const grossAll = inp.selfWageY + inp.spouseWageY + inp.selfPenY + inp.spousePenY;
  const netAfterTax = grossAll - total;

  return {
    shahoSelf: Math.round(shahoSelf),
    shahoSpouse: Math.round(shahoSpouse),
    kokuhoSelf: Math.round(kokuhoSelf),
    kokuhoSpouse: Math.round(kokuhoSpouse),
    kaigoSelf: Math.round(kaigoSelf),
    kaigoSpouse: Math.round(kaigoSpouse),
    shotokuzeiSelf: Math.round(itSelf),
    shotokuzeiSpouse: Math.round(itSpouse),
    fukkouSelf: Math.round(fkSelf),
    fukkouSpouse: Math.round(fkSpouse),
    juminSelf: Math.round(jmSelf),
    juminSpouse: Math.round(jmSpouse),
    total,
    netAfterTax,
    taxableSelf: Math.round(selfTaxable),
  };
}
