// 日本の税・社会保険料の計算（ver4 / 2026年10月時点の制度）
//
// 年（西暦）ごとに制度を切り替える:
//   - 基礎控除: 令和8・9年分(2026-27)は合計所得489万以下で104万（本則62万＋特例42万）、
//               2028年分以後は本則62万（＋132万以下は恒久特例37万）。住民税は43万で据置き
//   - 給与所得控除の最低保障: 2026-27年分は74万（特例）、2028年分以後は69万
//   - 所得税の付加税: 復興特別所得税は2027年分から1.1%に下げて2047年分まで延長、
//               同じ2027年分から防衛特別所得税1%。合計は2047年分まで2.1%、2048年分以後1%
//
// 含めるもの:
//   - 給与所得控除 / 青色申告特別控除（自営業）/ 公的年金等控除（年齢別）
//   - 基礎控除・配偶者控除・配偶者特別控除・扶養控除（16-18歳）・特定扶養（19-22歳）
//   - 社会保険料控除・小規模企業共済等掛金控除（iDeCo・マッチング拠出）
//   - 所得税（累進5-45%）・復興特別所得税／防衛特別所得税・住民税（所得割10%＋均等割）
//   - 会社員の社会保険（厚生年金・健康保険・介護・子ども子育て支援金・雇用保険）
//   - 自営業・退職後の国民年金・国民健康保険、65歳以上の介護保険、75歳以上の後期高齢者医療
//   - 住宅ローン控除（所得税→住民税の順に控除）
//   - 退職所得（退職金・DC一時金）の分離課税
//
// 含めないもの（簡略化）:
//   - 住民税が前年所得に課税されるタイムラグ
//   - 特定役員退職手当等（役員の勤続5年以下。1/2課税なし）
//   - 医療費控除・生命保険料控除・ふるさと納税・配当控除
//   - 国保・後期高齢者医療の自治体ごとの料率差（全国平均的な水準で概算）

const MAN = 10000;

// 所得税の付加税率（復興特別所得税＋防衛特別所得税）
//   〜2047年分: 2.1%（2026年分は復興2.1%、2027年分〜は復興1.1%＋防衛1%）／2048年分〜: 防衛1%のみ
export function surtaxRate(year: number): number {
  return year <= 2047 ? 0.021 : 0.01;
}

// ─────────────────────────────────────────
// 社会保険料率（2026年度・本人負担分）
// ─────────────────────────────────────────
export const SHAHO_2026 = {
  kosei: 0.183 / 2,        // 厚生年金 18.3% の折半
  kenpo: 0.099 / 2,        // 協会けんぽ 全国平均 9.9%（大阪支部 10.13%）
  kaigo: 0.0162 / 2,       // 介護保険（40-64歳）1.62%
  kodomo: 0.0023 / 2,      // 子ども・子育て支援金 0.23%（2026年4月〜）
  koyo: 0.005,             // 雇用保険（一般の事業）労働者負担 0.5%
  koseiMonthlyCap: 65 * MAN,   // 厚生年金 標準報酬月額の上限（2027-09〜68万→2029-09〜75万に段階引上げ）
  koseiBonusCap: 150 * MAN,    // 厚生年金 標準賞与 1回の上限
  kenpoMonthlyCap: 139 * MAN,  // 健康保険 標準報酬月額の上限
  kenpoBonusCapY: 573 * MAN,   // 健康保険 標準賞与 年間上限
};

// 国民年金保険料（令和8年度・月額）
export const KOKUMIN_HOKENRYO_M = 17_920;

// 年収を「月給×12＋賞与（月給×2を年2回）」とみなして社会保険の上限を当てる
function splitWage(wageY: number) {
  const monthly = wageY / 16;
  const bonusEach = monthly * 2;
  return { monthly, bonusEach };
}

function koseiBase(wageY: number, year: number): number {
  const { monthly, bonusEach } = splitWage(wageY);
  // 標準報酬月額の上限は 2027-09 68万 / 2028-09 71万 / 2029-09 75万（年単位で近似）
  const cap =
    year >= 2030 ? 75 * MAN :
    year >= 2029 ? 71 * MAN :
    year >= 2028 ? 68 * MAN :
    SHAHO_2026.koseiMonthlyCap;
  return Math.min(monthly, cap) * 12 + Math.min(bonusEach, SHAHO_2026.koseiBonusCap) * 2;
}

