import type { Insurance, InsuranceType, Insured } from "./types";

const MAN = 10000;

// 保険の種類。プルダウンの並びもこの順（死亡に備える → 貯める・受け取る → 病気・働けない → 損害 → その他）
export const INSURANCE_TYPES: { value: InsuranceType; label: string; group: string; desc: string }[] = [
  { value: "定期保険", label: "定期保険（掛け捨ての死亡保障）", group: "死亡に備える", desc: "決めた期間に亡くなると保険金。満期金・解約返戻金はほぼない" },
  { value: "収入保障保険", label: "収入保障保険", group: "死亡に備える", desc: "亡くなると、満了の年齢まで毎月の年金が遺族に出る" },
  { value: "終身保険", label: "終身保険（一生の死亡保障）", group: "死亡に備える・貯める", desc: "一生の死亡保障。解約すると解約返戻金。外貨建て・変額もここ" },
  { value: "養老保険", label: "養老保険", group: "貯める", desc: "満期まで生きていれば満期金、亡くなれば同額の死亡保険金" },
  { value: "個人年金保険", label: "個人年金保険", group: "貯める", desc: "決めた年齢から年金で受け取る。外貨建て・変額もここ" },
  { value: "学資保険", label: "学資保険（こども保険）", group: "貯める", desc: "子どもの進学に合わせて祝い金・満期金。契約者が亡くなると以後の保険料は免除" },
  { value: "医療保険", label: "医療保険", group: "病気・けが", desc: "入院・手術の給付。計算には保険料だけを入れる" },
  { value: "がん・三大疾病", label: "がん保険・三大疾病保険", group: "病気・けが", desc: "診断一時金など。計算には保険料だけを入れる" },
  { value: "就業不能保険", label: "就業不能保険・所得補償保険", group: "働けない", desc: "働けなくなったときの毎月の給付。計算には保険料だけを入れる" },
  { value: "介護保険", label: "介護保険（民間）", group: "介護", desc: "要介護になったときの一時金・年金。計算には保険料だけを入れる" },
  { value: "損害保険", label: "損害保険（火災・地震・自動車・賠償）", group: "損害", desc: "家・車・賠償の保険。更新ごとに保険料が変わるので物価に合わせて増やす" },
  { value: "共済", label: "共済（県民共済・コープ共済など）", group: "その他", desc: "毎月の掛金と、死亡・入院の保障" },
  { value: "その他", label: "その他", group: "その他", desc: "上のどれにも当てはまらないもの" },
];

export const typeLabel = (t: InsuranceType) => INSURANCE_TYPES.find((x) => x.value === t)?.label ?? t;

// どの入力欄を出すか（＝どのお金の流れが計算に入るか）
export const HAS = {
  death: (t: InsuranceType) => ["定期保険", "終身保険", "養老保険", "個人年金保険", "共済", "その他"].includes(t),
  incomeProt: (t: InsuranceType) => t === "収入保障保険",
  coverEnd: (t: InsuranceType) => ["定期保険", "収入保障保険", "医療保険", "がん・三大疾病", "就業不能保険", "介護保険", "共済"].includes(t),
  renewal: (t: InsuranceType) => ["定期保険", "医療保険", "がん・三大疾病", "就業不能保険", "共済"].includes(t),
  maturity: (t: InsuranceType) => t === "養老保険",
  surrender: (t: InsuranceType) => ["終身保険", "養老保険", "個人年金保険", "その他"].includes(t),
  annuity: (t: InsuranceType) => t === "個人年金保険",
  edu: (t: InsuranceType) => t === "学資保険",
  currency: (t: InsuranceType) => ["終身保険", "養老保険", "個人年金保険"].includes(t),
  benefit: (t: InsuranceType) => ["医療保険", "がん・三大疾病", "就業不能保険", "介護保険", "共済"].includes(t),
  quake: (t: InsuranceType) => t === "損害保険",
};

