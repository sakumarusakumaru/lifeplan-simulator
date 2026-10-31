// 遺族年金（令和8年度・2026年10月時点の制度）
//
// 遺族基礎年金: 18歳年度末までの子がいる配偶者（または子）に支給
//   847,300円 + 子の加算（1・2人目 各243,800円、3人目以降 各81,300円）
// 遺族厚生年金: 亡くなった人が厚生年金に加入していた場合
//   報酬比例部分の3/4。在職中の死亡（短期要件）は加入300月未満でも300月とみなす
//   - 妻: 年齢要件なし。夫の死亡時に30歳未満で子がいなければ5年の有期給付
//   - 夫: 妻の死亡時に55歳以上であることが条件で、支給は60歳から
//         （遺族基礎年金を一緒に受ける間は60歳前でも支給）
//   - 65歳以降は本人の老齢厚生年金が優先。差額だけが遺族厚生年金として出る
//       max(遺族厚生, 遺族厚生×2/3 + 本人の老齢厚生×1/2) − 本人の老齢厚生
// 中高齢寡婦加算: 40〜64歳で遺族基礎年金を受けていない妻に 635,500円
//   （夫の死亡時に40歳以上、または子が18歳年度末を迎えた時点で40歳以上）
//   在職中の死亡（短期要件）か、夫の厚生年金加入が20年以上（長期要件）の場合に限る
//
// 含めないもの: 寡婦年金・死亡一時金（国民年金の第1号のみの人の遺族向け）、
//   経過的寡婦加算（1956年4月1日以前生まれ）、障害のある子の20歳までの延長、
//   2028年4月からの見直し（子のない60歳未満の配偶者は原則5年の有期給付 等）
import { KOSEI_RATE } from "./pension";
import type { YearlyResult } from "./types";

export const SURVIVOR_2026 = {
  kiso: 847_300,
  childAdd12: 243_800,
  childAdd3: 81_300,
  chukorei: 635_500,
  minKoseiMonths: 300,
};

export type Sex = "female" | "male";

export interface DeceasedRecord {
  isKosei: boolean;          // 厚生年金の加入者（だった）か
  koseiMonths: number;       // 死亡時点の厚生年金加入月数
  avgAnnualIncome: number;   // 加入期間の平均年収（賞与込み）
  inService: boolean;        // 在職中の死亡（短期要件）
}

export interface SurvivorState {
  hasSpouse: boolean;
  spouseSex: Sex;            // 遺族となる配偶者の性別
  spouseAge: number;         // 当年の配偶者の年齢
  spouseAgeAtDeath: number;
  spouseOwnKoseiAnnual: number; // 配偶者自身の老齢厚生年金（受給中なら。それ以外は0）
  childAges: number[];       // 当年の子の年齢（生まれていない子は除く）
  childAgesAtDeath: number[];
}

export interface SurvivorBenefit {
  kiso: number;
  kosei: number;
  chukorei: number;
  total: number;
}

const isEligibleChild = (age: number) => age >= 0 && age <= 17;

// 遺族厚生年金の基本額（年額・改定前）
export function survivorKoseiBase(d: DeceasedRecord): number {
  if (!d.isKosei || d.avgAnnualIncome <= 0) return 0;
  const months = d.inService
    ? Math.max(SURVIVOR_2026.minKoseiMonths, d.koseiMonths)
    : d.koseiMonths;
  if (months <= 0) return 0;
  const avgMonthly = Math.min(d.avgAnnualIncome, 1080 * 10000) / 12;
  return avgMonthly * KOSEI_RATE * months * 0.75;
}

function childAdd(n: number): number {
  if (n <= 0) return 0;
  const first = Math.min(n, 2) * SURVIVOR_2026.childAdd12;
  const rest = Math.max(0, n - 2) * SURVIVOR_2026.childAdd3;
  return first + rest;
}