function kenpoBase(wageY: number): number {
  const { monthly, bonusEach } = splitWage(wageY);
  return (
    Math.min(monthly, SHAHO_2026.kenpoMonthlyCap) * 12 +
    Math.min(bonusEach * 2, SHAHO_2026.kenpoBonusCapY)
  );
}

// 会社員の社会保険料（本人負担）
export function calcEmployeeShaho(wageY: number, age: number, year: number) {
  if (wageY <= 0) return { pension: 0, health: 0, kaigo: 0, total: 0 };
  const kb = kenpoBase(wageY);
  const pension = age < 70 ? koseiBase(wageY, year) * SHAHO_2026.kosei : 0;
  const health = age < 75 ? kb * (SHAHO_2026.kenpo + SHAHO_2026.kodomo) : 0;
  const kaigo = age >= 40 && age < 65 ? kb * SHAHO_2026.kaigo : 0;
  const koyo = wageY * SHAHO_2026.koyo;
  return {
    pension: Math.round(pension),
    health: Math.round(health + koyo),
    kaigo: Math.round(kaigo),
    total: Math.round(pension + health + kaigo + koyo),
  };
}

// 国民健康保険料（1人分・全国平均的な料率で概算）
//   所得割: (所得 - 43万) × 医療・支援分 約9.5%（40-64歳は介護分 約2.5%を加算）
//   均等割: 医療・支援分 約5万（40-64歳は介護分 約1.7万を加算）
//   上限（令和8年度）: 医療67万＋支援26万 = 93万 / 介護 17万。子ども・子育て支援納付金（上限3万）は入れていない
export function calcKokuho(shotokuY: number, age: number): number {
  if (age >= 75) return 0;
  const base = Math.max(0, shotokuY - 43 * MAN);
  const iryo = Math.min(93 * MAN, base * 0.095 + 5 * MAN);
  const kaigo = age >= 40 && age < 65 ? Math.min(17 * MAN, base * 0.025 + 1.7 * MAN) : 0;
  return Math.round(iryo + kaigo);
}

// 後期高齢者医療保険料（75歳以上・概算）
export function calcKoki(shotokuY: number): number {
  const base = Math.max(0, shotokuY - 43 * MAN);
  return Math.round(Math.min(85 * MAN, base * 0.095 + 5 * MAN));
}

// 介護保険料 第1号（65歳以上・概算。所得段階で変わるため2段階で近似）
export function calcKaigo1(shotokuY: number): number {
  return shotokuY > 300 * MAN ? 11 * MAN : 7.8 * MAN;
}

// ─────────────────────────────────────────
// 所得控除・所得計算
// ─────────────────────────────────────────

// 給与所得控除（最低保障: 2026-27年分 74万 / 2028年分以後 69万）
export function kyuyoShotokuKojo(wageY: number, year: number): number {
  if (wageY <= 0) return 0;
  const min = year <= 2027 ? 74 * MAN : 69 * MAN;
  let k: number;
  if (wageY <= 180 * MAN) k = wageY * 0.4 - 10 * MAN;
  else if (wageY <= 360 * MAN) k = wageY * 0.3 + 8 * MAN;
  else if (wageY <= 660 * MAN) k = wageY * 0.2 + 44 * MAN;
  else if (wageY <= 850 * MAN) k = wageY * 0.1 + 110 * MAN;
  else k = 195 * MAN;
  return Math.min(wageY, Math.max(min, k));
}

// 公的年金等控除（公的年金等以外の合計所得 1,000万以下のケース）
export function koutekiNenkinKojo(penY: number, age: number): number {
  if (penY <= 0) return 0;
  let k: number;
  if (age >= 65) {
    if (penY <= 330 * MAN) k = 110 * MAN;
    else if (penY <= 410 * MAN) k = penY * 0.25 + 27.5 * MAN;
    else if (penY <= 770 * MAN) k = penY * 0.15 + 68.5 * MAN;
    else if (penY <= 1000 * MAN) k = penY * 0.05 + 145.5 * MAN;
    else k = 195.5 * MAN;
  } else {
    if (penY <= 130 * MAN) k = 60 * MAN;
    else if (penY <= 410 * MAN) k = penY * 0.25 + 27.5 * MAN;
    else if (penY <= 770 * MAN) k = penY * 0.15 + 68.5 * MAN;
    else if (penY <= 1000 * MAN) k = penY * 0.05 + 145.5 * MAN;
    else k = 195.5 * MAN;
  }
  return Math.min(penY, k);
}