// 生命保険料控除の区分（2012年以降の契約＝新制度）
export type DeductKind = "一般" | "介護医療" | "個人年金" | "地震" | "なし";
export function deductKindOf(p: Insurance): DeductKind {
  if (p.deductKind && p.deductKind !== "自動") return p.deductKind;
  return defaultDeductKind(p);
}
export function defaultDeductKind(p: Insurance): DeductKind {
  switch (p.type) {
    case "医療保険":
    case "がん・三大疾病":
    case "就業不能保険":
    case "介護保険":
      return "介護医療";
    case "個人年金保険":
      // 税制適格特約が付いていれば個人年金保険料控除、付いていなければ一般
      return p.qualifiedAnnuity === false || p.currency === "変額" ? "一般" : "個人年金";
    case "損害保険":
      return "地震";
    default:
      return "一般";
  }
}

// 旧データ（ver4.13 以前の種類名・項目）を新しい形に読み替える
const LEGACY_TYPE: Record<string, InsuranceType> = {
  "生命（死亡・収入保障）": "定期保険",
  医療: "医療保険",
  "がん・三大疾病": "がん・三大疾病",
  就業不能: "就業不能保険",
  介護: "介護保険",
  "火災・地震": "損害保険",
  自動車: "損害保険",
  "個人賠償・その他損保": "損害保険",
  貯蓄型: "終身保険",
  その他: "その他",
};

export function normalizeInsurance(raw: Partial<Insurance> & Record<string, unknown>, curAge = 30, endAge = 100): Insurance {
  const known = INSURANCE_TYPES.some((x) => x.value === raw.type);
  const type: InsuranceType = known ? (raw.type as InsuranceType) : LEGACY_TYPE[String(raw.type)] ?? "その他";
  const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    name: typeof raw.name === "string" ? raw.name : "保険",
    company: typeof raw.company === "string" ? raw.company : "",
    type,
    insured: (raw.insured as Insured) ?? "本人",
    contractor: raw.contractor === "配偶者" ? "配偶者" : "本人",
    payMode: raw.payMode === "yearly" || raw.payMode === "single" ? raw.payMode : "monthly",
    premM: n(raw.premM, 0),
    start: n(raw.start, curAge),
    end: n(raw.end, endAge),
    coverEnd: n(raw.coverEnd, 0),
    renewYears: n(raw.renewYears, 0),
    renewRate: n(raw.renewRate, 0),
    deathBenefit: n(raw.deathBenefit, 0),
    incomeProtM: n(raw.incomeProtM, 0),
    incomeProtMinYears: n(raw.incomeProtMinYears, 0),
    maturityAge: n(raw.maturityAge, 0),
    maturityAmount: n(raw.maturityAmount, 0),
    surrenderAge: n(raw.surrenderAge, 0),
    surrenderAmount: n(raw.surrenderAmount, 0),
    annuityStart: n(raw.annuityStart, 65),
    annuityYears: n(raw.annuityYears, 10),
    annuityY: n(raw.annuityY, 0),
    qualifiedAnnuity: raw.qualifiedAnnuity !== false,
    kid: n(raw.kid, 0),
    eduPayouts: Array.isArray(raw.eduPayouts)
      ? (raw.eduPayouts as { kidAge: number; amount: number }[]).map((x) => ({ kidAge: n(x?.kidAge, 18), amount: n(x?.amount, 0) }))
      : [],
    waiver: raw.waiver === undefined ? type === "学資保険" : Boolean(raw.waiver),
    currency: raw.currency === "米ドル" || raw.currency === "豪ドル" || raw.currency === "変額" ? raw.currency : "円",
    benefitDay: n(raw.benefitDay, 0),
    benefitLump: n(raw.benefitLump, 0),
    benefitM: n(raw.benefitM, 0),
    quakePremY: n(raw.quakePremY, 0),
    deductKind: (["自動", "一般", "介護医療", "個人年金", "地震", "なし"] as const).includes(raw.deductKind as never)
      ? (raw.deductKind as Insurance["deductKind"])
      : "自動",
    stepAge: n(raw.stepAge, 0),
    stepDeathBenefit: n(raw.stepDeathBenefit, 0),
    rebateRate: n(raw.rebateRate, 0),
    ikueiM: n(raw.ikueiM, 0),
    ikueiUntilKidAge: n(raw.ikueiUntilKidAge, 22),
    memo: typeof raw.memo === "string" ? raw.memo : "",
    enabled: raw.enabled !== false,
  };
}

