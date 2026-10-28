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
// 不動産は時価ではなく相続税評価額で入れる（realEstateEval）
//   土地 = 路線価（公示価格のおよそ8割）→ 時価の目安 × 0.8
//   建物 = 固定資産税評価額 → 建築費の6割 × 経年減点（耐用年数で2割まで下がり、それより下がらない）
//   マンション（2024年〜の区分所有マンションの評価）→ 時価の目安 × 0.6
//   貸している物件: 土地は貸家建付地（× (1 − 借地権割合0.6 × 借家権割合0.3) = × 0.82）、建物は貸家（× 0.7）
//   評価額がわかれば（固定資産税の課税明細書・税理士の計算）入力した額を使う
// 含めないもの: 生前贈与の加算、葬式費用、相次相続控除、2割加算、子がいない場合の親・兄弟姉妹の相続、
//   貸付事業用宅地の特例（200㎡まで50%減）、不動産投資ローンの団信
import { normalizeInsurance, selfDeathBenefitAt, selfIncomeProtValueAt } from "./insurance";
import { BUILDING_LIFESPAN, computeRealEstateValue, ownsHomeAt } from "./finance";
import type { InheritSettings, PlanInput, RealEstate, YearlyResult } from "./types";

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
  const kidPct = Math.round(((hasSpouse ? 50 : 100) / kids) * 10) / 10;
  const out = [...(hasSpouse ? [50] : []), ...Array.from({ length: kids }, () => kidPct)];
  // 端数は最後の子で合わせて、合計を100%にする
  out[out.length - 1] = Math.round((100 - out.slice(0, -1).reduce((a, x) => a + x, 0)) * 10) / 10;
  return out;
}

// 前の版との互換（配偶者が法定相続分を相続した場合）
export function estimateInheritanceTax(estate: number, hasSpouse: boolean, kids: number): InheritanceEstimate {
  return inheritanceTax(estate, hasSpouse, kids, 0.5);
}

export interface PropertyEval {
  key: string;       // "home" / "re-番号"
  label: string;
  rental: boolean;   // 人に貸している
  market: number;    // 時価の目安（購入価格から築年数で減価）
  land: number;      // 相続税評価額のうち土地
  building: number;  // 相続税評価額のうち建物
  value: number;     // 相続税評価額
  manual: boolean;   // 評価額を入力した
}

export interface EstateBreakdown {
  financial: number;     // 現金・NISA・特定口座・暗号資産・金（本人名義の割合をかけた後）
  home: number;          // 自宅（相続税評価・本人名義の分・小規模宅地等の特例の後）
  homeLandCut: number;   // 小規模宅地等の特例で減らした額
  realEstate: number;    // 投資用不動産（相続税評価）
  props: PropertyEval[]; // 不動産ごとの評価（いまの額。本人名義の割合をかける前）
  loans: number;         // ローン（債務）
  insurance: number;     // 死亡保険金のうち非課税枠を超える分
  insuranceGross: number;
  retirement: number;    // 死亡退職金・DC死亡一時金のうち非課税枠を超える分
  retirementGross: number;
  total: number;         // 課税価格
  spouseOwn: number;     // 配偶者名義の財産（二次相続で使う）
}

const homeAsRealEstate = (plan: PlanInput): RealEstate => ({
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
  builtYear: plan.homeBuiltYear ?? new Date().getFullYear(),
  purchasePrice: plan.homePurchasePrice ?? 0,
  landRatio: plan.homeLandRatio ?? 50,
  currentValueOverride: plan.homeCurrentValueOverride ?? 0,
});

// マンションの評価額のうち土地（敷地権）の割合の目安
const MANSION_LAND = 0.2;
// 貸家建付地・貸家の割合（借地権割合60%・借家権割合30%・満室とする）
const RENT_LAND = 1 - 0.6 * 0.3;
const RENT_BUILDING = 1 - 0.3;

// 1つの不動産の相続税評価額の目安
export function propertyEval(r: RealEstate, year: number, rental: boolean, key: string, manualNow = 0, nowYear = new Date().getFullYear()): PropertyEval {
  const market = computeRealEstateValue(r, year);
  const age = Math.max(0, year - (r.builtYear || year));
  let land = 0;
  let building = 0;
  if (r.propType === "land") {
    land = market * 0.8; // 更地・駐車場は貸家建付地にならない
  } else if (r.propType === "mansion") {
    const v = market * 0.6;
    land = v * MANSION_LAND * (rental ? RENT_LAND : 1);
    building = v * (1 - MANSION_LAND) * (rental ? RENT_BUILDING : 1);
  } else {
    const ratio = Math.min(100, Math.max(0, r.landRatio || 0)) / 100;
    // 時価を上書きしている場合も、土地と建物の比率は購入価格のときと同じとみなす
    const landMarket = r.currentValueOverride > 0 ? market * ratio : r.purchasePrice * ratio;
    const lifespan = BUILDING_LIFESPAN[r.structure] ?? 22;
    const buildingFixed =
      r.purchasePrice > 0
        ? r.purchasePrice * (1 - ratio) * 0.6 * Math.max(0.2, 1 - (0.8 * age) / lifespan)
        : Math.max(0, market - landMarket) * 0.6;
    land = landMarket * 0.8 * (rental ? RENT_LAND : 1);
    building = buildingFixed * (rental ? RENT_BUILDING : 1);
  }
  let value = land + building;
  if (manualNow > 0) {
    // 入力した評価額は、いまの額。先の年は自動の目安と同じ比率で動かす
    const nowAuto = propertyEval(r, nowYear, rental, key).value;
    const k = nowAuto > 0 ? value / nowAuto : 1;
    const v = manualNow * k;
    const landShare = value > 0 ? land / value : 0;
    land = v * landShare;
    building = v - land;
    value = v;
  }
  return { key, label: r.name, rental, market, land, building, value, manual: manualNow > 0 };
}

