import { ageOn, parseYMD, yearToStartAge } from "./age";
import { resolveDrawOrder } from "./drawOrder";
import { EDU, amortizeYear, pmt } from "./finance";
import { schedulePart, scheduleLoans } from "./homeLoan";
import { createInsuranceState, insuranceDeduction, insuranceYear, normalizeInsurance } from "./insurance";
import { KAKYUU_NENKIN_ANNUAL, calcPension, isKakyuuApplicable, zaishokuTeishiAnnual } from "./pension";
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

type RealEstateSim = RealEstate & { payY: number; startA: number };

const MAN = 10000;

// 退職所得（退職金・DC一時金）の受取記録。退職所得控除の重複調整に使う
interface LumpRecord {
  age: number;
  hasDc: boolean;
  from: number;
  to: number;
}

// いくつかの勤続期間を重ねたときの長さ（重なりは1回、間の空白は数えない）
function unionYears(parts: { from: number; to: number }[]): number {
  const sorted = [...parts].filter((p) => p.to > p.from).sort((a, b) => a.from - b.from);
  let total = 0;
  let curFrom = -Infinity;
  let curTo = -Infinity;
  for (const p of sorted) {
    if (p.from > curTo) {
      if (curTo > curFrom) total += curTo - curFrom;
      curFrom = p.from;
      curTo = p.to;
    } else curTo = Math.max(curTo, p.to);
  }
  if (curTo > curFrom) total += curTo - curFrom;
  return total;
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
  // 旧NISA（2023年まで）の分。NISA残高の内数として同じ利回りで運用し、取り崩すときは旧NISAから先に使う。
  // 旧NISAを売っても新NISAの簿価（生涯枠）は変わらない
  let nisaOld = Math.min(Math.max(0, input.nisaBal), Math.max(0, input.nisaSplit?.oldBal ?? 0));
  // 暗号資産の2028年以降の分離課税（20.315%）は予定。オフなら総合課税の税率のまま計算する
  const cryptoRateIn = (y: number) =>
    y >= 2028 && input.cryptoSeparate2028 !== false ? CAPITAL_GAIN_TAX : (input.cryptoTaxRate ?? 30) / 100;

  const baseYear = (parseYMD(input.baseDate) ?? new Date()).getFullYear();

  // 住宅ローン: ミックスローン・金利タイプ・返済方法・繰上返済を含めた年ごとの予定を先に作る（homeLoan.ts）
  const loans = scheduleLoans(input);
  let hlBal = loans.startBal;
  let hlCleared = false; // 団体信用生命保険で残債が0になった

  const rSims: RealEstateSim[] = input.res.map((r) => ({
    ...r,
    bal: r.bal,
    payY: r.bal > 0 ? pmt(r.rate / 100 / 12, r.term * 12, r.bal) * 12 : 0,
    startA: yearToStartAge(r.start, input),
  }));
  // 不動産投資のローンも住宅ローンと同じ仕組みで返済予定を作る（金利タイプ・返済方法・繰上返済）
  const reSchedules = rSims.map((r) =>
    r.bal > 0
      ? schedulePart(
          {
            label: r.name,
            bal: r.bal,
            years: r.term,
            rate: r.rate,
            rateType: r.loanRateType ?? "variable",
            fixedUntilAge: r.loanFixedUntilAge,
            rateAfter: r.loanRateAfter,
            method: r.loanMethod ?? "annuity",
            rule5y: r.loanRule5y,
          },
          Math.max(r.startA, input.curAge),
          r.loanPrepays ?? [],
          0,
        )
      : null,
  );

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
        "2028年4月以降の死亡では、子のない60歳未満の配偶者の遺族厚生年金は原則5年の有期給付に変わり、中高齢寡婦加算も段階的に縮みます（女性は20年かけて移行。60歳未満の夫は逆に5年の給付が出るようになります）。ここでは現行制度で計算しているため、遺族厚生年金が実際より多く（夫の場合は少なく）出ることがあります。例: 2030年に35歳で子のない妻の場合、現行の計算では一生で約1,480万円、見直し後は約320万円（推計）。",
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
  // iDeCo（本人掛金）は老齢基礎年金を受け始めると出せない（繰上げ受給を含む）。会社掛金は続けられる
  const dcSelfEnd = Math.min(dcContribEnd, input.penStartA);
  // DC一時金の退職所得控除に使う掛金の拠出期間
  const dcPeriodEnd = input.dcEmployerM > 0 ? dcContribEnd : dcSelfEnd;
  if (input.saveDcM > 0 && dcSelfEnd < dcContribEnd) {
    warn("dc-pension", `老齢基礎年金を受け始める${input.penStartA}歳からはiDeCoの掛金を出せないため、${input.penStartA}歳で本人掛金を止めて計算しています。`);
  }
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

  // 保険（旧データの種類名もここで読み替える）
  const insList = (input.ins ?? []).map((p) => normalizeInsurance(p as never, input.curAge, input.endAge));
  const insState = createInsuranceState(insList, input.curAge);
  const insDeath = deathOn ? { who: selfDies ? ("本人" as const) : ("配偶者" as const), age: deathAge } : null;

  // 働き終わる年齢（「働き終わったあとの生活費」の切り替え年齢を入れていないときに使う）
  const lastWorkEnd = input.jobs.length ? Math.max(...input.jobs.map((j) => j.end)) : input.penStartA;

  // 入れていない計算・概算の注意（結果の画面の「制度チェック」に出す）
  if (input.selfPension.category === "kokumin" || lastWorkEnd < 75) {
    warn(
      "kokuho-approx",
      "国民健康保険料は全国平均的な料率の概算です。自治体によって年に数万〜数十万円違います（例: 大阪市の令和8年度の料率では、事業所得665万円・40歳単身で約24%（約24万円）多い）。",
      "info",
    );
  }
  if (input.selfPension.category !== "kokumin" && input.jobs.some((j) => j.inc > 0) && lastWorkEnd < 75) {
    warn(
      "retire-kokuho",
      `${lastWorkEnd}歳で働き終えた翌年の国民健康保険料は、前年の給与で決まるため高くなります（例: 年収600万円なら翌年に約70万円）。この計算には入れていません（任意継続を選ぶ場合も別です）。`,
      "info",
    );
  }

  // 子どもを年上から並べる（児童手当の「第何子」判定用）
  const kidsByAge = [...input.kids].sort((a, b) => a.offset - b.offset);

  // 本人が亡くなる試算では、年下の配偶者が最終年齢になるまで計算を続ける（遺族の晩年まで見る）
  const loopEnd =
    selfDies && spouseCurAge !== null && spouseCurAge < input.curAge ? input.endAge + (input.curAge - spouseCurAge) : input.endAge;
  for (let age = input.curAge; age <= loopEnd; age++) {
    const t = age - input.curAge;
    const year = baseYear + t;
    const infl = Math.pow(1 + input.infl / 100, t);
    const penIdx = Math.pow(1 + (input.penIndex ?? 0) / 100, t);
    const spouseAge = hasSpouse ? (spouseCurAge as number) + t : null;
    const dead = age >= deathAge;
    const selfGone = selfDies && dead;
    const spouseGone = spouseDies && dead;
    let deathLump = 0;
    const insY = insuranceYear(
      insList,
      insState,
      age,
      infl,
      input.kids.map((k) => k.offset),
      insDeath,
    );
    deathLump += insY.deathLump;
    if (deathOn && age === deathAge) {
      deathLump += (risk.deathInsurance || 0) + (opts.extraInsurance ?? 0);
      // 団体信用生命保険: 本人が亡くなると住宅ローンの残債は0
      if (selfDies && risk.danshin) {
        hlBal = 0;
        hlCleared = true;
      }
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
        //   退職金を受け取る年の死亡は、まだ受け取っていないものとして全額を死亡退職金に
        if (age === deathAge && j.sev > 0 && age === j.sevAge) {
          deathLump += j.sev;
        } else if (age === deathAge && age >= j.start && age < j.end && j.sev > 0) {
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
        // 入力の年収は、今の勤務先なら今年の年収、これからの勤務先なら入社時の年収
        job += j.inc * Math.pow(1 + (j.raise || 0) / 100, age - Math.max(input.curAge, j.start));
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
    let selfPenY = !selfGone && age >= input.penStartA ? selfPenMonthly * 12 * penIdx : 0;
    let spousePenY =
      !spouseGone && input.useSpousePen && spouseAge !== null && spouseAge >= input.penStartB
        ? spousePenMonthly * 12 * penIdx
        : 0;
    // 在職老齢年金: 会社員として働く年は老齢厚生年金の一部（または全部）が止まる。繰下げの増額分は対象外
    const zaishokuCut = (penY: number, br: typeof selfPenBreak, wageY: number, employee: boolean) => {
      if (!employee || penY <= 0 || wageY <= 0) return { cut: 0, full: false };
      const kosei = (br.koseiMonthly * 12 * penIdx) / Math.max(1, br.adjustment);
      // 支給停止調整額は毎年度、名目賃金に合わせて改定される（ここでは物価の伸びで近似）
      const cut = zaishokuTeishiAnnual(kosei, wageY, year, infl);
      return { cut, full: kosei > 0 && cut >= kosei };
    };
    const selfZ = zaishokuCut(selfPenY, selfPenBreak, job, selfWorkStyle === "employee");
    const spouseZ = zaishokuCut(spousePenY, spousePenBreak, spouseJob, spouseWorkStyle === "employee");
    selfPenY -= selfZ.cut;
    spousePenY -= spouseZ.cut;
    if (selfZ.cut > 0 || spouseZ.cut > 0) {
      warn("zaishoku", "働きながら老齢厚生年金を受ける年は、在職老齢年金のしくみで年金の一部が止まる計算にしています（給与と老齢厚生年金の月額の合計が65万円（2026年度。毎年度改定）を超えた分の半分）。", "info");
    }
    let kakyuu = 0;
    if (
      !dead &&
      input.useSpousePen &&
      !selfZ.full &&
      isKakyuuApplicable(input.selfPension, age, input.penStartA, spouseAge, input.spousePension, input.penStartB)
    ) {
      // 老齢厚生年金が在職で全額止まる年は加給年金も止まる
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
      // 遺族厚生年金と比べる自分の老齢厚生年金は、繰上げ・繰下げで増減する前の本来の額
      const ownKosei = selfGone
        ? spousePenY > 0 ? (spousePenBreak.koseiMonthly * 12 * penIdx) / (spousePenBreak.adjustment || 1) : 0
        : selfPenY > 0 ? (selfPenBreak.koseiMonthly * 12 * penIdx) / (selfPenBreak.adjustment || 1) : 0;
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
      incomeProt += insY.incomeProt;
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
      dcSelf = age < dcSelfEnd ? selfM * 12 : 0;
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
      if (dcLump > 0) parts.push({ from: input.dcJoinAge, to: dcPeriodEnd });
      const from = Math.min(...parts.map((p) => p.from));
      const to = Math.max(...parts.map((p) => p.to));
      // 勤続年数: 同じ年に受け取る分の期間を重ねた長さ（勤め先の間の空白は数えない）
      const years = Math.max(1, unionYears(parts));
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
      // 勤続5年以下は短期退職手当等（控除後300万を超える部分は1/2にならない）
      const totalTax = calcTaishokuTaxWithKojo(amount, kojo, year, years <= 5);
      sevTax = amount > 0 ? (totalTax * sevGross) / amount : 0;
      dcTax = totalTax - sevTax;
      // 受け取った額が控除額に満たないときは、次の重複調整では勤続期間を金額から読み替える（所得税法施行令70条2項）
      //   800万以下: 金額÷40万、800万超: (金額−800万)÷70万＋20（1年未満切り捨て）年だけ、勤め始めから数える
      const convYears = amount < kojo ? (amount <= 800 * MAN ? Math.floor(amount / (40 * MAN)) : Math.floor((amount - 800 * MAN) / (70 * MAN)) + 20) : Infinity;
      lumps.push({ age, hasDc: dcLump > 0, from, to: Math.min(to, from + convYears) });
    }

    // ── 不動産投資（家賃・ローン）──
    let reInc = 0;
    let reRentTot = 0;
    let reCostTot = 0;
    let rePayTot = 0;
    let reProfitTot = 0;
    const reD: RealEstateRowDetail[] = [];
    const reFlows: { rent: number; cost: number; pay: number; bal: number }[] = [];
    for (const [ri, r] of rSims.entries()) {
      // 家賃・経費・固定資産税・ローンは運用開始年齢から
      const active = age >= r.startA;
      const rent = active ? r.rent * 12 * infl : 0;
      const costY = active ? r.cost * infl : 0;
      const propTax = active ? (r.propTax || 0) * infl : 0;
      let intr = 0;
      let pay = 0;
      if (r.bal > 0 && active) {
        // 返済予定（金利タイプ・返済方法・繰上返済込み）から、その年の返済・利息・年末残高を取る
        const y = reSchedules[ri]?.years.get(age);
        intr = y?.interest ?? 0;
        pay = y ? y.pay + y.prepay : 0;
        r.bal = y ? y.bal : 0;
      }
      reProfitTot += rent - costY - propTax - intr;
      reRentTot += rent;
      reCostTot += costY + propTax;
      rePayTot += pay;
      reFlows.push({ rent, cost: costY + propTax, pay, bal: active ? r.bal : 0 });
    }

    // ── 住宅ローン（返済は後で計上。控除は年末残高で）──
    let homePay = 0;
    let hlPrepay = 0;
    if (!hlCleared && age >= loans.start) {
      // 毎月の返済（月ごとに残高×年利÷12の利息）と、その年の繰上返済
      const y = loans.byAge.get(age);
      homePay = y ? y.pay + y.prepay : 0;
      hlPrepay = y ? y.prepay : 0;
      hlBal = y ? y.bal : 0;
    }
    const hlCredit =
      input.hlDeduct && input.useHomeLoan && age >= input.hlStart && age < input.hlDeductEndAge && !selfGone
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
    // 生命保険料控除・地震保険料控除（保険料を払う人＝契約者ごと）
    const insDedSelf = insuranceDeduction(insY.dedPrem["本人"], year, kidsDependent);
    const insDedSpouse = insuranceDeduction(insY.dedPrem["配偶者"], year, kidsDependent);
    const addDed = (a: { income: number; jumin: number } | undefined, b: { income: number; jumin: number }) => ({
      income: (a?.income ?? 0) + b.income,
      jumin: (a?.jumin ?? 0) + b.jumin,
    });
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
            otherShotokuY: reProfitTot + insY.taxable["本人"] + insY.taxable["配偶者"],
            dcSelfContribY: 0,
            dependentOfSpouse: false,
          },
          spouse: null,
          kidAges: kidAgesNow,
          hlDeductCredit: 0,
          extraDeduction: addDed(widowDeduction(kidsDependent, survivorSex, year), addDed(insDedSelf, insDedSpouse)),
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
        otherShotokuY: side + reProfitTot + insY.taxable["本人"] + (spouseGone ? insY.taxable["配偶者"] : 0),
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
              otherShotokuY: insY.taxable["配偶者"],
              dcSelfContribY: 0,
              // 健康保険の扶養: 会社員（75歳未満）の配偶者で、年収130万未満（60歳以上は年金を含めて180万未満）。
              // 国民年金の第3号は60歳で終わるが、健康保険の扶養は75歳まで続く
              dependentOfSpouse:
                input.spousePension.category === "dependent" &&
                selfEmployedNow &&
                age < 75 &&
                spouseAge < 75 &&
                spouseJob + spousePenY < (spouseAge >= 60 ? 180 : 130) * MAN,
            }
          : null;
      const tr = calcHouseholdTax({
        year,
        self,
        spouse,
        kidAges: kidAgesNow,
        hlDeductCredit: hlCredit,
        extraDeduction: spouseGone
          ? addDed(widowDeduction(kidsDependent, survivorSex, year), addDed(insDedSelf, insDedSpouse))
          : insDedSelf,
        spouseExtraDeduction: insDedSpouse,
      });
      tax = tr.total;
      socialIns = tr.shahoSelf + tr.shahoSpouse;
      hlDeduct = tr.hlDeduct;
      marginal = tr.marginalSelf;
    } else {
      const rate = input.taxRate / 100;
      const penRate = (input.taxRatePen ?? 10) / 100;
      const raw =
        (job + side + spouseJob + Math.max(0, reProfitTot) - dcSelf + insY.taxable["本人"] + insY.taxable["配偶者"] -
          insDedSelf.income - insDedSpouse.income) * rate +
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
      ordinaryGross + childAllow - tax + (sevGross - sevTax) + (dcLump - dcTax) + surv.total + incomeProt + insY.payout - insY.separateTax;

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
    // 働き終わったあとの生活費を別に入れていれば、その年齢から切り替える
    const livingNow =
      (input.livingRetireM ?? 0) > 0 && age >= (input.livingRetireAge ?? lastWorkEnd) ? (input.livingRetireM ?? 0) : input.livingM;
    const basicL = livingNow * 12 * infl * livingFactor;
    const special = input.specialY * infl * livingFactor;
    const basic = basicL + special;
    // 家を買う予定の人は、買う年齢までは家賃、買ってからは固定資産税
    const buyAge = input.homeBuyAge ?? 0;
    const bought = buyAge > 0 && age >= buyAge;
    const homeRent = bought ? 0 : input.rentM * 12 * infl;
    const homeTax = buyAge > 0 && !bought ? 0 : input.homeTaxY * infl;
    const home = homeRent + homeTax + homePay;
    // 保険料（亡くなった人が被保険者の保険は払い終わる。払込免除も insuranceYear の中で判定）
    const ins = insY.prem;

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
    const nisaGrowth = 1 + g(input.nisaR, shock?.sec);
    ass.nisa = (ass.nisa + nisaIn) * nisaGrowth;
    nisaOld *= nisaGrowth;
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
            ? cryptoRateIn(year)
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
        ass[key as DrawAsset] -= gross;
        if (key === "nisa") {
          // 旧NISAから先に使い、残りを新NISAから。新NISAの簿価は新NISA部分の売却割合だけ減らす
          const fromOld = Math.min(gross, nisaOld);
          const newBal = bal - nisaOld;
          const fromNew = gross - fromOld;
          nisaOld -= fromOld;
          const newRatio = newBal > 0 ? fromNew / newBal : 0;
          cost.nisa -= cost.nisa * newRatio;
          nisaGrowthCost -= nisaGrowthCost * newRatio;
        } else {
          cost[key] -= cost[key] * (gross / bal);
        }
        const got = gross - taxPaid;
        ass.c += got;
        need -= got;
        draw += got;
        saleTax += taxPaid;
      }
    }

    // 運用開始前の物件のローンはまだ借りていない
    const reLoanRemain = rSims.reduce((a, r) => a + (age >= r.startA ? r.bal : 0), 0);
    const otherLoanRemain = input.otherLoans.reduce((acc, ln) => {
      const remaining = Math.max(0, ln.remainMonths - t * 12);
      return acc + ln.monthlyPay * remaining;
    }, 0);
    // 住宅ローンは借り始めてから（これから借りる予定の分は、まだ借金ではない）
    const hlOutstanding = age >= input.hlStart ? hlBal : 0;
    const nw =
      ass.c + ass.nisa + ass.toku + ass.k + ass.g + ass.dc - hlOutstanding - reLoanRemain - otherLoanRemain;

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
      hlPrepay,
      ins,
      basic,
      basicL,
      special,
      hlBal: hlOutstanding,
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
        Math.max(0, ass.k - cost.k) * cryptoRateIn(year),
      dead,
      survKiso: surv.kiso,
      survKosei: surv.kosei,
      survChukorei: surv.chukorei,
      deathLump,
      incomeProt,
      insPayout: insY.payout,
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
    // 加入月数 = 厚生年金の加入年数（年金の欄。前の勤め先も含めた一生の見込み）から、亡くなったあとに働く予定だった月数を引く。
    // 以前は入力した最初の勤務先の入社から数えていたので、それより前の勤め先の期間が抜けていた
    const futureMonths = input.jobs.reduce((a, j) => a + Math.max(0, j.end - Math.max(deathAge, j.start)) * 12, 0);
    const months = p.koseiYears > 0 ? Math.max(0, p.koseiYears * 12 - futureMonths) : elapsed;
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
// 「今の保険に上乗せして」必要な死亡保険金を二分探索で求める。
// 亡くならなくても足りなくなるプランは null（保険で埋める額として意味がない）、20億円を超えても足りなければ Infinity
export function requiredCoverage(input: PlanInput): number | null {
  if (simulate(input).shortfallAge !== null) return null;
  const ok = (x: number) => simulate(input, { death: true, extraInsurance: x }).shortfallAge === null;
  if (ok(0)) return 0;
  let lo = 0;
  let hi = 50_000_000;
  while (!ok(hi)) {
    hi *= 2;
    if (hi > 2_000_000_000) return Infinity;
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