export function newInsurance(type: InsuranceType, curAge: number, endAge: number): Insurance {
  const p = normalizeInsurance({ type, name: typeLabel(type).replace(/（.*$/, "") }, curAge, endAge);
  if (type === "定期保険" || type === "収入保障保険") {
    p.end = Math.min(endAge, 65);
    p.coverEnd = Math.min(endAge, 65);
  }
  if (type === "養老保険") {
    p.end = Math.min(endAge, 60);
    p.maturityAge = Math.min(endAge, 60);
  }
  if (type === "終身保険") p.end = Math.min(endAge, 65);
  if (type === "個人年金保険") {
    p.end = Math.min(endAge, 60);
    p.annuityStart = Math.min(endAge, 65);
  }
  if (type === "学資保険") {
    p.insured = "子";
    p.eduPayouts = [{ kidAge: 18, amount: 0 }];
  }
  if (type === "共済") {
    p.coverEnd = Math.min(endAge, 85);
    p.stepAge = 65;
  }
  return p;
}

// その年に払う保険料（円）。本人の年齢で判定
// - 月払: 月額×12 ／ 年払: 年額 ／ 一時払: 払込開始の年に全額
// - 更新型: 更新のたびに保険料が「上がり方（%）」だけ上がる
// - 損害保険・共済は毎年（数年ごと）見直されるので物価に合わせて増やす。それ以外は契約時の保険料で固定
export function premiumAt(p: Insurance, age: number, infl: number): number {
  if (age < p.start) return 0;
  if (p.payMode === "single") return age === p.start ? p.premM : 0;
  if (age > p.end) return 0;
  const coverEnd = HAS.coverEnd(p.type) && p.coverEnd > 0 ? p.coverEnd : Infinity;
  if (age > coverEnd) return 0;
  if (stoppedBySurrender(p, age)) return 0;
  if (HAS.maturity(p.type) && p.maturityAge > 0 && age >= p.maturityAge) return 0;
  const base = p.payMode === "yearly" ? p.premM : p.premM * 12;
  let step = 1;
  if (HAS.renewal(p.type) && p.renewYears > 0 && p.renewRate !== 0) {
    step = Math.pow(1 + p.renewRate / 100, Math.floor((age - p.start) / p.renewYears));
  }
  const floatsWithPrices = p.type === "損害保険";
  // 共済の割戻金は、毎年の掛金が実質その分だけ安くなるとみなす
  const rebate = p.type === "共済" ? 1 - Math.min(100, Math.max(0, p.rebateRate)) / 100 : 1;
  return base * step * rebate * (floatsWithPrices ? infl : 1);
}

// 解約した翌年以降は、保険料も保障もない
function stoppedBySurrender(p: Insurance, age: number) {
  return HAS.surrender(p.type) && p.surrenderAge > 0 && age >= p.surrenderAge;
}

// その年齢で死亡保障が続いているか
export function deathCoverActive(p: Insurance, age: number): boolean {
  if (!p.enabled || age < p.start) return false;
  if (p.surrenderAge > 0 && HAS.surrender(p.type) && age >= p.surrenderAge) return false;
  if (HAS.coverEnd(p.type) && p.coverEnd > 0 && age > p.coverEnd) return false;
  if (HAS.maturity(p.type) && p.maturityAge > 0 && age >= p.maturityAge) return false;
  // 個人年金の死亡給付金は、年金の受取が始まる前まで
  if (HAS.annuity(p.type) && age >= p.annuityStart) return false;
  return true;
}

