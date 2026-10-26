import type { PensionBreakdown, PensionInput } from "./types";

// 老齢基礎年金 満額(年額) - 2024年度(67歳以下)
// https://www.nenkin.go.jp/service/jukyu/roureinenkin/jukyu-yoken/20150401-01.html
export const FULL_BASIC_ANNUAL = 816_000;

// 厚生年金 給付乗率 (平成15年4月以降の加入期間)
//   年金額(年) = 平均標準報酬額 × 5.481/1000 × 加入月数
// 平成15年3月以前は7.125/1000(平均標準報酬"月額")だが、
// 現役世代のシミュレーションでは新算式のみで近似する。
export const KOSEI_RATE = 5.481 / 1000;

// 加給年金(2024年度・特別加算込み・配偶者分)
// 厚生年金加入20年以上の人が65歳到達時に65歳未満の配偶者がいると加算
// 配偶者が65歳になると停止して振替加算へ。今回は振替加算は省略。
export const KAKYUU_NENKIN_ANNUAL = 408_100;
export const KOSEI_KAKYUU_MIN_MONTHS = 20 * 12;

// 国民年金 保険料免除月数の上限 (480ヶ月 = 40年)
export const KOKUMIN_MAX_MONTHS = 480;

// 受給開始可能年齢の境界
export const PEN_AGE_NORMAL = 65;
export const PEN_AGE_MIN = 60;
export const PEN_AGE_MAX = 75;

// 繰上げ受給: 1ヶ月あたり0.4%減額 (1962年4月2日以降生まれ)
export const KURIAGE_RATE_PER_MONTH = 0.004;
// 繰下げ受給: 1ヶ月あたり0.7%増額
export const KURISAGE_RATE_PER_MONTH = 0.007;

// 受給開始年齢に応じた支給率(0.76 〜 1.84)
export function pensionAdjustment(startAge: number): number {
  const age = Math.max(PEN_AGE_MIN, Math.min(PEN_AGE_MAX, startAge));
  if (age < PEN_AGE_NORMAL) {
    const monthsBefore = (PEN_AGE_NORMAL - age) * 12;
    return Math.max(0.76, 1 - KURIAGE_RATE_PER_MONTH * monthsBefore);
  }
  if (age > PEN_AGE_NORMAL) {
    const monthsAfter = Math.min((age - PEN_AGE_NORMAL) * 12, 120);
    return 1 + KURISAGE_RATE_PER_MONTH * monthsAfter;
  }
  return 1;
}

// 厚生年金加入年数を月数換算で返す。3号(被扶養配偶者)は0。
function koseiMonthsOf(p: PensionInput): number {
  if (p.category !== "kosei") return 0;
  return Math.max(0, Math.min(540, p.koseiYears * 12));
}

// 国民年金の納付済月数を返す。
// 3号被保険者は配偶者(2号)の加入期間に応じて自動的に納付扱いになる前提のため、
// 入力値をそのまま使う(満額=480を初期値にしておく)。
function kokuminMonthsOf(p: PensionInput): number {
  return Math.max(0, Math.min(KOKUMIN_MAX_MONTHS, p.kokuminMonths));
}

export function calcPension(p: PensionInput, startAge: number): PensionBreakdown {
  if (p.mode === "manual") {
    const m = Math.max(0, Math.round(p.manualMonth));
    return { monthly: m, basicMonthly: 0, koseiMonthly: m, adjustment: 1 };
  }

  // 老齢基礎年金 (年額)
  const basicAnnual = FULL_BASIC_ANNUAL * (kokuminMonthsOf(p) / KOKUMIN_MAX_MONTHS);

  // 老齢厚生年金 (年額) - 簡略化として全期間を新算式で計算
  let koseiAnnual = 0;
  if (p.category === "kosei" && p.koseiYears > 0 && p.koseiAvgIncome > 0) {
    const avgMonthlyReward = p.koseiAvgIncome / 12;
    koseiAnnual = avgMonthlyReward * KOSEI_RATE * koseiMonthsOf(p);
  }

  const factor = pensionAdjustment(startAge);
  const basicAdjusted = basicAnnual * factor;
  const koseiAdjusted = koseiAnnual * factor;

  return {
    monthly: Math.round((basicAdjusted + koseiAdjusted) / 12),
    basicMonthly: Math.round(basicAdjusted / 12),
    koseiMonthly: Math.round(koseiAdjusted / 12),
    adjustment: factor,
  };
}

// 加給年金: 本人が65歳到達時、厚生年金加入20年以上 かつ 配偶者が65歳未満の年に加算
export function isKakyuuApplicable(
  selfP: PensionInput,
  selfAge: number,
  selfStartAge: number,
  spouseAge: number | null,
): boolean {
  if (selfP.mode !== "auto") return false;
  if (selfP.category !== "kosei") return false;
  if (koseiMonthsOf(selfP) < KOSEI_KAKYUU_MIN_MONTHS) return false;
  // 加給年金は本人が老齢厚生年金を受給開始してから配偶者が65歳になるまで
  if (selfAge < Math.max(selfStartAge, PEN_AGE_NORMAL)) return false;
  if (spouseAge === null) return false;
  if (spouseAge >= PEN_AGE_NORMAL) return false;
  return true;
}