// 1年分の遺族年金（年額）。index は年金額の改定倍率（2026年度=1）
export function survivorBenefitForYear(
  d: DeceasedRecord,
  s: SurvivorState,
  index: number,
): SurvivorBenefit {
  const kids = s.childAges.filter(isEligibleChild).length;
  const koseiBase = survivorKoseiBase(d);

  // ── 配偶者がいない場合: 子が受け取る（18歳年度末まで）──
  if (!s.hasSpouse) {
    if (kids === 0) return { kiso: 0, kosei: 0, chukorei: 0, total: 0 };
    // 子が受ける遺族基礎年金は、2人目から加算（1人目は本体）
    const kiso = SURVIVOR_2026.kiso + childAdd(kids) - SURVIVOR_2026.childAdd12;
    const r = { kiso: kiso * index, kosei: koseiBase * index, chukorei: 0, total: 0 };
    r.total = r.kiso + r.kosei;
    return r;
  }

  // ── 遺族基礎年金（子のある配偶者）──
  const kisoAnnual = kids > 0 ? SURVIVOR_2026.kiso + childAdd(kids) : 0;
  const receivingKiso = kisoAnnual > 0;

  // ── 遺族厚生年金 ──
  let kosei = 0;
  if (koseiBase > 0) {
    const kidsAtDeath = s.childAgesAtDeath.filter(isEligibleChild).length;
    let eligible = true;
    if (s.spouseSex === "male") {
      // 夫: 死亡時55歳以上、支給は60歳から（遺族基礎を受ける間は例外）
      if (s.spouseAgeAtDeath < 55 && !receivingKiso) eligible = false;
      if (s.spouseAge < 60 && !receivingKiso) eligible = false;
    } else if (s.spouseAgeAtDeath < 30 && kidsAtDeath === 0) {
      // 妻: 30歳未満で子がいなければ5年の有期給付
      if (s.spouseAge - s.spouseAgeAtDeath >= 5) eligible = false;
    }
    if (eligible) {
      const own = s.spouseOwnKoseiAnnual;
      const base = koseiBase * index;
      if (own > 0 && s.spouseAge >= 65) {
        // 65歳からは自分の老齢厚生年金を先に受け、遺族厚生年金はその差額（2/3＋1/2の比較あり）
        kosei = Math.max(0, Math.max(base, base * (2 / 3) + own / 2) - own);
      } else if (own > 0) {
        // 65歳前は、遺族厚生年金と自分の老齢厚生年金（繰上げ）のどちらか一方を選ぶ。多い方を受けるとみなし、差額だけ足す
        kosei = Math.max(0, base - own);
      } else {
        kosei = base;
      }
    }
  }

  // ── 中高齢寡婦加算（妻のみ）──
  let chukorei = 0;
  if (
    koseiBase > 0 &&
    (d.inService || d.koseiMonths >= 240) &&
    s.spouseSex === "female" &&
    !receivingKiso &&
    s.spouseAge >= 40 &&
    s.spouseAge < 65
  ) {
    // 死亡時に40歳以上、または末子が18歳年度末を迎えた時点で40歳以上
    const youngestAtDeath = s.childAgesAtDeath.filter(isEligibleChild);
    const ageWhenKidsGrown = youngestAtDeath.length
      ? s.spouseAgeAtDeath + (18 - Math.min(...youngestAtDeath))
      : s.spouseAgeAtDeath;
    if (ageWhenKidsGrown >= 40) chukorei = SURVIVOR_2026.chukorei;
  }

  const r = {
    kiso: kisoAnnual * index,
    kosei,
    chukorei: chukorei * index,
    total: 0,
  };
  r.total = r.kiso + r.kosei + r.chukorei;
  return r;
}

// 遺族年金の内訳が変わる区切りごとにまとめる
export interface SurvivorPhase {
  from: number;
  to: number;
  kiso: number;
  kosei: number;
  chukorei: number;
  prot: number;
}

export function buildSurvivorPhases(rows: YearlyResult[]): SurvivorPhase[] {
  const phases: SurvivorPhase[] = [];
  for (const r of rows) {
    if (!r.dead) continue;
    const key = `${r.survKiso > 0}-${r.survKosei > 0}-${r.survChukorei > 0}-${r.incomeProt > 0}`;
    const last = phases[phases.length - 1];
    const lastKey = last
      ? `${last.kiso > 0}-${last.kosei > 0}-${last.chukorei > 0}-${last.prot > 0}`
      : "";
    if (last && lastKey === key) {
      last.to = r.age;
    } else {
      phases.push({ from: r.age, to: r.age, kiso: r.survKiso, kosei: r.survKosei, chukorei: r.survChukorei, prot: r.incomeProt });
    }
  }
  return phases.filter((p) => p.kiso + p.kosei + p.chukorei + p.prot > 0);
}