// その年齢で亡くなったときの死亡保険金（共済は年齢で保障が減る）
export function deathBenefitAt(p: Insurance, age: number): number {
  if (!HAS.death(p.type)) return 0;
  if (p.type === "共済" && p.stepAge > 0 && age >= p.stepAge) return p.stepDeathBenefit;
  return p.deathBenefit;
}

// 一時払の養老保険で、満期（解約）が契約から5年以内のもの＝金融類似商品。差益に20.315%の源泉分離課税
export function isFinancialLike(p: Insurance, payoutAge: number): boolean {
  return p.type === "養老保険" && p.payMode === "single" && payoutAge - p.start <= 5;
}

// 生命保険料控除（新制度・2012年以降の契約）。premY はその区分の年間保険料
export function lifeDeductionIncome(premY: number, cap = 40_000): number {
  // 一般生命保険料控除の上限が6万円になる年（下の generalCapOf）は、各段階を1.5倍
  const k = cap / 40_000;
  if (premY <= 20_000 * k) return premY;
  if (premY <= 40_000 * k) return premY / 2 + 10_000 * k;
  if (premY <= 80_000 * k) return premY / 4 + 20_000 * k;
  return cap;
}
export function lifeDeductionJumin(premY: number): number {
  if (premY <= 12_000) return premY;
  if (premY <= 32_000) return premY / 2 + 6_000;
  if (premY <= 56_000) return premY / 4 + 14_000;
  return 28_000;
}

// 23歳未満の扶養親族がいる人は、一般生命保険料控除（新制度）の上限が6万円（所得税のみ）
//   令和7年度改正で2026年分に創設、令和8年度改正で2027年分まで延長。合計の上限12万円は変わらない
//   出典: 国税庁「令和8年分 源泉徴収事務に関する改正のあらまし」
export function generalCapOf(year: number, hasDependentUnder23: boolean): number {
  return (year === 2026 || year === 2027) && hasDependentUnder23 ? 60_000 : 40_000;
}

export interface InsuranceDeduction {
  income: number;
  jumin: number;
}

// 区分ごとの保険料から、生命保険料控除＋地震保険料控除を計算
export function insuranceDeduction(
  prem: Record<DeductKind, number>,
  year: number,
  hasDependentUnder23: boolean,
): InsuranceDeduction {
  const gCap = generalCapOf(year, hasDependentUnder23);
  const lifeI = Math.min(
    120_000,
    lifeDeductionIncome(prem["一般"], gCap) + lifeDeductionIncome(prem["介護医療"]) + lifeDeductionIncome(prem["個人年金"]),
  );
  const lifeJ = Math.min(
    70_000,
    lifeDeductionJumin(prem["一般"]) + lifeDeductionJumin(prem["介護医療"]) + lifeDeductionJumin(prem["個人年金"]),
  );
  const quakeI = Math.min(50_000, prem["地震"]);
  const quakeJ = Math.min(25_000, prem["地震"] / 2);
  return { income: Math.round(lifeI + quakeI), jumin: Math.round(lifeJ + quakeJ) };
}

// 一時所得（満期金・解約返戻金・学資の祝い金）の課税対象額。特別控除50万円は年ごとに1回
export function ichijiTaxable(gainSumY: number): number {
  return Math.max(0, gainSumY - 50 * MAN) / 2;
}

// 1件の保険の「払込総額・受取総額・返戻率」（入力画面の目安表示用）
export function policySummary(p: Insurance, curAge: number, kidAgeNow: number | null) {
  let paid = 0;
  for (let a = Math.min(p.start, curAge); a <= Math.max(p.end, p.start); a++) paid += premiumAt(p, a, 1);
  let back = 0;
  if (HAS.maturity(p.type)) back += p.maturityAmount;
  if (HAS.surrender(p.type) && p.surrenderAge > 0) back += p.surrenderAmount;
  if (HAS.annuity(p.type)) back += p.annuityY * (p.annuityYears > 0 ? p.annuityYears : 0);
  if (HAS.edu(p.type) && kidAgeNow !== null) back += p.eduPayouts.reduce((s, x) => s + x.amount, 0);
  return { paid, back, ratio: paid > 0 && back > 0 ? back / paid : null };
}

