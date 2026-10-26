import { ageOn, parseYMD, yearToStartAge } from "./age";
import { resolveDrawOrder } from "./drawOrder";
import { EDU, calcInsuranceY, pmt } from "./finance";
import { KAKYUU_NENKIN_ANNUAL, calcPension, isKakyuuApplicable } from "./pension";
import {
  DC_MAX_CONTRIB_AGE,
  DC_PAYOUT_MAX_AGE,
  DC_PAYOUT_MIN_AGE,
  NISA,
  childAllowanceMonthly,
  dcSelfLimit,
} from "./rules";
import {
  CAPITAL_GAIN_TAX,
  calcHouseholdTax,
  calcTaishokuTaxWithKojo,
  taishokuShotokuKojo,
  type PersonIncome,
} from "./tax";
import type {
  AssetSnapshot,
  DrawAsset,
  EduSplitDetail,
  EduTotalDetail,
  PlanInput,
  RealEstate,
  RealEstateRowDetail,
  SchoolType,
  SimulationSummary,
  SimulationWarning,
  YearlyResult,
} from "./types";

type RealEstateSim = RealEstate & { payY: number };

const MAN = 10000;

// 退職所得（退職金・DC一時金）の受取記録。退職所得控除の重複調整に使う
interface LumpRecord {
  age: number;
  hasDc: boolean;
  from: number;
  to: number;
}

function overlapYears(a: [number, number], b: [number, number]): number {
  return Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
}

// 重複期間に対応する控除額（最低保障80万を含まない素の額）
function kojoForYears(y: number): number {
  if (y <= 0) return 0;
  return y <= 20 ? 40 * MAN * y : 800 * MAN + 70 * MAN * (y - 20);
}