// 自宅と投資用不動産の相続税評価（その年の額）
export function realEstateEval(plan: PlanInput, year: number, s: InheritSettings = plan.inheritSet ?? DEFAULT_INHERIT): PropertyEval[] {
  const out: PropertyEval[] = [];
  const pv = s.propValue ?? {};
  if (ownsHomeAt(plan, plan.curAge + (year - new Date().getFullYear()))) out.push(propertyEval(homeAsRealEstate(plan), year, false, "home", pv.home ?? 0));
  plan.res.forEach((r, i) => {
    const key = `re-${i}`;
    out.push({ ...propertyEval({ ...r, currentValueOverride: r.currentValueOverride ?? 0 }, year, r.rent > 0, key, pv[key] ?? 0), label: r.name || `投資用不動産${i + 1}` });
  });
  return out;
}

// 在職中に亡くなったときの死亡退職金（退職金を勤続年数で按分。simulate.ts と同じ考え方）
//   退職金を受け取る年の死亡は、まだ受け取っていないものとして全額
function deathSeverance(plan: PlanInput, age: number) {
  return plan.jobs.reduce((a, j) => {
    if (j.sev <= 0) return a;
    if (age === j.sevAge) return a + j.sev;
    return age >= j.start && age < j.end ? a + j.sev * Math.min(1, (age - j.start) / Math.max(1, j.end - j.start)) : a;
  }, 0);
}

// その年（年末）に本人が亡くなった場合の課税価格の内訳
export function estateBreakdown(plan: PlanInput, row: YearlyResult, heirCount: number, deflate = 1, s: InheritSettings = plan.inheritSet ?? DEFAULT_INHERIT, hasSpouse = true): EstateBreakdown {
  const year = new Date().getFullYear() + (row.age - plan.curAge);
  // 配偶者がいなければ、家族の財産はすべて本人のもの
  const share = hasSpouse ? Math.min(100, Math.max(0, s.selfSharePct)) / 100 : 1;
  const a = row.ass;
  const householdFin = a.c + a.nisa + a.toku + a.k + a.g;
  const props = realEstateEval(plan, year, s).map((p) => ({ ...p, market: p.market / deflate, land: p.land / deflate, building: p.building / deflate, value: p.value / deflate }));
  const home = props.find((p) => p.key === "home");
  const hv = home?.value ?? 0;
  // 小規模宅地等の特例（自宅の土地・330㎡まで80%減）。配偶者が相続する前提
  const homeSelf = hv * share;
  const homeLandCut = s.smallLand && hasSpouse && home ? home.land * share * 0.8 : 0;
  const re = props.filter((p) => p.key !== "home").reduce((acc, p) => acc + p.value, 0);
  const loans = row.hlBal + row.reD.reduce((acc, d) => acc + d.bal, 0);
  const insList = (plan.ins ?? []).map((p) => normalizeInsurance(p as never, plan.curAge, plan.endAge));
  // 「一覧に入れていない死亡保険金」は亡くなる人にかかっている分なので、本人が亡くなる設定のときだけ入れる
  const listedLump = (plan.risk?.who ?? "self") === "self" ? plan.risk?.deathInsurance ?? 0 : 0;
  const insuranceGross = (listedLump + selfDeathBenefitAt(insList, row.age) + selfIncomeProtValueAt(insList, row.age)) / deflate;
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
    props,
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
  heirKids: number;              // 相続人になる子の数（亡くなる時点で生まれている子。配偶者も子もいなければ親・兄弟姉妹の1人）
  heirKidIdx: number[];          // その子が plan.kids の何番目か（親・兄弟姉妹のときは空）
  first: InheritanceEstimate;    // 一次相続
  second: InheritanceEstimate | null; // 二次相続（配偶者と子がいる場合）
  secondEstate: number;
  total: number;                 // 一次＋二次
  scan: { ratio: number; first: number; second: number; total: number }[]; // 配偶者の取得割合ごとの比較
  bestRatio: number;             // 一次＋二次が最も少ない割合
}

// 小規模宅地等の特例は配偶者が自宅を相続する前提。配偶者が相続しない分け方では使わない
function withLandCut(b: EstateBreakdown, ratio: number): EstateBreakdown {
  if (ratio > 0 || b.homeLandCut <= 0) return b;
  return { ...b, home: b.home + b.homeLandCut, total: b.total + b.homeLandCut, homeLandCut: 0 };
}

