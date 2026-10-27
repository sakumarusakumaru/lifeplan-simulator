// 相続税の目安（2026年10月時点の制度）
//   課税価格 = 本人名義の財産 + みなし相続財産（死亡保険金・死亡退職金・DCの死亡一時金のうち非課税枠を超える分） − 債務
//     生命保険金の非課税枠 = 500万 × 法定相続人 ／ 死亡退職金（DC死亡一時金を含む）の非課税枠 = 500万 × 法定相続人
//     小規模宅地等の特例: 自宅の土地を配偶者（または同居の子）が相続すると、330㎡まで評価を80%減らせる（選べる）
//   基礎控除 = 3,000万 + 600万 × 法定相続人
//   相続税の総額 = 課税遺産総額を法定相続分で分けたと仮定し、それぞれに速算表をかけて合計（実際の分け方に関係なく決まる）
//   各人の税額 = 総額 × その人が実際に相続した割合
//   配偶者の税額軽減 = 総額 × min(配偶者の課税価格, max(1億6,000万, 課税価格 × 配偶者の法定相続分)) ÷ 課税価格
//   未成年者控除 = 10万 × (18 − 年齢)（子の税額から引く）
//   二次相続: 残った配偶者が亡くなったとき。配偶者の財産 = 配偶者名義の財産 + 一次相続で受け取った分 − その税。相続人は子だけ
// 含めないもの: 路線価・固定資産税評価額での評価（自宅・不動産は購入価格から築年数で減価した概算）、
//   生前贈与の加算、葬式費用、相次相続控除、2割加算、子がいない場合の親・兄弟姉妹の相続
import { normalizeInsurance, selfDeathBenefitAt } from "./insurance";
import { computeRealEstateValue } from "./finance";
import type { InheritSettings, PlanInput, YearlyResult } from "./types";

const MAN = 10000;

export const DEFAULT_INHERIT: InheritSettings = { selfSharePct: 100, spouseMode: "legal", smallLand: true };

export function legalHeirs(hasSpouse: boolean, kids: number) {
  // 子がいなければ親・兄弟姉妹が相続人になるが、ここでは配偶者のみとして扱う
  return { spouse: hasSpouse, kids, count: (hasSpouse ? 1 : 0) + kids };
}

export function basicDeduction(heirCount: number) {
  return 3000 * MAN + 600 * MAN * Math.max(0, heirCount);
}