// ── シミュレーションの1年分 ──

type Who = "本人" | "配偶者";
const emptyPrem = (): Record<DeductKind, number> => ({ 一般: 0, 介護医療: 0, 個人年金: 0, 地震: 0, なし: 0 });

export interface InsuranceYear {
  prem: number;           // 払う保険料の合計
  separateTax: number;    // 金融類似商品の源泉分離課税（20.315%）
  payout: number;         // 受け取る満期金・解約返戻金・祝い金・年金（税引き前）
  taxable: Record<Who, number>; // 所得に加える額（一時所得は50万円控除後の1/2、年金は雑所得）
  dedPrem: Record<Who, Record<DeductKind, number>>; // 保険料控除の区分ごとの保険料
  deathLump: number;      // 亡くなった年に出る死亡保険金
  incomeProt: number;     // 収入保障保険の年金（その年の分）
}

export interface InsuranceDeath {
  who: Who;     // 亡くなった人
  age: number;  // 亡くなった年（本人の年齢）
}

// 保険ごとの「まだ取り戻していない払込保険料」（一時所得・雑所得の必要経費）を年をまたいで持つ
export function createInsuranceState(list: Insurance[], curAge: number) {
  const unrecovered = list.map((p) => {
    let s = 0;
    for (let a = p.start; a < curAge; a++) s += premiumAt(p, a, 1);
    return s;
  });
  // 年金の雑所得: 年金額 ×（払込総額 ÷ 年金の受取見込み総額）が必要経費
  const annuityCostRatio = list.map((p) => {
    if (!HAS.annuity(p.type) || p.annuityY <= 0) return 0;
    let total = 0;
    for (let a = p.start; a <= p.end; a++) total += premiumAt(p, a, 1);
    const years = p.annuityYears > 0 ? p.annuityYears : 25; // 終身年金は25年分で見込む（概算）
    // 必要経費の割合は小数第2位まで切り上げ（所得税法施行令183条）
    return Math.min(1, Math.ceil((total / (p.annuityY * years)) * 100) / 100);
  });
  return { unrecovered, annuityCostRatio };
}