function secondFor(b: EstateBreakdown, first: InheritanceEstimate, ratio: number, kids: number, hasSpouse: boolean) {
  if (!hasSpouse || kids === 0) return { second: null, secondEstate: 0 };
  // 配偶者が実際に受け取るのは、特例や非課税枠で減らす前の額（自宅の土地の8割減・保険金や退職金の非課税分も手元に残る）。
  // そこから配偶者自身の税を引き、配偶者名義の財産と合わせる（その後の増減は見ない）。二次相続では小規模宅地等の特例を使わない
  const received = ratio * (b.total + b.homeLandCut + (b.insuranceGross - b.insurance) + (b.retirementGross - b.retirement));
  const spousePaid = first.people.find((x) => x.who === "spouse")?.payable ?? 0;
  const secondEstate = Math.max(0, b.spouseOwn + received - spousePaid);
  // 二次相続は子で等分（法定相続分）とする
  return { second: inheritanceTax(secondEstate, false, kids, 0), secondEstate };
}

// 金額だけを k で割る（割合・番号はそのまま）
const KEEP = new Set(["ratio", "kid", "spouseRatio", "bestRatio", "heirKids", "heirKidIdx", "kidShares"]);
function scaleMoney<T>(v: T, k: number, key = ""): T {
  if (k === 1 || KEEP.has(key)) return v;
  if (typeof v === "number") return (v / k) as T;
  if (Array.isArray(v)) return v.map((x) => scaleMoney(x, k)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, scaleMoney(x, k, kk)])) as T;
  return v;
}

// 一次相続・二次相続をまとめて試算する
//   税は名目の金額で計算する（基礎控除・速算表は名目で決まっているため）。deflate は結果の表示を今の価値に直すためだけに使う
export function planInheritance(plan: PlanInput, row: YearlyResult, hasSpouse: boolean, kids: number, deflate = 1): InheritancePlan {
  const s = { ...DEFAULT_INHERIT, ...(plan.inheritSet ?? {}) };
  // 相続人になる子は、亡くなる時点で生まれている子だけ
  const born = plan.kids.map((k, i) => ({ i, age: row.age - k.offset })).filter((x) => x.age >= 0);
  const nKids = plan.kids.length > 0 ? (born.length > 0 ? born.length : hasSpouse ? 0 : 1) : kids;
  const heirKidIdx = plan.kids.length > 0 ? born.map((x) => x.i) : [];
  const kidAges = born.map((x) => x.age);
  const heirs = legalHeirs(hasSpouse, nKids);
  const b0 = estateBreakdown(plan, row, heirs.count, 1, s, hasSpouse);
  // 「自分で決める」: 入力した割合を合計100%に直して使う
  const custom = s.spouseMode === "custom" && (s.shares?.length ?? 0) === (hasSpouse ? 1 : 0) + nKids && nKids > 0 ? s.shares! : null;
  const customSum = custom ? custom.reduce((a, x) => a + Math.max(0, x), 0) : 0;
  const customRatio = custom && customSum > 0 && hasSpouse ? Math.max(0, custom[0]) / customSum : 0;
  const kidShares = custom && customSum > 0 ? custom.slice(hasSpouse ? 1 : 0).map((x) => Math.max(0, x) / customSum) : undefined;
  const calc = (ratio: number, ks?: number[]) => {
    const b = withLandCut(b0, hasSpouse ? ratio : 0);
    const first = inheritanceTax(b.total, hasSpouse, nKids, ratio, kidAges, ks);
    const { second, secondEstate } = secondFor(b, first, ratio, nKids, hasSpouse);
    return { b, first, second, secondEstate, total: first.payable + (second?.payable ?? 0) };
  };
  const scan = hasSpouse && nKids > 0
    ? Array.from({ length: 21 }, (_, i) => i * 0.05).map((ratio) => {
        const c = calc(ratio);
        return { ratio, first: c.first.payable, second: c.second?.payable ?? 0, total: c.total };
      })
    : [];
  const bestRatio = scan.length ? scan.reduce((m, x) => (x.total < m.total ? x : m), scan[0]).ratio : 0;
  const ratio = !hasSpouse
    ? 0
    : nKids === 0
      ? 1
      : s.spouseMode === "legal"
        ? 0.5
        : s.spouseMode === "all"
          ? 1
          : s.spouseMode === "none"
            ? 0
            : s.spouseMode === "cap16"
              ? Math.min(1, (16000 * MAN) / Math.max(1, b0.total))
              : s.spouseMode === "best"
                ? bestRatio
                : s.spouseMode === "custom" && kidShares
                  ? customRatio
                  : 0.5;
  const c = calc(ratio, kidShares);
  const out: InheritancePlan = {
    breakdown: c.b,
    spouseRatio: ratio,
    kidShares,
    heirKids: nKids,
    heirKidIdx,
    first: c.first,
    second: c.second,
    secondEstate: c.secondEstate,
    total: c.total,
    scan,
    bestRatio,
  };
  return scaleMoney(out, deflate);
}