export function rateTax(share: number): number {
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

export interface HeirShare {
  who: "spouse" | "kid";
  kid: number;     // 子の番号（0始まり。配偶者は -1）
  ratio: number;   // 相続する割合（0〜1）
  take: number;    // 相続する額
  tax: number;     // 総額を割合で分けた税（軽減の前）
  relief: number;  // 配偶者の税額軽減・未成年者控除
  payable: number; // 納める税
}

export interface InheritanceEstimate {
  estate: number;      // 課税価格（相続財産の目安）
  deduction: number;   // 基礎控除
  taxable: number;     // 課税遺産総額
  totalTax: number;    // 相続税の総額（軽減の前）
  spouseTake: number;  // 配偶者が相続する額
  spouseRelief: number; // 配偶者の税額軽減
  minorRelief: number; // 未成年者控除
  payable: number;     // 実際に家族が払う税額
  people: HeirShare[]; // 一人ずつ
}

// 一次相続（または配偶者がいない場合の相続）の税額
//   spouseTakeRatio: 配偶者が相続する割合（0〜1）
//   kidShares: 子それぞれが相続する割合（0〜1）。省略すると残りを子で等分
export function inheritanceTax(estate: number, hasSpouse: boolean, kids: number, spouseTakeRatio = 0.5, kidAges: number[] = [], kidShares?: number[]): InheritanceEstimate {
  const h = legalHeirs(hasSpouse, kids);
  const deduction = basicDeduction(h.count);
  const taxable = Math.max(0, estate - deduction);
  // 法定相続分: 配偶者と子 → 配偶者1/2・子で1/2を等分 / 子のみ → 等分 / 配偶者のみ → 全部
  const legalSpouse = h.spouse ? (h.kids > 0 ? 0.5 : 1) : 0;
  const legalKid = h.kids > 0 ? (1 - legalSpouse) / h.kids : 0;
  let totalTax = 0;
  if (taxable > 0) {
    totalTax = rateTax(taxable * legalSpouse);
    for (let i = 0; i < h.kids; i++) totalTax += rateTax(taxable * legalKid);
  }
  // 実際の分け方
  const sRatio = h.spouse ? (h.kids > 0 ? Math.min(1, Math.max(0, spouseTakeRatio)) : 1) : 0;
  const kidRatios = Array.from({ length: h.kids }, (_, i) =>
    kidShares && kidShares.length === h.kids ? Math.max(0, kidShares[i]) : (1 - sRatio) / h.kids,
  );
  const people: HeirShare[] = [];
  if (h.spouse) {
    const tax = totalTax * sRatio;
    const take = estate * sRatio;
    const relief = estate > 0 ? Math.min(tax, (totalTax * Math.min(take, Math.max(16000 * MAN, estate * legalSpouse))) / estate) : 0;
    people.push({ who: "spouse", kid: -1, ratio: sRatio, take, tax, relief, payable: tax - relief });
  }
  kidRatios.forEach((r, i) => {
    const tax = totalTax * r;
    const age = kidAges[i];
    const relief = age !== undefined && age < 18 ? Math.min(tax, 10 * MAN * (18 - age)) : 0;
    people.push({ who: "kid", kid: i, ratio: r, take: estate * r, tax, relief, payable: tax - relief });
  });
  const rounded = people.map((x) => ({ ...x, take: Math.round(x.take), tax: Math.round(x.tax), relief: Math.round(x.relief), payable: Math.round(Math.max(0, x.payable)) }));
  const sp = rounded.find((x) => x.who === "spouse");
  return {
    estate,
    deduction,
    taxable,
    totalTax: Math.round(totalTax),
    spouseTake: sp?.take ?? 0,
    spouseRelief: sp?.relief ?? 0,
    minorRelief: rounded.filter((x) => x.who === "kid").reduce((a, x) => a + x.relief, 0),
    payable: rounded.reduce((a, x) => a + x.payable, 0),
    people: rounded,
  };
}

// 法定相続分の割合（%）。配偶者がいれば [配偶者, 子…]、いなければ [子…]
export function legalSharesPct(hasSpouse: boolean, kids: number): number[] {
  if (kids === 0) return hasSpouse ? [100] : [];
  const kidPct = (hasSpouse ? 50 : 100) / kids;
  return [...(hasSpouse ? [50] : []), ...Array.from({ length: kids }, () => Math.round(kidPct * 10) / 10)];
}

// 前の版との互換（配偶者が法定相続分を相続した場合）
export function estimateInheritanceTax(estate: number, hasSpouse: boolean, kids: number): InheritanceEstimate {
  return inheritanceTax(estate, hasSpouse, kids, 0.5);
}

export interface EstateBreakdown {
  financial: number;     // 現金・NISA・特定口座・暗号資産・金（本人名義の割合をかけた後）
  home: number;          // 自宅（小規模宅地等の特例の後）
  homeLandCut: number;   // 小規模宅地等の特例で減らした額
  realEstate: number;    // 投資用不動産
  loans: number;         // ローン（債務）
  insurance: number;     // 死亡保険金のうち非課税枠を超える分
  insuranceGross: number;
  retirement: number;    // 死亡退職金・DC死亡一時金のうち非課税枠を超える分
  retirementGross: number;
  total: number;         // 課税価格
  spouseOwn: number;     // 配偶者名義の財産（二次相続で使う）
}

function homeValue(plan: PlanInput, year: number) {
  if (!plan.homeOwned) return 0;
  return computeRealEstateValue(
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
      currentValueOverride: plan.homeCurrentValueOverride ?? 0,
    },
    year,
  );
}

// 在職中に亡くなったときの死亡退職金（退職金を勤続年数で按分。simulate.ts と同じ考え方）
function deathSeverance(plan: PlanInput, age: number) {
  return plan.jobs.reduce((a, j) => (age >= j.start && age < j.end && j.sev > 0 ? a + j.sev * Math.min(1, (age - j.start) / Math.max(1, j.end - j.start)) : a), 0);
}

// その年（年末）に本人が亡くなった場合の課税価格の内訳
export function estateBreakdown(plan: PlanInput, row: YearlyResult, heirCount: number, deflate = 1, s: InheritSettings = plan.inheritSet ?? DEFAULT_INHERIT, hasSpouse = true): EstateBreakdown {
  const year = new Date().getFullYear() + (row.age - plan.curAge);
  const share = Math.min(100, Math.max(0, s.selfSharePct)) / 100;
  const a = row.ass;
  const householdFin = a.c + a.nisa + a.toku + a.k + a.g;
  const hv = homeValue(plan, year) / deflate;
  // 小規模宅地等の特例（自宅の土地・330㎡まで80%減）。配偶者が相続する前提。マンションは土地の割合を2割とみなす
  const landRatio = plan.homePropType === "mansion" ? 0.2 : plan.homePropType === "land" ? 1 : (plan.homeLandRatio ?? 50) / 100;
  const homeSelf = hv * share;
  const homeLandCut = s.smallLand && hasSpouse ? homeSelf * landRatio * 0.8 : 0;
  const re = plan.res.reduce((acc, r) => acc + computeRealEstateValue({ ...r, currentValueOverride: 0 }, year), 0) / deflate;
  const loans = row.hlBal + row.reD.reduce((acc, d) => acc + d.bal, 0);
  const insList = (plan.ins ?? []).map((p) => normalizeInsurance(p as never, plan.curAge, plan.endAge));
  const insuranceGross = ((plan.risk?.deathInsurance ?? 0) + selfDeathBenefitAt(insList, row.age)) / deflate;
  const insurance = Math.max(0, insuranceGross - 500 * MAN * heirCount);
  // DC（iDeCo・企業型DC）は本人名義。死亡一時金は退職手当金と同じ非課税枠
  const retirementGross = a.dc + deathSeverance(plan, row.age) / deflate;
  const retirement = Math.max(0, retirementGross - 500 * MAN * heirCount);
  // 住宅ローンは本人の債務（団信があれば亡くなると0になるので債務から外す）
  const hlDebt = plan.risk?.danshin ? 0 : row.hlBal;
  const reLoans = loans - row.hlBal;
  const total = Math.max(0, householdFin * share + homeSelf - homeLandCut + re + insurance + retirement - hlDebt - reLoans);
  const spouseOwn = hasSpouse ? Math.max(0, (householdFin + hv) * (1 - share)) : 0;
  return {
    financial: householdFin * share,
    home: homeSelf - homeLandCut,
    homeLandCut,
    realEstate: re,
    loans: hlDebt + reLoans,
    insurance,
    insuranceGross,
    retirement,
    retirementGross,
    total,
    spouseOwn,
  };
}