// 所得税の基礎控除（年・合計所得で変わる）
export function kisoKojoIncomeTax(goukei: number, year: number): number {
  if (goukei > 2500 * MAN) return 0;
  if (goukei > 2450 * MAN) return 16 * MAN;
  if (goukei > 2400 * MAN) return 32 * MAN;
  if (goukei > 2350 * MAN) return 48 * MAN;
  if (year <= 2027) {
    // 令和8・9年分
    if (goukei <= 489 * MAN) return 104 * MAN;
    if (goukei <= 655 * MAN) return 67 * MAN;
    return 62 * MAN;
  }
  // 2028年分以後（恒久特例は合計所得132万以下のみ）
  if (goukei <= 132 * MAN) return 99 * MAN;
  return 62 * MAN;
}

// 住民税の基礎控除（43万据置き。2,400万超で逓減）
export function kisoKojoJumin(goukei: number): number {
  if (goukei > 2500 * MAN) return 0;
  if (goukei > 2450 * MAN) return 15 * MAN;
  if (goukei > 2400 * MAN) return 29 * MAN;
  return 43 * MAN;
}

// 配偶者控除・配偶者特別控除（所得税）
//   納税者の合計所得 900万以下を満額とし、950万以下 2/3、1,000万以下 1/3、超は0
//   配偶者の合計所得 62万以下（2026〜）: 配偶者控除38万（70歳以上48万）
//   62万超〜133万以下: 配偶者特別控除（38万→3万に逓減）
export function haigushaKojo(
  selfGoukei: number,
  spouseGoukei: number,
  spouseAge: number,
  kind: "income" | "jumin",
): number {
  if (selfGoukei > 1000 * MAN) return 0;
  const scale = selfGoukei <= 900 * MAN ? 1 : selfGoukei <= 950 * MAN ? 2 / 3 : 1 / 3;
  let base: number;
  if (spouseGoukei <= 62 * MAN) {
    if (kind === "income") base = spouseAge >= 70 ? 48 * MAN : 38 * MAN;
    else base = spouseAge >= 70 ? 38 * MAN : 33 * MAN;
  } else if (spouseGoukei <= 95 * MAN) base = kind === "income" ? 38 * MAN : 33 * MAN;
  else if (spouseGoukei <= 100 * MAN) base = 36 * MAN;
  else if (spouseGoukei <= 105 * MAN) base = 31 * MAN;
  else if (spouseGoukei <= 110 * MAN) base = 26 * MAN;
  else if (spouseGoukei <= 115 * MAN) base = 21 * MAN;
  else if (spouseGoukei <= 120 * MAN) base = 16 * MAN;
  else if (spouseGoukei <= 125 * MAN) base = 11 * MAN;
  else if (spouseGoukei <= 130 * MAN) base = 6 * MAN;
  else if (spouseGoukei <= 133 * MAN) base = 3 * MAN;
  else base = 0;
  // 配偶者特別控除の住民税は33万が上限。配偶者控除（62万以下）の老人加算38万には上限をかけない
  if (kind === "jumin" && spouseGoukei > 62 * MAN && base > 33 * MAN) base = 33 * MAN;
  // 納税者の所得が900万超のときの2/3・1/3は、国税庁の表のとおり1万円単位で切り上げる（例 38万→26万・13万）
  return scale === 1 ? base : Math.ceil((base * scale) / MAN) * MAN;
}

// 子の扶養控除（16歳未満は児童手当があるため0、23歳以上は独立とみなす）
function fuyoKojoForKid(kidAge: number, kind: "income" | "jumin"): number {
  if (kidAge < 16 || kidAge >= 23) return 0;
  if (kidAge >= 19) return kind === "income" ? 63 * MAN : 45 * MAN;
  return kind === "income" ? 38 * MAN : 33 * MAN;
}

