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
import { survivorBenefitForYear, type DeceasedRecord } from "./survivor";
import {
  CAPITAL_GAIN_TAX,
  calcHouseholdTax,
  calcTaishokuTaxWithKojo,
  taishokuShotokuKojo,
  widowDeduction,
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

export interface SimulateOptions {
  // もしもの備え: input.risk の条件で「亡くなった場合」を計算する
  death?: boolean;
  // 必要保障額の逆算用: 死亡時に上乗せする保険金
  extraInsurance?: number;
  // モンテカルロ用: 年ごとの実現利回り（小数。t=0 が今年）。指定がなければ入力の固定利回り
  returns?: { sec: number[]; gold: number[]; crypto: number[] };
}

export function simulate(input: PlanInput, opts: SimulateOptions = {}): SimulationSummary {
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
    // 旧NISA（2023年まで）の分は新NISAの生涯枠に数えない
    nisa: input.nisaCost > 0 ? input.nisaCost : Math.max(0, input.nisaBal - (input.nisaSplit?.oldBal ?? 0)),
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
  const selfPenBreak = calcPension(input.selfPension, input.penStartA);
  const spousePenBreak = calcPension(input.spousePension, input.penStartB);
  const selfPenMonthly = selfPenBreak.monthly;
  const spousePenMonthly = spousePenBreak.monthly;

  // ── もしもの備え（死亡シナリオ）──
  const risk = input.risk;
  const deathOn = !!opts.death && !!risk && (risk.who === "self" || hasSpouse);
  const deathAge = deathOn
    ? Math.min(input.endAge, Math.max(input.curAge, Math.round(risk.deathAge)))
    : Infinity;
  const selfDies = deathOn && risk.who === "self";
  const spouseDies = deathOn && risk.who === "spouse";
  const deceased: DeceasedRecord | null = deathOn ? deceasedRecord(input, deathAge, spouseCurAge) : null;
  // 遺族となる配偶者の性別（本人が亡くなる→配偶者、配偶者が亡くなる→本人）
  const survivorSex = selfDies ? risk.spouseSex : risk?.spouseSex === "female" ? "male" : "female";
  if (deathOn && spouseCurAge !== null) {
    const spouseAtDeath = spouseCurAge + (deathAge - input.curAge);
    const survivorAtDeath = selfDies ? spouseAtDeath : deathAge;
    const kidsAtDeath = input.kids.filter((k) => {
      const a = deathAge - k.offset;
      return a >= 0 && a <= 17;
    }).length;
    if (baseYear + (deathAge - input.curAge) >= 2028 && survivorAtDeath < 60 && kidsAtDeath === 0) {
      warn(
        "survivor-2028",
        "2028年4月以降の死亡では、子のない60歳未満の配偶者の遺族厚生年金は原則5年の有期給付に変わります（女性は20年かけて段階的に移行）。ここでは現行制度で計算しています。",
        "info",
      );
    }
  }

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
    const dead = age >= deathAge;
    const selfGone = selfDies && dead;
    const spouseGone = spouseDies && dead;
    let deathLump = 0;
    if (deathOn && age === deathAge) {
      deathLump += (risk.deathInsurance || 0) + (opts.extraInsurance ?? 0);
      // 団体信用生命保険: 本人が亡くなると住宅ローンの残債は0
      if (selfDies && risk.danshin) hlBal = 0;
      // 本人のDC残高は死亡一時金として遺族へ
      if (selfDies && ass.dc > 0) {
        deathLump += ass.dc;
        ass.dc = 0;
      }
    }

    // ── 給与・副業 ──
    let job = 0;
    let sevGross = 0;
    let sevAnnuity = 0;
    const sevJobs: { from: number; to: number; amount: number }[] = [];
    for (const j of input.jobs) {
      if (selfGone) {
        // 在職中の死亡: 退職金を勤続年数で按分して死亡退職金として受け取る（相続税の非課税枠内とみなす）
        if (age === deathAge && age >= j.start && age < j.end && j.sev > 0) {
          deathLump += j.sev * Math.min(1, (age - j.start) / Math.max(1, j.end - j.start));
        }
        // 退職金を年金で受け取っている途中なら、残りを遺族が一時金で受け取る（保証期間つきを想定）
        if (age === deathAge && j.sev > 0) {
          const plan = sevPlanOf(j);
          const k = age - j.sevAge;
          if (plan.annual > 0 && k >= 1 && k < plan.years) deathLump += presentValue(plan.annual, plan.rate, plan.years - k);
        }
        continue;
      }
      if (age >= j.start && age < j.end) {
        job += j.inc * Math.pow(1 + (j.raise || 0) / 100, age - j.start);
      }
      if (j.sev > 0) {
        const plan = sevPlanOf(j);
        if (age === j.sevAge && plan.lump > 0) {
          sevGross += plan.lump;
          sevJobs.push({ from: j.start, to: j.end, amount: plan.lump });
        }
        if (plan.annual > 0 && age >= j.sevAge && age < j.sevAge + plan.years) sevAnnuity += plan.annual;
      }
    }
    let side = 0;
    for (const j of input.sideJobs) {
      if (!selfGone && age >= j.start && age < j.end) side += j.inc;
    }
    let spouseJob = 0;
    if (input.spouseWork === "work" && spouseAge !== null && !spouseGone) {
      if (spouseAge >= input.spouseIncStart && spouseAge < input.spouseIncEnd) {
        spouseJob += input.spouseIncY;
      }
    }

    // ── 公的年金 ──
    const selfPenY = !selfGone && age >= input.penStartA ? selfPenMonthly * 12 * penIdx : 0;
    const spousePenY =
      !spouseGone && input.useSpousePen && spouseAge !== null && spouseAge >= input.penStartB
        ? spousePenMonthly * 12 * penIdx
        : 0;
    let kakyuu = 0;
    if (
      !dead &&
      input.useSpousePen &&
      isKakyuuApplicable(input.selfPension, age, input.penStartA, spouseAge)
    ) {
      kakyuu = KAKYUU_NENKIN_ANNUAL * penIdx;
    }
    const pen = selfPenY + spousePenY + kakyuu;

    // ── 遺族年金（非課税）・収入保障保険 ──
    let surv = { kiso: 0, kosei: 0, chukorei: 0, total: 0 };
    let incomeProt = 0;
    if (dead && deceased) {
      const kidAgesAt = (a: number) =>
        input.kids.map((k) => a - k.offset).filter((x) => x >= 0);
      const survivorAge = selfGone ? spouseAge : age;
      const survivorAgeAtDeath = selfGone
        ? spouseCurAge !== null ? spouseCurAge + (deathAge - input.curAge) : 0
        : deathAge;
      const ownKosei = selfGone
        ? spousePenY > 0 ? spousePenBreak.koseiMonthly * 12 * penIdx : 0
        : selfPenY > 0 ? selfPenBreak.koseiMonthly * 12 * penIdx : 0;
      surv = survivorBenefitForYear(
        deceased,
        {
          hasSpouse: survivorAge !== null,
          spouseSex: survivorSex,
          spouseAge: survivorAge ?? 0,
          spouseAgeAtDeath: survivorAgeAtDeath,
          spouseOwnKoseiAnnual: ownKosei,
          childAges: kidAgesAt(age),
          childAgesAtDeath: kidAgesAt(deathAge),
        },
        penIdx,
      );
      if (age < risk.incomeProtEndAge) incomeProt = (risk.incomeProtM || 0) * 12;
    }

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
    if (age < dcContribEnd && !selfGone) {
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
      input.hlDeduct && input.useHomeLoan && age < input.hlDeductEndAge && !selfGone
        ? 0.007 * Math.min(hlBal, input.hlDeductLimit)
        : 0;

    // ── 税・社会保険 ──
    const kidAgesNow = input.kids.map((k) => age - k.offset).filter((a) => a >= 0);
    let tax = 0;
    let socialIns = 0;
    let hlDeduct = 0;
    let marginal = input.taxRate / 100;
    const ordinaryGross = job + side + spouseJob + pen + dcAnnuity + sevAnnuity;
    const kidsDependent = kidAgesNow.some((a) => a <= 22);
    if (input.taxMode === "detailed" && selfGone) {
      // 本人が亡くなった後: 遺族（配偶者）だけで税・社会保険を計算
      if (spouseAge !== null) {
        const tr = calcHouseholdTax({
          year,
          self: {
            age: spouseAge,
            wageY: spouseJob,
            workStyle: spouseWorkStyle,
            penY: spousePenY,
            otherShotokuY: reProfitTot,
            dcSelfContribY: 0,
            dependentOfSpouse: false,
          },
          spouse: null,
          kidAges: kidAgesNow,
          hlDeductCredit: 0,
          extraDeduction: widowDeduction(kidsDependent, survivorSex),
        });
        tax = tr.total;
        socialIns = tr.shahoSelf;
        marginal = tr.marginalSelf;
      }
    } else if (input.taxMode === "detailed") {
      const selfEmployedNow = selfWorkStyle === "employee" && job > 0;
      const self: PersonIncome = {
        age,
        wageY: job,
        workStyle: selfWorkStyle,
        penY: selfPenY + kakyuu + dcAnnuity + sevAnnuity,
        otherShotokuY: side + reProfitTot,
        dcSelfContribY: dcSelf,
        dependentOfSpouse: false,
      };
      const spouse: PersonIncome | null =
        spouseAge !== null && !spouseGone
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
      const tr = calcHouseholdTax({
        year,
        self,
        spouse,
        kidAges: kidAgesNow,
        hlDeductCredit: hlCredit,
        extraDeduction: spouseGone ? widowDeduction(kidsDependent, survivorSex) : undefined,
      });
      tax = tr.total;
      socialIns = tr.shahoSelf + tr.shahoSpouse;
      hlDeduct = tr.hlDeduct;
      marginal = tr.marginalSelf;
    } else {
      const rate = input.taxRate / 100;
      const penRate = (input.taxRatePen ?? 10) / 100;
      const raw =
        (job + side + spouseJob + Math.max(0, reProfitTot) - dcSelf) * rate +
        (pen + dcAnnuity + sevAnnuity) * penRate;
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
      ordinaryGross + childAllow - tax + (sevGross - sevTax) + (dcLump - dcTax) + surv.total + incomeProt;

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
    const livingFactor = dead ? Math.max(0, risk.livingRate) / 100 : 1;
    const basicL = input.livingM * 12 * infl * livingFactor;
    const special = input.specialY * infl * livingFactor;
    const basic = basicL + special;
    const homeRent = input.rentM * 12 * infl;
    const homeTax = input.homeTaxY * infl;
    const home = homeRent + homeTax + homePay;
    // 亡くなった人が被保険者の保険料は払い終わる
    const deadInsured = selfGone ? "本人" : spouseGone ? "配偶者" : null;
    const ins = calcInsuranceY(
      deadInsured ? input.ins.filter((p) => p.insured !== deadInsured) : input.ins,
      age,
      infl,
    );

    // ── 積立（NISAは年間枠・生涯枠を自動チェック）──
    // 死亡後は遺族の生活を優先し、新しい積立は止めて計算する
    const investing = !dead;
    let nisaT = investing && age < input.nisaEndAge ? input.nisaTsumitateM * 12 : 0;
    let nisaG = investing && age < input.nisaEndAge ? input.nisaGrowthM * 12 : 0;
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
    const tToku = (investing && age < input.saveTokuEndAge ? input.saveTokuM * 12 : 0) + tokuFromOverflow;
    const tK = investing && age < input.saveCryptoEndAge ? input.saveCryptoM * 12 : 0;
    const tG = investing && age < input.saveGoldEndAge ? input.saveGoldM * 12 : 0;
    const inv = nisaIn + tToku + tK + tG + dcSelf;

    const exp = basic + home + edu + ins + care + lifeExp + otherLoanPay;
    const cf = net + reInc + inherit + deathLump - exp - inv;

    // ── 現金（利息は20.315%源泉徴収後）──
    ass.c += cf;
    if (ass.c > 0) ass.c *= 1 + input.cashRate * (1 - CAPITAL_GAIN_TAX);

    // ── 運用（積立は年初に入れて1年分運用）──
    // 利回り: 通常は入力どおり固定。モンテカルロ時は「入力利回り＋その年の振れ」
    const shock = opts.returns;
    const g = (base: number, path?: number[]) =>
      path ? (1 + base / 100) * (1 + path[t]) - 1 : base / 100;
    ass.nisa = (ass.nisa + nisaIn) * (1 + g(input.nisaR, shock?.sec));
    cost.nisa += nisaIn;
    nisaGrowthCost += nisaG;
    ass.toku = (ass.toku + tToku) * (1 + g(input.tokuR, shock?.sec));
    cost.toku += tToku;
    ass.k = (ass.k + tK) * (1 + g(input.cryptoR, shock?.crypto));
    cost.k += tK;
    ass.g = (ass.g + tG) * (1 + g(input.goldR, shock?.gold));
    cost.g += tG;
    ass.dc = (ass.dc + dcSelf + dcEmp) * (1 + g(input.dcR, shock?.sec));

    // ── 取り崩し（売却益に課税。必要な手取りから逆算して売る）──
    let draw = 0;
    let saleTax = 0;
    if (!input.allowNegCash && ass.c < input.cashFloor) {
      let need = input.cashFloor - ass.c;
      const taxRateOf = (key: DrawAsset) =>
        key === "nisa"
          ? 0
          : key === "k"
            ? year >= 2028
              ? CAPITAL_GAIN_TAX // 2028年〜 申告分離課税20.315%（金商法改正の施行が前提）
              : (input.cryptoTaxRate ?? 30) / 100
            : CAPITAL_GAIN_TAX;
      const gainOf = (key: DrawAsset) => (ass[key] > 0 ? Math.max(0, 1 - cost[key] / ass[key]) : 0);
      // おすすめ: 課税される口座の中から「1円売るのにかかる税金」が少ないものを毎年選んで先に売り、NISAは最後
      const ord =
        input.drawOrder === "custom"
          ? resolveDrawOrder(input.drawOrder, input.drawCustomOrder)
          : ([
              ...(["toku", "g", "k"] as DrawAsset[]).sort((a, b) => gainOf(a) * taxRateOf(a) - gainOf(b) * taxRateOf(b)),
              "nisa",
            ] as DrawAsset[]);
      for (const key of ord) {
        if (need <= 0) break;
        const bal = ass[key as DrawAsset];
        if (bal <= 0) continue;
        const gainRatio = gainOf(key);
        const rate = taxRateOf(key);
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
      income: net + reInc + inherit + deathLump,
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
      sevAnnuity,
      latentTax:
        Math.max(0, ass.toku - cost.toku) * CAPITAL_GAIN_TAX +
        Math.max(0, ass.g - cost.g) * CAPITAL_GAIN_TAX +
        Math.max(0, ass.k - cost.k) * (year >= 2028 ? CAPITAL_GAIN_TAX : (input.cryptoTaxRate ?? 30) / 100),
      dead,
      survKiso: surv.kiso,
      survKosei: surv.kosei,
      survChukorei: surv.chukorei,
      deathLump,
      incomeProt,
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

// 亡くなった人の厚生年金の加入記録（死亡時点）
function deceasedRecord(
  input: PlanInput,
  deathAge: number,
  spouseCurAge: number | null,
): DeceasedRecord {
  if (input.risk.who === "self") {
    const p = input.selfPension;
    const starts = input.jobs.map((j) => j.start);
    const ends = input.jobs.map((j) => j.end);
    const first = starts.length ? Math.min(...starts) : deathAge;
    const last = ends.length ? Math.max(...ends) : deathAge;
    const elapsed = Math.max(0, (Math.min(deathAge, last) - first) * 12);
    const months = p.koseiYears > 0 ? Math.min(elapsed, p.koseiYears * 12) : elapsed;
    const curJob = input.jobs.find((j) => deathAge >= j.start && deathAge < j.end);
    return {
      isKosei: p.category === "kosei",
      koseiMonths: months,
      avgAnnualIncome: p.koseiAvgIncome > 0 ? p.koseiAvgIncome : (curJob?.inc ?? input.jobs[0]?.inc ?? 0),
      inService: !!curJob,
    };
  }
  const p = input.spousePension;
  const sAge = (spouseCurAge ?? 0) + (deathAge - input.curAge);
  const elapsed = Math.max(0, (Math.min(sAge, input.spouseIncEnd) - input.spouseIncStart) * 12);
  const months = p.koseiYears > 0 ? Math.min(elapsed, p.koseiYears * 12) : elapsed;
  return {
    isKosei: p.category === "kosei",
    koseiMonths: months,
    avgAnnualIncome: p.koseiAvgIncome > 0 ? p.koseiAvgIncome : input.spouseIncY,
    inService:
      input.spouseWork === "work" && sAge >= input.spouseIncStart && sAge < input.spouseIncEnd,
  };
}

// 必要保障額: 亡くなった場合に、遺族が最後まで資金ショートしないために
// 「今の保険に上乗せして」必要な死亡保険金を二分探索で求める
export function requiredCoverage(input: PlanInput): number {
  const ok = (x: number) => simulate(input, { death: true, extraInsurance: x }).shortfallAge === null;
  if (ok(0)) return 0;
  let lo = 0;
  let hi = 50_000_000;
  while (!ok(hi)) {
    hi *= 2;
    if (hi > 2_000_000_000) return hi;
  }
  for (let i = 0; i < 24 && hi - lo > 50_000; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi / 100_000) * 100_000;
}

// 退職金の受け取り方の内訳。年金部分は「元本を給付利率で運用しながら年数で取り崩す」年額
export function sevPlanOf(j: {
  sev: number;
  sevMethod?: "lump" | "annuity" | "mix";
  sevYears?: number;
  sevRate?: number;
  sevLumpPct?: number;
}) {
  const method = j.sevMethod ?? "lump";
  const share = method === "lump" ? 1 : method === "annuity" ? 0 : Math.min(100, Math.max(0, j.sevLumpPct ?? 50)) / 100;
  const lump = j.sev * share;
  const principal = j.sev - lump;
  const years = Math.max(1, Math.round(j.sevYears ?? 10));
  const rate = Math.max(0, (j.sevRate ?? 1.5) / 100);
  const annual = principal > 0 ? (rate > 0 ? (principal * rate) / (1 - Math.pow(1 + rate, -years)) : principal / years) : 0;
  return { lump, annual, years, rate, total: lump + annual * years };
}

function presentValue(annual: number, rate: number, n: number) {
  return rate > 0 ? (annual * (1 - Math.pow(1 + rate, -n))) / rate : annual * n;
}