// 前の版との互換: 課税価格だけ
export function estateAt(plan: PlanInput, row: YearlyResult, heirCount: number, deflate = 1): number {
  return estateBreakdown(plan, row, heirCount, deflate).total;
}

export interface InheritancePlan {
  breakdown: EstateBreakdown;
  spouseRatio: number;           // 選んだ配偶者の取得割合
  kidShares: number[] | undefined; // 「自分で決める」のときの子それぞれの割合（0〜1）
  first: InheritanceEstimate;    // 一次相続
  second: InheritanceEstimate | null; // 二次相続（配偶者と子がいる場合）
  secondEstate: number;
  total: number;                 // 一次＋二次
  scan: { ratio: number; first: number; second: number; total: number }[]; // 配偶者の取得割合ごとの比較
  bestRatio: number;             // 一次＋二次が最も少ない割合
}

function secondFor(b: EstateBreakdown, first: InheritanceEstimate, kids: number, hasSpouse: boolean) {
  if (!hasSpouse || kids === 0) return { second: null, secondEstate: 0 };
  // 配偶者が受け取った分から配偶者自身の税を引き、配偶者名義の財産と合わせる（その後の増減は見ない）
  const spousePaid = first.people.find((x) => x.who === "spouse")?.payable ?? 0;
  const secondEstate = Math.max(0, b.spouseOwn + first.spouseTake - spousePaid);
  // 二次相続は子で等分（法定相続分）とする
  return { second: inheritanceTax(secondEstate, false, kids, 0), secondEstate };
}

// 一次相続・二次相続をまとめて試算する
export function planInheritance(plan: PlanInput, row: YearlyResult, hasSpouse: boolean, kids: number, deflate = 1): InheritancePlan {
  const s = { ...DEFAULT_INHERIT, ...(plan.inheritSet ?? {}) };
  const heirs = legalHeirs(hasSpouse, kids);
  const b = estateBreakdown(plan, row, heirs.count, deflate, s, hasSpouse);
  const kidAges = plan.kids.map((k) => row.age - k.offset);
  // 「自分で決める」: 入力した割合を合計100%に直して使う
  const custom = s.spouseMode === "custom" && (s.shares?.length ?? 0) === (hasSpouse ? 1 : 0) + kids && kids > 0 ? s.shares! : null;
  const customSum = custom ? custom.reduce((a, x) => a + Math.max(0, x), 0) : 0;
  const customRatio = custom && customSum > 0 && hasSpouse ? Math.max(0, custom[0]) / customSum : 0;
  const kidShares = custom && customSum > 0 ? custom.slice(hasSpouse ? 1 : 0).map((x) => Math.max(0, x) / customSum) : undefined;
  const calc = (ratio: number, ks?: number[]) => {
    const first = inheritanceTax(b.total, hasSpouse, kids, ratio, kidAges, ks);
    const { second, secondEstate } = secondFor(b, first, kids, hasSpouse);
    return { first, second, secondEstate, total: first.payable + (second?.payable ?? 0) };
  };
  const scan = hasSpouse && kids > 0
    ? Array.from({ length: 21 }, (_, i) => i * 0.05).map((ratio) => {
        const c = calc(ratio);
        return { ratio, first: c.first.payable, second: c.second?.payable ?? 0, total: c.total };
      })
    : [];
  const bestRatio = scan.length ? scan.reduce((m, x) => (x.total < m.total ? x : m), scan[0]).ratio : 0;
  const ratio = !hasSpouse
    ? 0
    : kids === 0
      ? 1
      : s.spouseMode === "legal"
        ? 0.5
        : s.spouseMode === "all"
          ? 1
          : s.spouseMode === "none"
            ? 0
            : s.spouseMode === "cap16"
              ? Math.min(1, (16000 * MAN) / Math.max(1, b.total))
              : s.spouseMode === "best"
                ? bestRatio
                : s.spouseMode === "custom" && kidShares
                  ? customRatio
                  : 0.5;
  const c = calc(ratio, kidShares);
  return { breakdown: b, spouseRatio: ratio, kidShares, first: c.first, second: c.second, secondEstate: c.secondEstate, total: c.total, scan, bestRatio };
}