// 住民税の調整控除（地方税法37条・314条の6）。所得税と住民税の人的控除の差による負担増を戻す
//   合計所得2,500万超は0。課税総所得200万以下: min(人的控除の差, 課税総所得)×5%
//   200万超: (人的控除の差 − (課税総所得 − 200万))×5%、最低2,500円
export function chouseiKojo(taxableJ: number, goukei: number, jintekiDiff: number): number {
  if (goukei > 2500 * MAN || taxableJ <= 0) return 0;
  if (taxableJ <= 200 * MAN) return Math.min(jintekiDiff, taxableJ) * 0.05;
  return Math.max(2500, (jintekiDiff - (taxableJ - 200 * MAN)) * 0.05);
}

// 人的控除の差（所得税と住民税）。近似: 基礎5万、配偶者控除5万（70歳以上10万。納税者の所得900万超は4万・6万／950万超は2万・3万）、
// 扶養 16〜18歳5万・19〜22歳18万。配偶者特別控除・ひとり親控除などの差は入れていない
function jintekiDiffOf(goukei: number, haigusha: { on: boolean; old: boolean; earnerG: number }, kidAges: number[]): number {
  let d = goukei <= 2500 * MAN ? 5 * MAN : 0;
  if (haigusha.on) {
    const g = haigusha.earnerG;
    d += haigusha.old ? (g <= 900 * MAN ? 10 : g <= 950 * MAN ? 6 : 3) * MAN : (g <= 900 * MAN ? 5 : g <= 950 * MAN ? 4 : 2) * MAN;
  }
  for (const a of kidAges) d += a >= 19 && a < 23 ? 18 * MAN : a >= 16 && a < 23 ? 5 * MAN : 0;
  return d;
}

// 所得税の累進計算（速算表）
export function calcShotokuzei(taxableY: number): number {
  const t = Math.max(0, Math.floor(taxableY / 1000) * 1000);
  if (t <= 195 * MAN) return t * 0.05;
  if (t <= 330 * MAN) return t * 0.1 - 9.75 * MAN;
  if (t <= 695 * MAN) return t * 0.2 - 42.75 * MAN;
  if (t <= 900 * MAN) return t * 0.23 - 63.6 * MAN;
  if (t <= 1800 * MAN) return t * 0.33 - 153.6 * MAN;
  if (t <= 4000 * MAN) return t * 0.4 - 279.6 * MAN;
  return t * 0.45 - 479.6 * MAN;
}

// 限界税率（所得税×復興＋住民税10%）
export function marginalRate(taxableY: number): number {
  const t = Math.max(0, taxableY);
  const r =
    t <= 195 * MAN ? 0.05 :
    t <= 330 * MAN ? 0.1 :
    t <= 695 * MAN ? 0.2 :
    t <= 900 * MAN ? 0.23 :
    t <= 1800 * MAN ? 0.33 :
    t <= 4000 * MAN ? 0.4 : 0.45;
  return r * 1.021 + 0.1;
}

// ─────────────────────────────────────────
// 退職所得（退職金・DC一時金）
// ─────────────────────────────────────────

// 退職所得控除
//   勤続20年以下: 40万 × 年数（最低80万）
//   勤続20年超 : 800万 + 70万 × (年数-20)
export function taishokuShotokuKojo(years: number): number {
  const y = Math.max(1, Math.ceil(years));
  if (y <= 20) return Math.max(80 * MAN, 40 * MAN * y);
  return 800 * MAN + 70 * MAN * (y - 20);
}

// 退職所得の金額（1/2課税後）
//   短期退職手当等（勤続5年以下・役員以外）: 控除後300万までは1/2、300万を超える部分は全額
export function taishokuShotoku(amountY: number, kojo: number, shortTerm = false): number {
  const after = Math.max(0, amountY - kojo);
  if (shortTerm && after > 300 * MAN) return 150 * MAN + (after - 300 * MAN);
  return after / 2;
}