export function insuranceYear(
  list: Insurance[],
  state: ReturnType<typeof createInsuranceState>,
  age: number,
  infl: number,
  kidOffsets: number[],
  death: InsuranceDeath | null,
): InsuranceYear {
  const out: InsuranceYear = {
    prem: 0,
    separateTax: 0,
    payout: 0,
    taxable: { 本人: 0, 配偶者: 0 },
    dedPrem: { 本人: emptyPrem(), 配偶者: emptyPrem() },
    deathLump: 0,
    incomeProt: 0,
  };
  const ichiji: Record<Who, number> = { 本人: 0, 配偶者: 0 };
  const deadNow = death !== null && age >= death.age;
  const alive: Who | null = deadNow ? (death.who === "本人" ? "配偶者" : "本人") : null;

  list.forEach((p, i) => {
    if (!p.enabled) return;
    // 学資保険の被保険者は子ども。親の死亡は「契約者の死亡」（払込免除・育英年金）として扱う
    const insuredDead = deadNow && p.insured === death.who && !HAS.edu(p.type);
    const contractorDead = deadNow && p.contractor === death.who;
    // 受け取る人: 契約者。契約者が亡くなった後は遺族
    const owner: Who = contractorDead && alive ? alive : p.contractor;

    // 死亡保険金・収入保障（亡くなった年の判定は「亡くなる前の年まで保障が続いていたか」）
    if (death && p.insured === death.who && !HAS.edu(p.type) && deathCoverActive(p, death.age)) {
      if (age === death.age) out.deathLump += deathBenefitAt(p, death.age);
      if (HAS.incomeProt(p.type) && age >= death.age) {
        const until = Math.max(p.coverEnd > 0 ? p.coverEnd : death.age, death.age + Math.max(0, p.incomeProtMinYears));
        if (age < until) out.incomeProt += p.incomeProtM * 12;
      }
    }
    // 学資保険の育英年金: 契約者が亡くなったら、子どもが決めた年齢になるまで毎年
    if (HAS.edu(p.type) && contractorDead && p.ikueiM > 0) {
      const off = kidOffsets[p.kid];
      if (off !== undefined && age - off < p.ikueiUntilKidAge) out.incomeProt += p.ikueiM * 12;
    }
    if (insuredDead) {
      // 確定年金は残りの期間を遺族が受け取る。それ以外は死亡で終わり
      if (!(HAS.annuity(p.type) && p.annuityYears > 0 && age >= p.annuityStart)) return;
    }

    // 保険料（払込免除なら契約者の死亡後は0）
    const prem = insuredDead || (contractorDead && p.waiver) ? 0 : premiumAt(p, age, infl);
    out.prem += prem;
    state.unrecovered[i] += prem;
    const kind = deductKindOf(p);
    // 損害保険は「うち地震保険料」だけが地震保険料控除の対象
    if (kind === "地震") out.dedPrem[owner]["地震"] += prem > 0 ? Math.min(prem, p.quakePremY * infl) : 0;
    else out.dedPrem[owner][kind] += prem;

    // 一時金（満期・解約・学資）
    let lump = 0;
    if (HAS.maturity(p.type) && p.maturityAge === age && !(p.surrenderAge > 0 && p.surrenderAge < age)) lump += p.maturityAmount;
    if (HAS.surrender(p.type) && p.surrenderAge > 0 && p.surrenderAge === age) lump += p.surrenderAmount;
    if (HAS.edu(p.type)) {
      const off = kidOffsets[p.kid];
      if (off !== undefined) for (const x of p.eduPayouts) if (off + x.kidAge === age) lump += x.amount;
    }
    if (lump > 0) {
      const cost = Math.min(state.unrecovered[i], lump);
      state.unrecovered[i] -= cost;
      if (isFinancialLike(p, age)) out.separateTax += (lump - cost) * 0.20315;
      else ichiji[owner] += lump - cost;
      out.payout += lump;
    }

    // 年金（解約した場合は出ない）
    if (HAS.annuity(p.type) && p.annuityY > 0 && age >= p.annuityStart && !(p.surrenderAge > 0 && p.surrenderAge <= age)) {
      const inPeriod = p.annuityYears > 0 ? age < p.annuityStart + p.annuityYears : true;
      if (inPeriod) {
        out.payout += p.annuityY;
        out.taxable[owner] += p.annuityY * (1 - state.annuityCostRatio[i]);
      }
    }
  });

  out.taxable["本人"] += ichijiTaxable(ichiji["本人"]);
  out.taxable["配偶者"] += ichijiTaxable(ichiji["配偶者"]);
  return out;
}

// 相続税の目安用: 本人が亡くなったときの死亡保険金（契約者＝被保険者＝本人のもの）
export function selfDeathBenefitAt(list: Insurance[], age: number): number {
  return list
    .filter((p) => p.enabled && p.insured === "本人" && p.contractor === "本人" && deathCoverActive(p, age))
    .reduce((s, p) => s + deathBenefitAt(p, age), 0);
}

// もしもの備え用: その人がその年齢で亡くなったら出る保険（保険の一覧から）
export function deathCoverAt(list: Insurance[], insured: Who, age: number) {
  let lump = 0;
  let incomeProtM = 0;
  for (const p of list) {
    if (p.insured !== insured || !deathCoverActive(p, age)) continue;
    lump += deathBenefitAt(p, age);
    if (HAS.incomeProt(p.type)) incomeProtM += p.incomeProtM;
  }
  return { lump, incomeProtM };
}