export function simulate(input: PlanInput): SimulationSummary {
  const rows: YearlyResult[] = [];
  const warnings: SimulationWarning[] = [];
  const warned = new Set<string>();
  const warn = (key: string, text: string, level: "info" | "warn" = "warn") => {
    if (warned.has(key)) return;
    warned.add(key);
    warnings.push({ level, text });
  };

  const ass: AssetSnapshot = {
    c: input.cashBal,
    nisa: input.nisaBal,
    toku: input.tokuBal,
    k: input.cryptoBal,
    g: input.goldBal,
    dc: input.dcBal,
  };
  // 取得額（簿価）。0 なら残高と同額（含み益なし）とみなす
  const cost = {
    nisa: input.nisaCost > 0 ? input.nisaCost : input.nisaBal,
    toku: input.tokuCost > 0 ? input.tokuCost : input.tokuBal,
    k: input.cryptoCost > 0 ? input.cryptoCost : input.cryptoBal,
    g: input.goldCost > 0 ? input.goldCost : input.goldBal,
  };
  let nisaGrowthCost = 0; // 成長投資枠の簿価（今後の買付分のみ追跡）

  const baseYear = (parseYMD(input.baseDate) ?? new Date()).getFullYear();

  let hlBal = input.useHomeLoan ? input.hlBal : 0;
  const hlPayY =
    input.useHomeLoan && input.hlBal > 0
      ? pmt(input.hlRate / 100 / 12, input.hlTerm * 12, input.hlBal) * 12
      : 0;

  const rSims: RealEstateSim[] = input.res.map((r) => ({
    ...r,
    bal: r.bal,
    payY: r.bal > 0 ? pmt(r.rate / 100 / 12, r.term * 12, r.bal) * 12 : 0,
  }));

  const spouseCurAge = ageOn(input.spouseBirth, input.baseDate);
  const hasSpouse = spouseCurAge !== null;

  // 年金月額（今の水準）。毎年 penIndex で改定する
  const selfPenMonthly = calcPension(input.selfPension, input.penStartA).monthly;
  const spousePenMonthly = calcPension(input.spousePension, input.penStartB).monthly;

  const selfWorkStyle = input.selfPension.category === "kokumin" ? "self-employed" : "employee";
  const spouseWorkStyle = input.spousePension.category === "kokumin" ? "self-employed" : "employee";

  // DC受取
  const dcStartAge = Math.min(DC_PAYOUT_MAX_AGE, Math.max(DC_PAYOUT_MIN_AGE, input.dcStartAge));
  const dcYears = Math.min(20, Math.max(5, input.dcYears || 5));
  const dcContribEnd = Math.min(input.saveDcEndAge, dcStartAge, DC_MAX_CONTRIB_AGE);
  if (input.saveDcEndAge > DC_MAX_CONTRIB_AGE && (input.saveDcM > 0 || input.dcEmployerM > 0)) {
    warn("dc-age", "iDeCoの掛金は70歳未満まで（2026年12月〜）。70歳以降の掛金は計算に入れていません。");
  }
  if (input.saveDcEndAge > dcStartAge && (input.saveDcM > 0 || input.dcEmployerM > 0)) {
    warn("dc-start", `DCの受取開始（${dcStartAge}歳）以降は掛金を出せないため、${dcStartAge}歳で掛金を止めて計算しています。`);
  }
  if (input.dcStartAge !== dcStartAge) {
    warn("dc-range", "DCの受取開始は60〜75歳の範囲です。範囲内に丸めて計算しています。");
  }

  const lumps: LumpRecord[] = [];

  // 子どもを年上から並べる（児童手当の「第何子」判定用）
  const kidsByAge = [...input.kids].sort((a, b) => a.offset - b.offset);

  for (let age = input.curAge; age <= input.endAge; age++) {
    const t = age - input.curAge;
    const year = baseYear + t;
    const infl = Math.pow(1 + input.infl / 100, t);
    const penIdx = Math.pow(1 + (input.penIndex ?? 0) / 100, t);
    const spouseAge = hasSpouse ? (spouseCurAge as number) + t : null;

    // ── 給与・副業 ──
    let job = 0;
    let sevGross = 0;
    const sevJobs: { from: number; to: number; amount: number }[] = [];
    for (const j of input.jobs) {
      if (age >= j.start && age < j.end) {
        job += j.inc * Math.pow(1 + (j.raise || 0) / 100, age - j.start);
      }
      if (age === j.sevAge && j.sev > 0) {
        sevGross += j.sev;
        sevJobs.push({ from: j.start, to: j.end, amount: j.sev });
      }
    }
    let side = 0;
    for (const j of input.sideJobs) {
      if (age >= j.start && age < j.end) side += j.inc;
    }
    let spouseJob = 0;
    if (input.spouseWork === "work" && spouseAge !== null) {
      if (spouseAge >= input.spouseIncStart && spouseAge < input.spouseIncEnd) {
        spouseJob += input.spouseIncY;
      }
    }

    // ── 公的年金 ──
    const selfPenY = age >= input.penStartA ? selfPenMonthly * 12 * penIdx : 0;
    const spousePenY =
      input.useSpousePen && spouseAge !== null && spouseAge >= input.penStartB
        ? spousePenMonthly * 12 * penIdx
        : 0;
    let kakyuu = 0;
    if (input.useSpousePen && isKakyuuApplicable(input.selfPension, age, input.penStartA, spouseAge)) {
      kakyuu = KAKYUU_NENKIN_ANNUAL * penIdx;
    }
    const pen = selfPenY + spousePenY + kakyuu;

    // ── 児童手当 ──
    let childAllow = 0;
    if (input.childAllowance) {
      let rank = 0;
      for (const k of kidsByAge) {
        const ka = age - k.offset;
        if (ka < 0 || ka > 22) continue;
        rank += 1;
        childAllow += childAllowanceMonthly(ka, rank) * 12;
      }
    }

    // ── iDeCo・企業型DC: 掛金 ──
    let dcSelf = 0;
    let dcEmp = 0;
    if (age < dcContribEnd) {
      const lim = dcSelfLimit(input.dcType, input.dcEmployerM, year);
      const selfM = Math.min(input.saveDcM, lim.selfMax);
      if (input.saveDcM > lim.selfMax) {
        warn(
          `dc-limit-${year >= 2027 ? "new" : "old"}`,
          `DCの本人掛金 月${input.saveDcM.toLocaleString()}円は上限（${lim.note}）を超えるため、${year}年分以降は月${lim.selfMax.toLocaleString()}円で計算しています。`,
        );
      }
      dcSelf = selfM * 12;
      dcEmp = input.dcEmployerM * 12;
    }

    // ── DC受取 ──
    let dcPayout = 0;
    let dcLump = 0;
    let dcAnnuity = 0;
    if (ass.dc > 0) {
      if (input.dcMethod === "lump" && age === dcStartAge) {
        dcLump = ass.dc;
        ass.dc = 0;
      } else if (input.dcMethod === "annuity" && age >= dcStartAge && age < dcStartAge + dcYears) {
        const remain = dcStartAge + dcYears - age;
        dcAnnuity = ass.dc / remain;
        ass.dc -= dcAnnuity;
      }
      dcPayout = dcLump + dcAnnuity;
    }

    // ── 退職所得（退職金・DC一時金）: 同年は合算、前後は重複調整 ──
    let sevTax = 0;
    let dcTax = 0;
    if (sevGross > 0 || dcLump > 0) {
      const parts: { from: number; to: number }[] = sevJobs.map((s) => ({ from: s.from, to: s.to }));
      if (dcLump > 0) parts.push({ from: input.dcJoinAge, to: dcContribEnd });
      const from = Math.min(...parts.map((p) => p.from));
      const to = Math.max(...parts.map((p) => p.to));
      const years = Math.max(1, to - from);
      let overlap = 0;
      for (const p of lumps) {
        // 今回がDC一時金を含む → 前年以前19年内の退職金等と重複調整
        // 今回が退職金のみ → 前年以前9年内のDC一時金（2026年〜）／4年内の退職金と重複調整
        const window = dcLump > 0 ? 19 : p.hasDc ? 9 : 4;
        if (age - p.age <= window) {
          overlap = Math.max(overlap, overlapYears([p.from, p.to], [from, to]));
        }
      }
      let kojo = taishokuShotokuKojo(years);
      if (overlap > 0) {
        kojo = Math.max(80 * MAN, kojo - kojoForYears(overlap));
        warn(
          `lump-overlap-${age}`,
          `${age}歳の${dcLump > 0 ? "DC一時金" : "退職金"}は、前回の受取と期間が重なるため退職所得控除が減ります（DC一時金→退職金は10年、退職金→DC一時金は20年空けると調整なし）。`,
        );
      }
      const amount = sevGross + dcLump;
      const totalTax = calcTaishokuTaxWithKojo(amount, kojo, year);
      sevTax = amount > 0 ? (totalTax * sevGross) / amount : 0;
      dcTax = totalTax - sevTax;
      lumps.push({ age, hasDc: dcLump > 0, from, to });
    }

    // ── 不動産投資（家賃・ローン）──
    let reInc = 0;
    let reRentTot = 0;
    let reCostTot = 0;
    let rePayTot = 0;
    let reProfitTot = 0;
    const reD: RealEstateRowDetail[] = [];
    const reFlows: { rent: number; cost: number; pay: number; bal: number }[] = [];
    for (const r of rSims) {
      const rent = r.rent * 12 * infl;
      const costY = r.cost * infl;
      const propTax = (r.propTax || 0) * infl;
      const rStartA = yearToStartAge(r.start, input);
      let intr = 0;
      let pay = 0;
      if (r.bal > 0 && age >= rStartA) {
        intr = r.bal * (r.rate / 100);
        let p = r.payY;
        if (r.bal < p) p = r.bal + intr;
        pay = p;
        r.bal = Math.max(0, r.bal - (p - intr));
      }
      reProfitTot += rent - costY - propTax - intr;
      reRentTot += rent;
      reCostTot += costY + propTax;
      rePayTot += pay;
      reFlows.push({ rent, cost: costY + propTax, pay, bal: r.bal });
    }

    // ── 住宅ローン（返済は後で計上。控除は年末残高で）──
    let homePay = 0;
    if (input.useHomeLoan && hlBal > 0 && age >= input.hlStart) {
      const i = hlBal * (input.hlRate / 100);
      let p = hlPayY;
      if (hlBal < p) p = hlBal + i;
      homePay = p;
      hlBal = Math.max(0, hlBal - (p - i));
    }
    const hlCredit =
      input.hlDeduct && input.useHomeLoan && age < input.hlDeductEndAge
        ? 0.007 * Math.min(hlBal, input.hlDeductLimit)
        : 0;

    // ── 税・社会保険 ──
    const kidAgesNow = input.kids.map((k) => age - k.offset).filter((a) => a >= 0);
    let tax = 0;
    let socialIns = 0;
    let hlDeduct = 0;
    let marginal = input.taxRate / 100;
    const ordinaryGross = job + side + spouseJob + pen + dcAnnuity;
    if (input.taxMode === "detailed") {
      const selfEmployedNow = selfWorkStyle === "employee" && job > 0;
      const self: PersonIncome = {
        age,
        wageY: job,
        workStyle: selfWorkStyle,
        penY: selfPenY + kakyuu + dcAnnuity,
        otherShotokuY: side + reProfitTot,
        dcSelfContribY: dcSelf,
        dependentOfSpouse: false,
      };
      const spouse: PersonIncome | null =
        spouseAge !== null
          ? {
              age: spouseAge,
              wageY: spouseJob,
              workStyle: spouseWorkStyle,
              penY: spousePenY,
              otherShotokuY: 0,
              dcSelfContribY: 0,
              dependentOfSpouse:
                input.spousePension.category === "dependent" &&
                spouseJob < 130 * MAN &&
                selfEmployedNow &&
                spouseAge < 60,
            }
          : null;
      const tr = calcHouseholdTax({ year, self, spouse, kidAges: kidAgesNow, hlDeductCredit: hlCredit });
      tax = tr.total;
      socialIns = tr.shahoSelf + tr.shahoSpouse;
      hlDeduct = tr.hlDeduct;
      marginal = tr.marginalSelf;
    } else {
      const rate = input.taxRate / 100;
      const penRate = (input.taxRatePen ?? 10) / 100;
      const raw =
        (job + side + spouseJob + Math.max(0, reProfitTot) - dcSelf) * rate +
        (pen + dcAnnuity) * penRate;
      hlDeduct = Math.min(Math.max(0, raw), hlCredit);
      tax = Math.max(0, raw - hlDeduct);
    }
    // 不動産のキャッシュフロー（税は本体の税計算に含めた。簡易表示用に按分）
    for (let i = 0; i < reFlows.length; i++) {
      const f = reFlows[i];
      const flow = f.rent - f.cost - f.pay;
      reInc += flow;
      reD.push({ bal: f.bal, flow, rent: f.rent });
    }
    const reTaxTot = Math.max(0, reProfitTot) * marginal;

    const net =
      ordinaryGross + childAllow - tax + (sevGross - sevTax) + (dcLump - dcTax);

    // ── 一時収支・その他ローン・介護 ──
    let inherit = 0;
    for (const ev of input.inheritances) if (ev.age === age) inherit += ev.amount;
    let lifeExp = 0;
    for (const ev of input.lifeExpenses) if (ev.age === age) lifeExp += ev.amount;
    let otherLoanPay = 0;
    for (const ln of input.otherLoans) {
      const paid = t * 12;
      if (paid < ln.remainMonths) otherLoanPay += ln.monthlyPay * Math.min(12, ln.remainMonths - paid);
    }
    let care = 0;
    for (const ev of input.careEvents) {
      if (age >= ev.startAge && age < ev.startAge + ev.durationYears) care += ev.monthlyCost * 12 * infl;
    }

    // ── 教育費 ──
    let edu = 0;
    let eduT = 0;
    let eduJ = 0;
    const eduD: EduTotalDetail[] = [];
    const eduKD: EduSplitDetail[] = [];
    for (const k of input.kids) {
      const ca = age - k.offset;
      let tuitionMan = 0;
      let jukuMan = 0;
      if (ca >= 3 && ca <= 5) {
        tuitionMan = EDU.k[k.s.k];
        jukuMan = (input.jukuM.pre * 12) / 10000;
      } else if (ca >= 6 && ca <= 11) {
        tuitionMan = EDU.e[k.s.e];
        jukuMan = ((ca <= 8 ? input.jukuM.e13 : input.jukuM.e46) * 12) / 10000;
      } else if (ca >= 12 && ca <= 14) {
        tuitionMan = EDU.j[k.s.j];
        jukuMan = (input.jukuM.jh * 12) / 10000;
      } else if (ca >= 15 && ca <= 17) {
        tuitionMan = EDU.h[k.s.h];
        jukuMan = (input.jukuM.hs * 12) / 10000;
      } else {
        const uS = k.opt.ronin ? 19 : 18;
        const isDorm = k.opt.dorm ?? (k.opt.dormU || k.opt.dormG) ?? false;
        const gradStage: SchoolType = k.s.g ?? (k.opt.grad ? "pub" : "none");
        if (k.opt.ronin && ca === 18) {
          jukuMan = (input.jukuM.ronin * 12) / 10000;
        } else if (ca >= uS && ca < uS + 4 && k.s.u !== "none") {
          tuitionMan = EDU.u[k.s.u];
          if (isDorm) tuitionMan += (k.opt.send * 12) / 10000;
        } else if (gradStage !== "none" && ca >= uS + 4 && ca < uS + 6) {
          tuitionMan = EDU.g[gradStage];
          if (isDorm) tuitionMan += (k.opt.send * 12) / 10000;
        }
      }
      const vT = tuitionMan > 0 ? tuitionMan * 10000 * infl : 0;
      const vJ = jukuMan > 0 ? jukuMan * 10000 * infl : 0;
      const v = vT + vJ;
      if (v > 0) {
        edu += v;
        eduT += vT;
        eduJ += vJ;
        eduD.push({ name: k.name, val: v });
        eduKD.push({ name: k.name, tuition: vT, juku: vJ });
      }
    }

    // ── 生活費・住居・保険 ──
    const basicL = input.livingM * 12 * infl;
    const special = input.specialY * infl;
    const basic = basicL + special;
    const homeRent = input.rentM * 12 * infl;
    const homeTax = input.homeTaxY * infl;
    const home = homeRent + homeTax + homePay;
    const ins = calcInsuranceY(input.ins, age, infl);

    // ── 積立（NISAは年間枠・生涯枠を自動チェック）──
    let nisaT = age < input.nisaEndAge ? input.nisaTsumitateM * 12 : 0;
    let nisaG = age < input.nisaEndAge ? input.nisaGrowthM * 12 : 0;
    const nisaRequested = nisaT + nisaG;
    nisaT = Math.min(nisaT, NISA.tsumitateYear);
    nisaG = Math.min(nisaG, NISA.growthYear);
    // 生涯枠は「前年末の簿価」で判定（売却分は翌年に復活）
    const room = Math.max(0, NISA.lifetime - cost.nisa);
    nisaT = Math.min(nisaT, room);
    nisaG = Math.min(nisaG, room - nisaT, Math.max(0, NISA.growthLifetime - nisaGrowthCost));
    const nisaIn = nisaT + nisaG;
    const nisaOverflow = nisaRequested - nisaIn;
    if (nisaOverflow > 0) {
      if (input.nisaTsumitateM > 100_000 || input.nisaGrowthM > 200_000) {
        warn("nisa-year", "NISAの年間枠（つみたて月10万・成長月20万）を超える分は" + (input.nisaOverflowToToku ? "特定口座で積み立てる計算にしています。" : "積み立てずに現金に残す計算にしています。"));
      } else {
        warn("nisa-life", `${age}歳でNISAの生涯枠（簿価1,800万・うち成長枠1,200万）に達します。以降の積立は` + (input.nisaOverflowToToku ? "特定口座に回して計算しています。" : "現金に残して計算しています。"), "info");
      }
    }
    const tokuFromOverflow = input.nisaOverflowToToku ? nisaOverflow : 0;
    const tToku = (age < input.saveTokuEndAge ? input.saveTokuM * 12 : 0) + tokuFromOverflow;
    const tK = age < input.saveCryptoEndAge ? input.saveCryptoM * 12 : 0;
    const tG = age < input.saveGoldEndAge ? input.saveGoldM * 12 : 0;
    const inv = nisaIn + tToku + tK + tG + dcSelf;

    const exp = basic + home + edu + ins + care + lifeExp + otherLoanPay;
    const cf = net + reInc + inherit - exp - inv;

    // ── 現金（利息は20.315%源泉徴収後）──
    ass.c += cf;
    if (ass.c > 0) ass.c *= 1 + input.cashRate * (1 - CAPITAL_GAIN_TAX);

    // ── 運用（積立は年初に入れて1年分運用）──
    ass.nisa = (ass.nisa + nisaIn) * (1 + input.nisaR / 100);
    cost.nisa += nisaIn;
    nisaGrowthCost += nisaG;
    ass.toku = (ass.toku + tToku) * (1 + input.tokuR / 100);
    cost.toku += tToku;
    ass.k = (ass.k + tK) * (1 + input.cryptoR / 100);
    cost.k += tK;
    ass.g = (ass.g + tG) * (1 + input.goldR / 100);
    cost.g += tG;
    ass.dc = (ass.dc + dcSelf + dcEmp) * (1 + input.dcR / 100);

    // ── 取り崩し（売却益に課税。必要な手取りから逆算して売る）──
    let draw = 0;
    let saleTax = 0;
    if (!input.allowNegCash && ass.c < input.cashFloor) {
      let need = input.cashFloor - ass.c;
      const ord = resolveDrawOrder(input.drawOrder, input.drawCustomOrder);
      for (const key of ord) {
        if (need <= 0) break;
        const bal = ass[key as DrawAsset];
        if (bal <= 0) continue;
        const gainRatio = Math.max(0, 1 - cost[key] / bal);
        const rate =
          key === "nisa"
            ? 0
            : key === "k"
              ? year >= 2028
                ? CAPITAL_GAIN_TAX // 2028年〜 申告分離課税20.315%（金商法改正の施行が前提）
                : (input.cryptoTaxRate ?? 30) / 100
              : CAPITAL_GAIN_TAX;
        const netPerYen = 1 - gainRatio * rate;
        const gross = Math.min(bal, need / netPerYen);
        const taxPaid = gross * gainRatio * rate;
        const ratio = gross / bal;
        ass[key as DrawAsset] -= gross;
        cost[key] -= cost[key] * ratio;
        if (key === "nisa") nisaGrowthCost -= nisaGrowthCost * ratio;
        const got = gross - taxPaid;
        ass.c += got;
        need -= got;
        draw += got;
        saleTax += taxPaid;
      }
    }

    const reLoanRemain = rSims.reduce((a, r) => a + r.bal, 0);
    const otherLoanRemain = input.otherLoans.reduce((acc, ln) => {
      const remaining = Math.max(0, ln.remainMonths - t * 12);
      return acc + ln.monthlyPay * remaining;
    }, 0);
    const nw =
      ass.c + ass.nisa + ass.toku + ass.k + ass.g + ass.dc - hlBal - reLoanRemain - otherLoanRemain;

    const taxShare = ordinaryGross > 0 ? Math.min(1, tax / ordinaryGross) : 0;

    rows.push({
      age,
      nw,
      cf,
      draw,
      ass: { ...ass },
      reInc,
      net,
      income: net + reInc + inherit,
      exp,
      inv,
      edu,
      eduT,
      eduJ,
      home,
      homeRent,
      homeTax,
      homePay,
      ins,
      basic,
      basicL,
      special,
      hlBal,
      reD,
      eduD,
      eduKD,
      taxWage: tax,
      reRentTot,
      reCostTot,
      rePayTot,
      reTaxTot,
      jobNet: (job + side + spouseJob) * (1 - taxShare),
      penNet: (pen + dcAnnuity) * (1 - taxShare),
      inherit,
      lifeExp,
      otherLoanPay,
      care,
      socialIns,
      childAllow,
      sevGross,
      sevTax,
      dcPayout,
      dcTax,
      dcContribSelf: dcSelf,
      hlDeduct,
      saleTax,
      nisaCost: cost.nisa,
      nisaOverflow,
    });
  }

  const finalNetWorth = rows.length ? rows[rows.length - 1].nw : 0;
  const minCash = rows.length ? Math.min(...rows.map((r) => r.ass.c)) : 0;
  const maxEdu = rows.length ? Math.max(...rows.map((r) => r.edu)) : 0;
  const totalHome = rows.reduce((a, r) => a + r.home, 0);
  const shortfall = rows.find((r) => r.ass.c < 0);

  return {
    rows,
    finalNetWorth,
    minCash,
    maxEdu,
    totalHome,
    shortfallAge: shortfall ? shortfall.age : null,
    warnings,
  };
}