// 退職所得にかかる税（所得税＋付加税＋住民税）。kojo は重複調整後の控除額、shortTerm は勤続5年以下
export function calcTaishokuTaxWithKojo(amountY: number, kojo: number, year: number, shortTerm = false): number {
  const taxable = Math.floor(taishokuShotoku(amountY, kojo, shortTerm) / 1000) * 1000;
  const it = calcShotokuzei(taxable);
  const fk = it * surtaxRate(year);
  const jm = taxable * 0.1;
  return Math.round(it + fk + jm);
}

export function calcTaishokuTax(amountY: number, workYears: number, year = 2026): number {
  const shortTerm = Math.max(1, Math.ceil(workYears)) <= 5;
  return calcTaishokuTaxWithKojo(amountY, taishokuShotokuKojo(workYears), year, shortTerm);
}

// ─────────────────────────────────────────
// 世帯の税・社会保険（1年分）
// ─────────────────────────────────────────

export type WorkStyle = "employee" | "self-employed";

export interface PersonIncome {
  age: number;
  wageY: number;          // 給与収入 or 事業収入（workStyle で切替）
  workStyle: WorkStyle;
  penY: number;           // 公的年金 + DC年金受取（公的年金等）
  otherShotokuY: number;  // 不動産所得など（総合課税）
  dcSelfContribY: number; // iDeCo・マッチング掛金（全額所得控除）
  // 会社員の配偶者の健康保険の扶養に入っているか（75歳未満。60歳未満なら国民年金も第3号）
  dependentOfSpouse: boolean;
}

export interface HouseholdTaxInput {
  year: number;
  self: PersonIncome;
  spouse: PersonIncome | null;
  kidAges: number[];
  hlDeductCredit: number; // 住宅ローン控除の控除可能額（0.7%×年末残高 等）
  // 本人に追加する所得控除（ひとり親控除・寡婦控除など）
  extraDeduction?: { income: number; jumin: number };
  // 配偶者に追加する所得控除（生命保険料控除など）
  spouseExtraDeduction?: { income: number; jumin: number };
}

// 配偶者と死別したときの控除
//   ひとり親控除: 生計を一にする子がいる（所得1,000万以下）所得税35万・住民税30万
//     令和8年度改正で、所得税は2027年分から38万、住民税は2028年度分（2027年の所得）から33万
//     （住民税は前年課税だが、このシミュレーターは同じ年の所得で計算するので、どちらも2027年から）
//   寡婦控除: 子のいない妻（所得500万以下）所得税27万・住民税26万
export function widowDeduction(hasDependentChild: boolean, sex: "female" | "male", year = 2026) {
  if (hasDependentChild) return year >= 2027 ? { income: 38 * MAN, jumin: 33 * MAN } : { income: 35 * MAN, jumin: 30 * MAN };
  if (sex === "female") return { income: 27 * MAN, jumin: 26 * MAN };
  return { income: 0, jumin: 0 };
}

export interface TaxBreakdown {
  shahoSelf: number;       // 本人の社会保険料（会社員分 or 国保・国民年金）
  shahoSpouse: number;
  shotokuzeiSelf: number;  // 所得税＋復興特別所得税
  shotokuzeiSpouse: number;
  juminSelf: number;
  juminSpouse: number;
  hlDeduct: number;        // 実際に減税された住宅ローン控除
  jigyozei: number;        // 個人事業税（自営業）。(事業所得 − 事業主控除290万) × 5%（業種で3〜5%・対象外もある）
  total: number;           // 税＋社会保険の合計（住宅ローン控除後）
  taxableSelf: number;     // 本人の課税所得（参考）
  marginalSelf: number;    // 本人の限界税率（参考）
}

interface PersonCalc {
  shaho: number;
  goukei: number;   // 合計所得
  shotokuSum: number;
}

