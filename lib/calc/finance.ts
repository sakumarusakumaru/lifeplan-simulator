import type { BuildingStructure, Insurance, RealEstate, SchoolType } from "./types";

export function pmt(rate: number, n: number, principal: number): number {
  if (rate === 0) return principal / n;
  return (principal * rate) / (1 - Math.pow(1 + rate, -n));
}

export function calcInsuranceY(
  insurances: Insurance[],
  age: number,
  infl: number,
): number {
  let sum = 0;
  for (const p of insurances) {
    if (!p) continue;
    if (p.enabled === false) continue;
    if (age >= p.start && age <= p.end) {
      sum += p.premM * 12 * infl;
    }
  }
  return sum;
}

// 建物構造別の法定耐用年数（年）
const BUILDING_LIFESPAN: Record<BuildingStructure, number> = {
  wood: 22,
  lightSteel: 27,
  heavySteel: 34,
  rc: 47,
  src: 47,
};

/**
 * 不動産の現在評価額を算定（簿価）
 * - 手動上書き(currentValueOverride)があればそれを優先
 * - 物件種別と築年数で自動計算
 *   - 土地のみ: 経年劣化なし
 *   - マンション: 実勢相場ベースの減価カーブ（築40年で40%、その後30%が床）
 *   - 戸建て: 土地分は維持＋建物分は構造別の耐用年数で逓減
 */
export function computeRealEstateValue(re: RealEstate, currentYear: number): number {
  if (re.currentValueOverride > 0) return re.currentValueOverride;
  if (re.purchasePrice <= 0) return 0;

  const age = Math.max(0, currentYear - (re.builtYear || currentYear));

  if (re.propType === "land") {
    // 土地のみ: 市場変動は考慮せず購入価格を維持
    return re.purchasePrice;
  }

  if (re.propType === "mansion") {
    // 東京圏マンションの実勢相場を参考にした減価カーブ
    // 築10年=85% / 築20年=70% / 築30年=55% / 築40年=40% / 床=30%
    let factor: number;
    if (age <= 10) factor = 1.0 - age * 0.015;
    else if (age <= 20) factor = 0.85 - (age - 10) * 0.015;
    else if (age <= 30) factor = 0.70 - (age - 20) * 0.015;
    else if (age <= 40) factor = 0.55 - (age - 30) * 0.015;
    else factor = Math.max(0.30, 0.40 - (age - 40) * 0.01);
    return Math.round(re.purchasePrice * factor);
  }

  // 戸建て: 土地分は維持、建物分は構造別の耐用年数で逓減
  const lifespan = BUILDING_LIFESPAN[re.structure] ?? 22;
  const ratio = Math.min(100, Math.max(0, re.landRatio || 0)) / 100;
  const buildingValue = re.purchasePrice * (1 - ratio);
  const landValue = re.purchasePrice * ratio;
  const remainingBuilding = buildingValue * Math.max(0, 1 - age / lifespan);
  return Math.round(landValue + remainingBuilding);
}

export const EDU: Record<"k" | "e" | "j" | "h" | "u" | "g" | "r", Record<SchoolType, number>> = {
  k: { pub: 20, pri: 50, none: 0 },
  e: { pub: 30, pri: 100, none: 0 },
  j: { pub: 40, pri: 120, none: 0 },
  h: { pub: 40, pri: 100, none: 0 },
  u: { pub: 120, pri: 180, none: 0 },
  g: { pub: 120, pri: 180, none: 0 },
  r: { pub: 100, pri: 100, none: 0 },
};
