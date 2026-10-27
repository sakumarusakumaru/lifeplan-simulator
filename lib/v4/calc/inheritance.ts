// 相続税のざっくり目安（2026年10月時点の制度）
//   基礎控除 = 3,000万 + 600万 × 法定相続人の数
//   生命保険金の非課税枠 = 500万 × 法定相続人の数
//   相続税の総額 = 課税遺産を法定相続分で分けたと仮定し、それぞれに速算表の税率をかけて合計
//   配偶者の税額軽減: 配偶者が法定相続分（または1億6,000万円）まで相続した分は税がかからない
// 含めないもの: 小規模宅地等の特例（自宅の土地の評価減）、路線価・固定資産税評価額での評価、
//   生前贈与の加算、債務・葬式費用、二次相続
import { normalizeInsurance, selfDeathBenefitAt } from "./insurance";
import { computeRealEstateValue } from "./finance";
import type { PlanInput, YearlyResult } from "./types";

const MAN = 10000;

export function legalHeirs(hasSpouse: boolean, kids: number) {
  // 子がいなければ親・兄弟姉妹が相続人になるが、ここでは配偶者のみとして扱う
  return { spouse: hasSpouse, kids, count: (hasSpouse ? 1 : 0) + kids };
}

export function basicDeduction(heirCount: number) {
  return 3000 * MAN + 600 * MAN * Math.max(0, heirCount);
}

function rateTax(share: number): number {
  const v = Math.max(0, share);
  if (v <= 1000 * MAN) return v * 0.1;
  if (v <= 3000 * MAN) return v * 0.15 - 50 * MAN;
  if (v <= 5000 * MAN) return v * 0.2 - 200 * MAN;
  if (v <= 10000 * MAN) return v * 0.3 - 700 * MAN;
  if (v <= 20000 * MAN) return v * 0.4 - 1700 * MAN;
  if (v <= 30000 * MAN) return v * 0.45 - 2700 * MAN;
  if (v <= 60000 * MAN) return v * 0.5 - 4200 * MAN;
  return v * 0.55 - 7200 * MAN;
}

export interface InheritanceEstimate {
  estate: number;      // 相続財産の目安（税の計算上）
  deduction: number;   // 基礎控除
  taxable: number;     // 課税遺産総額
  totalTax: number;    // 相続税の総額
  payable: number;     // 配偶者の税額軽減後に家族全体で払う目安
}

export function estimateInheritanceTax(estate: number, hasSpouse: boolean, kids: number): InheritanceEstimate {
  const h = legalHeirs(hasSpouse, kids);
  const deduction = basicDeduction(h.count);
  const taxable = Math.max(0, estate - deduction);
  if (h.count === 0 || taxable <= 0) return { estate, deduction, taxable, totalTax: 0, payable: 0 };
  // 法定相続分: 配偶者と子 → 配偶者1/2・子で1/2を等分 / 子のみ → 等分 / 配偶者のみ → 全部
  const spouseShare = h.spouse ? (h.kids > 0 ? 0.5 : 1) : 0;
  const kidShare = h.kids > 0 ? (1 - spouseShare) / h.kids : 0;
  let totalTax = rateTax(taxable * spouseShare);
  for (let i = 0; i < h.kids; i++) totalTax += rateTax(taxable * kidShare);
  // 配偶者が法定相続分を相続した場合、配偶者の分は税額軽減で0
  const payable = totalTax * (1 - spouseShare);
  return { estate, deduction, taxable, totalTax: Math.round(totalTax), payable: Math.round(payable) };
}

// その年（年末）の相続財産の目安: 金融資産 + 自宅・不動産の評価額 − ローン + 生命保険金の非課税枠を超える分
export function estateAt(plan: PlanInput, row: YearlyResult, heirCount: number, deflate = 1): number {
  const year = new Date().getFullYear() + (row.age - plan.curAge);
  const a = row.ass;
  const financial = a.c + a.nisa + a.toku + a.k + a.g + a.dc;
  const home = plan.homeOwned
    ? computeRealEstateValue(
        {
          name: "自宅",
          rent: 0,
          cost: 0,
          propTax: 0,
          bal: 0,
          rate: 0,
          term: 0,
          start: 0,
          propType: plan.homePropType ?? "house",
          structure: plan.homeStructure ?? "wood",
          builtYear: plan.homeBuiltYear ?? year,
          purchasePrice: plan.homePurchasePrice ?? 0,
          landRatio: plan.homeLandRatio ?? 50,
          currentValueOverride: 0,
        },
        year,
      )
    : 0;
  const re = plan.res.reduce((acc, r) => acc + computeRealEstateValue({ ...r, currentValueOverride: 0 }, year), 0);
  const loans = row.hlBal + row.reD.reduce((acc, d) => acc + d.bal, 0);
  const insList = (plan.ins ?? []).map((p) => normalizeInsurance(p as never, plan.curAge, plan.endAge));
  const deathBenefit = (plan.risk?.deathInsurance ?? 0) + selfDeathBenefitAt(insList, row.age);
  const insuranceOver = Math.max(0, deathBenefit - 500 * MAN * heirCount);
  // 不動産・保険は名目のモデルなので、「今の価値」表示なら同じく割り戻す
  return financial + (home + re + insuranceOver) / deflate - loans;
}