function personShaho(p: PersonIncome, year: number, goukei: number): number {
  // 扶養に入っている人のパート収入（130万未満など）には会社の社会保険がかからない
  const employed = p.workStyle === "employee" && p.wageY > 0 && !p.dependentOfSpouse;
  let shaho = 0;
  if (employed) {
    shaho += calcEmployeeShaho(p.wageY, p.age, year).total;
    // 75歳以上は健康保険をぬけて後期高齢者医療（厚生年金は70歳まで）
    if (p.age >= 75) shaho += calcKoki(goukei);
  } else if (p.age >= 75) {
    // 75歳以上は扶養に入れないので、全員が後期高齢者医療
    shaho += calcKoki(goukei);
  } else if (!p.dependentOfSpouse) {
    // 国民年金（60歳未満）＋国保（75歳未満）
    if (p.age < 60) shaho += KOKUMIN_HOKENRYO_M * 12;
    shaho += calcKokuho(goukei, p.age);
  }
  // 扶養に入っている間は保険料なし（第3号は60歳で終わるが、60歳以降は国民年金の保険料もない。
  // 健康保険の扶養は75歳まで続く）
  // 会社員でも65歳以上の介護保険は第1号として別途
  if (p.age >= 65) shaho += calcKaigo1(goukei);
  return Math.round(shaho);
}

function personIncome(p: PersonIncome, year: number): PersonCalc {
  const wageShotoku =
    p.workStyle === "employee"
      ? Math.max(0, p.wageY - kyuyoShotokuKojo(p.wageY, year))
      : Math.max(0, p.wageY - 65 * MAN); // 自営業: 青色申告特別控除65万を想定
  const penShotoku = Math.max(0, p.penY - koutekiNenkinKojo(p.penY, p.age));
  // 不動産所得の赤字は損益通算できる（土地取得の利子分の制限は省略）
  const goukei = Math.max(0, wageShotoku + penShotoku + p.otherShotokuY);
  const shaho = personShaho(p, year, goukei);
  return { shaho, goukei, shotokuSum: goukei };
}

