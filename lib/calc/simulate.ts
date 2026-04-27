import { ageOn, yearToStartAge } from "./age";
import { resolveDrawOrder } from "./drawOrder";
import { EDU, calcInsuranceY, pmt } from "./finance";
import { KAKYUU_NENKIN_ANNUAL, calcPension, isKakyuuApplicable } from "./pension";
import { calcDetailedTaxV2 } from "./tax";
import type {
  AssetSnapshot,
  EduSplitDetail,
  EduTotalDetail,
  PlanInput,
  RealEstate,
  RealEstateRowDetail,
  SimulationSummary,
  YearlyResult,
} from "./types";

type RealEstateSim = RealEstate & { payY: number };

export function simulate(input: PlanInput): SimulationSummary {
  const rows: YearlyResult[] = [];
  const ass: AssetSnapshot = {
    c: input.cashBal,
    f: input.fundBal,
    s: input.stockBal,
    k: input.cryptoBal,
    g: input.goldBal,
    dc: input.dcBal,
  };

  let hlBal = input.useHomeLoan ? input.hlBal : 0;
  const hlPayY =
    input.useHomeLoan && input.hlBal > 0
      ? pmt(input.hlRate / 100 / 12, input.hlTerm * 12, input.hlBal) * 12
      : 0;

  const rSims: RealEstateSim[] = input.res.map((r) => ({
    ...r,
    bal: r.bal,
    payY:
      r.bal > 0 ? pmt(r.rate / 100 / 12, r.term * 12, r.bal) * 12 : 0,
  }));

  const spouseCurAge = ageOn(input.spouseBirth, input.baseDate);

  // 年金月額(老齢基礎+老齢厚生)を事前計算。インフレ補正なしの実額。
  const selfPenBreakdown = calcPension(input.selfPension, input.penStartA);
  const spousePenBreakdown = calcPension(input.spousePension, input.penStartB);
  const selfPenMonthly = selfPenBreakdown.monthly;
  const spousePenMonthly = spousePenBreakdown.monthly;

  for (let age = input.curAge; age <= input.endAge; age++) {
    const infl = Math.pow(1 + input.infl / 100, age - input.curAge);

    let job = 0;
    for (const j of input.jobs) {
      if (age >= j.start && age < j.end) job += j.inc;
      if (age === j.sevAge) job += j.sev;
    }
    let side = 0;
    for (const j of input.sideJobs) {
      if (age >= j.start && age < j.end) side += j.inc;
    }
    let spouseJob = 0;
    if (input.spouseWork === "work" && spouseCurAge !== null) {
      const sAge = spouseCurAge + (age - input.curAge);
      if (sAge >= input.spouseIncStart && sAge < input.spouseIncEnd) {
        spouseJob += input.spouseIncY;
      }
    }

    let pen = 0;
    if (age >= input.penStartA) pen += selfPenMonthly * 12;
    if (input.useSpousePen && age >= input.penStartB) pen += spousePenMonthly * 12;
    // 加給年金: 本人65歳到達時、厚生年金20年以上、配偶者65歳未満で加算
    const spouseAgeNow =
      spouseCurAge !== null ? spouseCurAge + (age - input.curAge) : null;
    if (
      input.useSpousePen &&
      isKakyuuApplicable(input.selfPension, age, input.penStartA, spouseAgeNow)
    ) {
      pen += KAKYUU_NENKIN_ANNUAL;
    }

    const gross = job + side + spouseJob + pen;
    const selfPenY = age >= input.penStartA ? selfPenMonthly * 12 : 0;
    const spousePenY = input.useSpousePen && age >= input.penStartB ? spousePenMonthly * 12 : 0;

    let tax = 0;
    let socialIns = 0;
    if (input.taxMode === "detailed") {
      // 子どもの当年齢
      const kidAgesNow: number[] = input.kids.map((k) => age - k.offset).filter((a) => a >= 0);
      const taxResult = calcDetailedTaxV2(
        {
          selfWageY: job + side,
          spouseWageY: spouseJob,
          selfPenY,
          spousePenY,
          selfAge: age,
          spouseAge: spouseCurAge !== null ? spouseCurAge + (age - input.curAge) : age,
          hasSpouse: spouseCurAge !== null && input.spouseWork !== undefined,
          numKidsForFuyo: 0,
          selfWorking: job + side > 0,
          spouseWorking: input.spouseWork === "work" && spouseJob > 0,
        },
        kidAgesNow,
      );
      tax = taxResult.total;
      socialIns =
        taxResult.shahoSelf + taxResult.shahoSpouse +
        taxResult.kokuhoSelf + taxResult.kokuhoSpouse +
        taxResult.kaigoSelf + taxResult.kaigoSpouse;
    } else {
      tax = gross * (input.taxRate / 100);
    }
    const net = gross - tax;

    // 相続（一時収入・当年到達時のみ加算、インフレ補正なし）
    let inherit = 0;
    for (const ev of input.inheritances) {
      if (ev.age === age) inherit += ev.amount;
    }

    // ライフイベント一時支出（リフォーム・車買替など）
    let lifeExp = 0;
    for (const ev of input.lifeExpenses) {
      if (ev.age === age) lifeExp += ev.amount;
    }

    // その他ローン返済（自動車・奨学金など）
    let otherLoanPay = 0;
    for (const ln of input.otherLoans) {
      const monthsAlreadyPaid = (age - input.curAge) * 12;
      if (monthsAlreadyPaid < ln.remainMonths) {
        const monthsThisYear = Math.min(12, ln.remainMonths - monthsAlreadyPaid);
        otherLoanPay += ln.monthlyPay * monthsThisYear;
      }
    }

    // 介護費用（指定年齢から指定年数間、月額×12にインフレ適用）
    let care = 0;
    for (const ev of input.careEvents) {
      if (age >= ev.startAge && age < ev.startAge + ev.durationYears) {
        care += ev.monthlyCost * 12 * infl;
      }
    }

    let reInc = 0;
    let reRentTot = 0;
    let reCostTot = 0;
    let rePayTot = 0;
    let reTaxTot = 0;
    const reD: RealEstateRowDetail[] = [];

    for (const r of rSims) {
      const rent = r.rent * 12 * infl;
      const cost = r.cost * infl;
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
      const profit = Math.max(0, rent - cost - intr);
      const taxR = profit * (input.taxRate / 100);
      reRentTot += rent;
      reCostTot += cost;
      rePayTot += pay;
      reTaxTot += taxR;
      const flow = rent - cost - pay - taxR;
      reInc += flow;
      reD.push({ bal: r.bal, flow, rent });
    }

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
        if (k.opt.ronin && ca === 18) {
          jukuMan = (input.jukuM.ronin * 12) / 10000;
        } else if (ca >= uS && ca < uS + 4) {
          tuitionMan = EDU.u[k.s.u];
          if (k.opt.dormU) tuitionMan += (k.opt.send * 12) / 10000;
        } else if (k.opt.grad && ca >= uS + 4 && ca < uS + 6) {
          tuitionMan = EDU.g.pub;
          if (k.opt.dormG) tuitionMan += (k.opt.send * 12) / 10000;
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

    const basicL = input.livingM * 12 * infl;
    const special = input.specialY * infl;
    const basic = basicL + special;
    const homeRent = input.rentM * 12 * infl;
    const homeTax = input.homeTaxY * infl;
    let home = homeRent + homeTax;
    let homePay = 0;

    if (input.useHomeLoan && hlBal > 0 && age >= input.hlStart) {
      const i = hlBal * (input.hlRate / 100);
      let p = hlPayY;
      if (hlBal < p) p = hlBal + i;
      homePay = p;
      home += p;
      hlBal = Math.max(0, hlBal - (p - i));
    }

    const ins = calcInsuranceY(input.ins, age, infl);

    const tF = age < input.saveFundEndAge ? input.saveFundM * 12 : 0;
    const tS = age < input.saveStockEndAge ? input.saveStockM * 12 : 0;
    const tK = age < input.saveCryptoEndAge ? input.saveCryptoM * 12 : 0;
    const tG = age < input.saveGoldEndAge ? input.saveGoldM * 12 : 0;
    const tD = age < input.saveDcEndAge ? input.saveDcM * 12 : 0;

    const cf = net + reInc + inherit - (basic + home + edu + ins + care + lifeExp + otherLoanPay) - (tF + tS + tK + tG + tD);

    ass.c += cf;
    if (ass.c > 0) ass.c *= 1 + input.cashRate;
    ass.f = (ass.f + tF) * (1 + input.fundR / 100);
    ass.s = (ass.s + tS) * (1 + input.stockR / 100);
    ass.k = (ass.k + tK) * (1 + input.cryptoR / 100);
    ass.g = (ass.g + tG) * (1 + input.goldR / 100);
    ass.dc = (ass.dc + tD) * (1 + input.dcR / 100);

    let draw = 0;
    if (!input.allowNegCash && ass.c < input.cashFloor) {
      let def = input.cashFloor - ass.c;
      const ord = resolveDrawOrder(input.drawOrder, input.drawCustomOrder, age);
      for (const t of ord) {
        if (t === "dc" && age < 60) continue;
        if (def > 0 && ass[t] > 0) {
          const s = Math.min(def, ass[t]);
          ass[t] -= s;
          ass.c += s;
          def -= s;
          draw += s;
        }
      }
    }

    const reLoanRemain = rSims.reduce((a, r) => a + r.bal, 0);
    const otherLoanRemain = input.otherLoans.reduce((acc, ln) => {
      const remaining = Math.max(0, ln.remainMonths - (age - input.curAge) * 12);
      return acc + ln.monthlyPay * remaining;
    }, 0);
    const nw = ass.c + ass.f + ass.s + ass.k + ass.g + ass.dc - hlBal - reLoanRemain - otherLoanRemain;

    rows.push({
      age,
      nw,
      cf,
      draw,
      ass: { ...ass },
      reInc,
      net,
      income: net + reInc + inherit,
      exp: basic + home + edu + ins + care + lifeExp + otherLoanPay,
      inv: tF + tS + tK + tD,
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
      jobNet: (job + side + spouseJob) * (1 - input.taxRate / 100),
      penNet: pen * (1 - input.taxRate / 100),
      inherit,
      lifeExp,
      otherLoanPay,
      care,
      socialIns,
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
  };
}