export function calcHouseholdTax(inp: HouseholdTaxInput): TaxBreakdown {
  const { year } = inp;
  const s = personIncome(inp.self, year);
  const sp = inp.spouse ? personIncome(inp.spouse, year) : null;
  const sur = 1 + surtaxRate(year);

  // ── 配偶者控除・配偶者特別控除・子の扶養控除 ──
  //   合計所得の多い方（主たる稼ぎ手）が受ける。同じなら本人。
  //   本人が先に退職して配偶者が働き続ける年などは、配偶者の側で控除する
  const selfIsEarner = !sp || s.goukei >= sp.goukei;
  let fuyoI = 0;
  let fuyoJ = 0;
  for (const ka of inp.kidAges) {
    fuyoI += fuyoKojoForKid(ka, "income");
    fuyoJ += fuyoKojoForKid(ka, "jumin");
  }
  let haiI = 0;
  let haiJ = 0;
  if (sp && inp.spouse) {
    const earnerG = selfIsEarner ? s.goukei : sp.goukei;
    const otherG = selfIsEarner ? sp.goukei : s.goukei;
    const otherAge = selfIsEarner ? inp.spouse.age : inp.self.age;
    haiI = haigushaKojo(earnerG, otherG, otherAge, "income");
    haiJ = haigushaKojo(earnerG, otherG, otherAge, "jumin");
  }
  const familyI = haiI + fuyoI;
  const familyJ = haiJ + fuyoJ;
  // 調整控除に使う人的控除の差（家族の控除を受ける側だけ家族の分を足す）
  const spouseG = sp ? (selfIsEarner ? sp.goukei : s.goukei) : 0;
  const haiInfo = {
    on: !!sp && !!inp.spouse && spouseG <= 62 * MAN && haiI > 0,
    old: !!inp.spouse && (selfIsEarner ? inp.spouse.age : inp.self.age) >= 70,
    earnerG: selfIsEarner ? s.goukei : sp?.goukei ?? 0,
  };

  // ── 本人 ──
  const extra = inp.extraDeduction ?? { income: 0, jumin: 0 };
  const commonDed = s.shaho + inp.self.dcSelfContribY;
  const selfFamI = selfIsEarner ? familyI : 0;
  const selfFamJ = selfIsEarner ? familyJ : 0;
  const selfTaxable = Math.max(0, s.goukei - kisoKojoIncomeTax(s.goukei, year) - commonDed - selfFamI - extra.income);
  const selfTaxableJ = Math.max(0, s.goukei - kisoKojoJumin(s.goukei) - commonDed - selfFamJ - extra.jumin);

  // 基準所得税額（付加税をかける前の所得税）
  let itBaseSelf = calcShotokuzei(selfTaxable);
  // 住民税: 課税総所得は1,000円未満切り捨て、所得割から調整控除を引く
  const selfTaxableJr = Math.floor(selfTaxableJ / 1000) * 1000;
  const selfJinteki = jintekiDiffOf(s.goukei, selfIsEarner ? haiInfo : { ...haiInfo, on: false }, selfIsEarner ? inp.kidAges : []);
  let jmShotokuwari = Math.max(0, selfTaxableJr * 0.1 - chouseiKojo(selfTaxableJr, s.goukei, selfJinteki));
  const kintoSelf = s.goukei > 45 * MAN ? 5000 : 0;

  // 住宅ローン控除: 基準所得税額から引き（付加税も減る）、残りは住民税から（課税総所得×5%・上限9.75万）
  let hl = 0;
  if (inp.hlDeductCredit > 0) {
    const fromIt = Math.min(itBaseSelf, inp.hlDeductCredit);
    itBaseSelf -= fromIt;
    const rest = inp.hlDeductCredit - fromIt;
    const fromJm = Math.min(rest, jmShotokuwari, selfTaxable * 0.05, 97_500);
    jmShotokuwari -= fromJm;
    hl = fromIt * sur + fromJm;
  }
  // 年税額は100円未満切り捨て（所得税は付加税を足したあと、住民税は所得割）
  const itSelf = Math.floor((itBaseSelf * sur) / 100) * 100;
  const jmSelf = Math.floor(jmShotokuwari / 100) * 100 + kintoSelf;

  // ── 配偶者 ──
  let itSp = 0;
  let jmSp = 0;
  if (sp && inp.spouse) {
    const ded = sp.shaho + inp.spouse.dcSelfContribY;
    const spExtra = inp.spouseExtraDeduction ?? { income: 0, jumin: 0 };
    const spFamI = selfIsEarner ? 0 : familyI;
    const spFamJ = selfIsEarner ? 0 : familyJ;
    const t = Math.max(0, sp.goukei - kisoKojoIncomeTax(sp.goukei, year) - ded - spFamI - spExtra.income);
    const tj = Math.max(0, sp.goukei - kisoKojoJumin(sp.goukei) - ded - spFamJ - spExtra.jumin);
    itSp = Math.floor((calcShotokuzei(t) * sur) / 100) * 100;
    const tjr = Math.floor(tj / 1000) * 1000;
    const spJinteki = jintekiDiffOf(sp.goukei, selfIsEarner ? { ...haiInfo, on: false } : haiInfo, selfIsEarner ? [] : inp.kidAges);
    jmSp = Math.floor(Math.max(0, tjr * 0.1 - chouseiKojo(tjr, sp.goukei, spJinteki)) / 100) * 100 + (sp.goukei > 45 * MAN ? 5000 : 0);
  }

  // 個人事業税（自営業）: (事業所得 − 事業主控除290万) × 5%。青色申告特別控除は引かない。業種で3〜5%・対象外もあるので、法定業種の多くに当たる5%で計算
  const jigyo = (p: PersonIncome | null | undefined) =>
    p && p.workStyle === "self-employed" ? Math.floor(Math.max(0, p.wageY - 290 * MAN) * 0.05 / 100) * 100 : 0;
  const jigyozei = jigyo(inp.self) + jigyo(inp.spouse);
  const total = Math.round(
    s.shaho + (sp?.shaho ?? 0) + itSelf + itSp + jmSelf + jmSp + jigyozei,
  );

  return {
    shahoSelf: s.shaho,
    shahoSpouse: sp?.shaho ?? 0,
    shotokuzeiSelf: Math.round(itSelf),
    shotokuzeiSpouse: Math.round(itSp),
    juminSelf: Math.round(jmSelf),
    juminSpouse: Math.round(jmSp),
    hlDeduct: Math.round(hl),
    jigyozei,
    total,
    taxableSelf: Math.round(selfTaxable),
    marginalSelf: marginalRate(selfTaxable),
  };
}

// 譲渡益・配当・預金利息の税率（所得税15.315%＋住民税5%）
export const CAPITAL_GAIN_TAX = 0.20315;
