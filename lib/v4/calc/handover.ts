// 「お金の引き継ぎ書」の財産・負債の一覧。金額はシミュレーターの入力（作成日時点）から自動で入る
import { computeRealEstateValue } from "./finance";
import { HAS, deathBenefitAt, deathCoverActive, normalizeInsurance, premiumAt, typeLabel } from "./insurance";
import type { DcType, HandoverItem, Insurance, PlanInput, RealEstate, YearlyResult } from "./types";

const MAN = 10000;
const manS = (yen: number) => `${Math.round(yen / MAN).toLocaleString()}万円`;

const PROP_LABEL = { house: "戸建て", mansion: "マンション", land: "土地" } as const;
const STRUCT_LABEL = { wood: "木造", lightSteel: "軽量鉄骨", heavySteel: "重量鉄骨", rc: "RC", src: "SRC" } as const;
const DC_LABEL: Record<DcType, string> = {
  "employee-none": "iDeCo",
  "employee-dc": "企業型DC",
  "employee-db": "iDeCo",
  "self-employed": "iDeCo",
  dependent: "iDeCo",
};

// いま勤めている勤務先（本人の現在の年齢が在職期間に入っているもの）
export function currentJobs(plan: PlanInput) {
  return plan.jobs.filter((j) => j.start <= plan.curAge && plan.curAge < j.end && j.inc > 0);
}

const splitDetail = (sp: PlanInput["nisaSplit"] | undefined) => {
  if (!sp?.on) return "";
  const parts = [
    sp.fundBal > 0 ? `投資信託 ${manS(sp.fundBal)}` : "",
    sp.stockBal > 0 ? `株 ${manS(sp.stockBal)}` : "",
    (sp.oldBal ?? 0) > 0 ? `旧NISA ${manS(sp.oldBal ?? 0)}` : "",
  ].filter(Boolean);
  return parts.length > 1 ? parts.join("・") : "";
};

const propDetail = (r: Pick<RealEstate, "propType" | "structure" | "builtYear">) =>
  [PROP_LABEL[r.propType] ?? "", r.propType === "land" ? "" : STRUCT_LABEL[r.structure] ?? "", r.propType === "land" || !r.builtYear ? "" : `${r.builtYear}年築`]
    .filter(Boolean)
    .join("・");

export interface InventoryRow {
  key: string;            // 保管場所（where）を結びつけるキー
  kind: "asset" | "debt";
  label: string;
  amount: number;
  placeholder: string;    // 保管場所の入力例
  detail?: string;        // 入力済みの内容から作る補足（内訳・ローンの条件など）
  prefill?: string;       // 保管場所の欄に、入力済みの内容から入れておく文
}

function homeValueNow(plan: PlanInput, year: number): number {
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

export function buildInventory(plan: PlanInput): InventoryRow[] {
  const year = new Date().getFullYear();
  const rows: InventoryRow[] = [
    { key: "cash", kind: "asset", label: "現金・預金", amount: plan.cashBal, placeholder: "例：○○銀行 △△支店（普通・定期）、ゆうちょ銀行" },
    { key: "nisa", kind: "asset", label: "NISA口座", amount: plan.nisaBal, placeholder: "例：○○証券のNISA口座", detail: splitDetail(plan.nisaSplit) },
    { key: "toku", kind: "asset", label: "特定口座（証券）", amount: plan.tokuBal, placeholder: "例：○○証券・△△証券の特定口座", detail: splitDetail(plan.tokuSplit) },
    {
      key: "dc",
      kind: "asset",
      label: DC_LABEL[plan.dcType] ?? "iDeCo・企業型DC",
      amount: plan.dcBal,
      placeholder: "例：iDeCo（○○証券）、会社の企業型DC",
      detail: plan.saveDcM > 0 || plan.dcEmployerM > 0 ? `掛金 月${((plan.saveDcM + plan.dcEmployerM) / MAN).toFixed(1)}万円` : "",
      prefill: plan.dcType === "employee-dc" && currentJobs(plan)[0]?.name ? `勤務先（${currentJobs(plan)[0].name}）の企業型DC` : "",
    },
    { key: "crypto", kind: "asset", label: "暗号資産", amount: plan.cryptoBal, placeholder: "例：○○取引所（アプリ名）" },
    { key: "gold", kind: "asset", label: "金・コモディティ", amount: plan.goldBal, placeholder: "例：○○証券の金ETF、自宅の金庫" },
    {
      key: "home",
      kind: "asset",
      label: "自宅（評価額の目安）",
      amount: homeValueNow(plan, year),
      placeholder: "例：所在地。権利証・登記識別情報は○○に保管",
      detail: plan.homeOwned ? propDetail({ propType: plan.homePropType, structure: plan.homeStructure, builtYear: plan.homeBuiltYear }) : "",
    },
  ];
  plan.res.forEach((r, i) => {
    rows.push({
      key: `re-${i}`,
      kind: "asset",
      label: `不動産投資：${r.name || `物件${i + 1}`}`,
      amount: computeRealEstateValue(r, year),
      placeholder: "例：所在地・管理会社",
      detail: [propDetail(r), r.rent > 0 ? `家賃収入 月${(r.rent / MAN).toFixed(1)}万円` : ""].filter(Boolean).join("・"),
    });
  });
  if (plan.useHomeLoan && plan.hlBal > 0) {
    rows.push({
      key: "hl",
      kind: "debt",
      label: "住宅ローン",
      amount: plan.hlBal,
      placeholder: "例：○○銀行",
      detail: [`金利${plan.hlRate}%`, plan.hlTerm > 0 ? `残り約${plan.hlTerm}年` : "", plan.risk?.danshin ? "団信あり" : "団信なし"].filter(Boolean).join("・"),
    });
  }
  plan.res.forEach((r, i) => {
    if (r.bal > 0) {
      rows.push({
        key: `reloan-${i}`,
        kind: "debt",
        label: `不動産ローン：${r.name || `物件${i + 1}`}`,
        amount: r.bal,
        placeholder: "例：○○銀行",
        detail: [`金利${r.rate}%`, r.term > 0 ? `期間${r.term}年` : ""].filter(Boolean).join("・"),
      });
    }
  });
  plan.otherLoans.forEach((ln, i) => {
    const amount = ln.monthlyPay * ln.remainMonths;
    if (amount > 0) {
      rows.push({
        key: `loan-${i}`,
        kind: "debt",
        label: ln.label || `ローン${i + 1}`,
        amount,
        placeholder: "例：○○信販",
        detail: `月${(ln.monthlyPay / MAN).toFixed(1)}万円 × 残り${ln.remainMonths}回`,
      });
    }
  });
  (plan.handover?.extraAssets ?? []).forEach((x, i) => {
    rows.push({ key: `extra-${i}`, kind: "asset", label: x.label || `その他の財産${i + 1}`, amount: x.amount, placeholder: "" });
  });
  return rows;
}

// ── 保険（入力画面の保険の一覧から） ──

export interface HandoverInsRow {
  index: number;          // plan.ins の何番目か（受取人の書き戻し・保管場所のキーに使う）
  company: string;
  kind: string;
  contractor: string;
  insured: string;
  beneficiary: string;
  benefit: string;        // 保障の中身（死亡保険金・年金・満期金など）
  deathBenefit: number;   // いま亡くなったら出る死亡保険金（相続税の目安に使う）
  premiumM: number;       // いまの保険料（月あたり）
}

export function insuranceRows(plan: PlanInput): HandoverInsRow[] {
  return (plan.ins ?? [])
    .map((raw, index) => ({ p: normalizeInsurance(raw as never, plan.curAge, plan.endAge), index }))
    .filter(({ p }) => p.enabled)
    .map(({ p, index }) => {
      const parts: string[] = [];
      const db = deathCoverActive(p, plan.curAge) ? deathBenefitAt(p, plan.curAge) : 0;
      if (db > 0) parts.push(`死亡 ${manS(db)}`);
      if (HAS.incomeProt(p.type) && p.incomeProtM > 0) parts.push(`死亡後 月${(p.incomeProtM / MAN).toFixed(1)}万円を${p.coverEnd > 0 ? `${p.coverEnd}歳まで` : "満了まで"}`);
      if (HAS.maturity(p.type) && p.maturityAmount > 0) parts.push(`満期 ${p.maturityAge}歳 ${manS(p.maturityAmount)}`);
      if (HAS.annuity(p.type) && p.annuityY > 0) parts.push(`年金 ${p.annuityStart}歳から年${manS(p.annuityY)}${p.annuityYears > 0 ? `×${p.annuityYears}年` : "（終身）"}`);
      if (HAS.edu(p.type)) {
        const kid = plan.kids[p.kid];
        const pays = p.eduPayouts.filter((x) => x.amount > 0).map((x) => `${x.kidAge}歳 ${manS(x.amount)}`);
        if (pays.length) parts.push(`${kid?.name ? `${kid.name}の` : ""}${pays.join("・")}`);
        if (p.waiver) parts.push("契約者が亡くなると以後の払込免除");
        if (p.ikueiM > 0) parts.push(`育英年金 月${(p.ikueiM / MAN).toFixed(1)}万円`);
      }
      if (HAS.surrender(p.type) && p.surrenderAge > 0 && p.surrenderAmount > 0) parts.push(`${p.surrenderAge}歳で解約予定（返戻金 ${manS(p.surrenderAmount)}）`);
      if (p.benefitDay > 0) parts.push(`入院 日額${p.benefitDay.toLocaleString()}円`);
      if (p.benefitLump > 0) parts.push(`一時金 ${manS(p.benefitLump)}`);
      if (p.benefitM > 0) parts.push(`給付 月${(p.benefitM / MAN).toFixed(1)}万円`);
      if (HAS.coverEnd(p.type) && !HAS.incomeProt(p.type) && p.coverEnd > 0) parts.push(`保障は${p.coverEnd}歳まで`);
      if (p.currency !== "円" && HAS.currency(p.type)) parts.push(p.currency === "変額" ? "変額" : `${p.currency}建て`);
      const yearly = premiumAt(p, plan.curAge, 1);
      return {
        index,
        company: [p.company, p.name].filter(Boolean).join(" "),
        kind: typeLabel(p.type),
        contractor: p.contractor,
        insured: p.insured,
        beneficiary: p.beneficiary,
        benefit: parts.join("／"),
        deathBenefit: p.insured === "本人" ? db : 0,
        premiumM: yearly / 12,
      };
    });
}

// ── 毎月の支払い・積立（止める・名義を変える手続きが必要なもの） ──

export interface PaymentRow {
  label: string;
  monthly: number;
  note: string;
}

export function monthlyPayments(plan: PlanInput, row: YearlyResult | undefined, ins: Insurance[] = []): PaymentRow[] {
  const out: PaymentRow[] = [];
  const add = (label: string, monthly: number, note: string) => {
    if (monthly > 0) out.push({ label, monthly, note });
  };
  if (row && row.homePay > 0) add("住宅ローンの返済", row.homePay / 12, plan.risk?.danshin ? "団信で返済されれば止まる" : "");
  add("家賃", plan.rentM, "名義の変更・解約は管理会社へ");
  plan.otherLoans.forEach((ln, i) => add(ln.label || `ローン${i + 1}`, ln.monthlyPay, "残りの返済は相続の対象"));
  ins.forEach((p) => {
    if (!p.enabled) return;
    const y = premiumAt(p, plan.curAge, 1);
    add(`保険料：${[p.company, p.name].filter(Boolean).join(" ") || typeLabel(p.type)}`, y / 12, p.insured === "本人" ? "亡くなった人の保険は払込が終わる" : "契約者の変更が必要なことがある");
  });
  if (plan.curAge < plan.nisaEndAge) add("NISAの積立", plan.nisaTsumitateM + plan.nisaGrowthM, "証券会社に連絡して止める");
  if (plan.curAge < plan.saveTokuEndAge) add("特定口座の積立", plan.saveTokuM, "証券会社に連絡して止める");
  if (plan.curAge < plan.saveDcEndAge) add(DC_LABEL[plan.dcType] === "企業型DC" ? "企業型DCのマッチング拠出" : "iDeCoの掛金", plan.saveDcM, "死亡一時金の請求と一緒に止まる");
  if (plan.curAge < plan.saveCryptoEndAge) add("暗号資産の積立", plan.saveCryptoM, "取引所に連絡して止める");
  if (plan.curAge < plan.saveGoldEndAge) add("金の積立", plan.saveGoldM, "証券会社などに連絡して止める");
  return out;
}

// ── 連絡先（入力済みの内容から、連絡が必要な相手を出しておく） ──

export interface AutoContact {
  key: string;
  role: string;
  name: string;
  why: string;
}

export function autoContacts(plan: PlanInput, ins: Insurance[]): AutoContact[] {
  const out: AutoContact[] = [];
  currentJobs(plan).forEach((j, i) =>
    out.push({ key: `c-job-${i}`, role: "勤務先（総務・人事）", name: j.name, why: "死亡退職金・未払いの給与・団体保険・企業型DCの確認" }),
  );
  const companies = [...new Set(ins.filter((p) => p.enabled && p.company).map((p) => p.company))];
  companies.forEach((c) => out.push({ key: `c-ins-${c}`, role: "保険会社", name: c, why: "保険金・給付金の請求（3年以内）" }));
  return out;
}

// 亡くなった後の手続き（期限の早い順）。入力内容に合わせて必要なものを足す
export function buildAfterDeathSteps(
  plan: PlanInput,
  o: { hasFamily: boolean; inheritanceTaxable: boolean },
): { when: string; items: string[] }[] {
  // 会社員（厚生年金）で今も勤めている人は、健康保険も勤務先
  const employed = plan.selfPension?.category === "kosei" && currentJobs(plan).length > 0;
  const hasSecurities = plan.nisaBal + plan.tokuBal + plan.goldBal > 0;
  const steps = AFTER_DEATH_STEPS.map((s) => ({ when: s.when, items: [...s.items] }));
  const at = (when: string) => steps.find((s) => s.when === when)!.items;
  if (employed) {
    at("14日以内")[1] = "健康保険証を勤務先に返す（家族が扶養に入っていたら、国民健康保険などへの加入手続き）";
  }
  if (plan.useHomeLoan && plan.hlBal > 0 && plan.risk?.danshin) at("すみやかに").push("住宅ローンの銀行に連絡（団体信用生命保険でローンを返済する手続き）");
  if (hasSecurities) at("すみやかに").push("証券会社に連絡（口座の凍結と相続の手続き。NISAは相続人の特定口座へその日の時価で移る）");
  if (plan.cryptoBal > 0) at("すみやかに").push("暗号資産の取引所に連絡（どこの取引所か分からないと手続きが難しい）");
  if (plan.dcBal > 0) at("すみやかに").push(`${DC_LABEL[plan.dcType]}の死亡一時金を請求（5年を過ぎると遺族が受け取れなくなる）`);
  if (!o.hasFamily) {
    const last = steps.find((s) => s.when === "5年以内");
    if (last) last.items = last.items.filter((x) => !x.startsWith("遺族年金"));
  }
  const ten = at("10か月以内");
  if (!o.inheritanceTaxable) ten[1] = "相続税の申告（今の目安では基礎控除以下でかからない見込み。基礎控除を超える場合は申告・納付）";
  if (!(plan.homeOwned || plan.res.length > 0)) {
    const s3 = steps.find((s) => s.when === "3年以内");
    if (s3) s3.items = [];
  }
  return steps.filter((s) => s.items.length > 0);
}

// 亡くなった後の手続き（期限の早い順）。一般的な目安
export const AFTER_DEATH_STEPS: { when: string; items: string[] }[] = [
  { when: "7日以内", items: ["死亡届の提出（市区町村役場。葬儀社が代行することが多い）", "火葬許可申請"] },
  {
    when: "14日以内",
    items: [
      "年金の受給停止（年金事務所。マイナンバー登録済みなら原則不要）",
      "国民健康保険・後期高齢者医療・介護保険の資格喪失届",
      "世帯主の変更届（必要な場合）",
    ],
  },
  { when: "すみやかに", items: ["勤務先への連絡（死亡退職金・未払い給与）", "生命保険会社への連絡（保険金の請求は3年以内）", "遺言書の有無を確認（自筆の遺言は家庭裁判所の検認が必要。法務局保管のものは不要）"] },
  { when: "3か月以内", items: ["相続放棄・限定承認をするかの判断（借金が多い場合）"] },
  { when: "4か月以内", items: ["準確定申告（亡くなった人のその年の所得の確定申告）"] },
  { when: "10か月以内", items: ["遺産分割協議", "相続税の申告・納付（基礎控除を超える場合）"] },
  { when: "2年以内", items: ["葬祭費・埋葬料の申請", "高額療養費の申請（入院していた場合）"] },
  { when: "3年以内", items: ["不動産の相続登記（2024年4月から義務化）"] },
  { when: "5年以内", items: ["遺族年金・未支給年金の請求"] },
];

// ── 項目別の引き継ぎ書（ver4.16〜） ──

export const newItemId = () => `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

interface AutoSource {
  src: string;
  cat: string;
  amount: number;
  f: Record<string, string>; // はじめて作るときに入れておく値
}

const loanKindOf = (label: string) =>
  /車|カー/.test(label) ? "自動車ローン" : /奨学/.test(label) ? "奨学金" : /教育|学資/.test(label) ? "教育ローン" : /カード/.test(label) ? "カードローン" : "その他";

// シミュレーターの入力から作る項目
export function autoSources(plan: PlanInput): AutoSource[] {
  const year = new Date().getFullYear();
  const job = currentJobs(plan)[0]?.name ?? "";
  const out: AutoSource[] = [
    { src: "cash", cat: "bank", amount: plan.cashBal, f: { kind: "普通", holder: "本人" } },
    { src: "nisa", cat: "securities", amount: plan.nisaBal, f: { kind: "NISA", holdings: splitDetail(plan.nisaSplit) } },
    { src: "toku", cat: "securities", amount: plan.tokuBal, f: { kind: "特定口座", holdings: splitDetail(plan.tokuSplit) } },
    { src: "gold", cat: "securities", amount: plan.goldBal, f: { kind: "その他", holdings: "金・コモディティ（ETFなど）" } },
    {
      src: "dc",
      cat: "dc",
      amount: plan.dcBal,
      f: { kind: DC_LABEL[plan.dcType] ?? "iDeCo", company: plan.dcType === "employee-dc" && job ? `勤務先（${job}）` : "" },
    },
    { src: "crypto", cat: "crypto", amount: plan.cryptoBal, f: {} },
  ];
  if (plan.homeOwned) {
    out.push({
      src: "home",
      cat: "realestate",
      amount: homeValueNow(plan, year),
      f: {
        label: "自宅",
        kind: plan.homePropType === "mansion" ? "マンション" : plan.homePropType === "land" ? "土地" : "土地と建物",
        memo: propDetail({ propType: plan.homePropType, structure: plan.homeStructure, builtYear: plan.homeBuiltYear }),
      },
    });
  }
  plan.res.forEach((r, i) =>
    out.push({
      src: `re-${i}`,
      cat: "realestate",
      amount: computeRealEstateValue(r, year),
      f: {
        label: r.name || `投資用不動産${i + 1}`,
        kind: r.propType === "mansion" ? "マンション" : r.propType === "land" ? "土地" : "土地と建物",
        memo: [propDetail(r), r.rent > 0 ? `家賃収入 月${(r.rent / MAN).toFixed(1)}万円` : ""].filter(Boolean).join("・"),
      },
    }),
  );
  if (plan.useHomeLoan && plan.hlBal > 0) {
    out.push({
      src: "hl",
      cat: "housingLoan",
      amount: plan.hlBal,
      f: { danshin: plan.risk?.danshin ? "あり" : "なし", memo: `金利${plan.hlRate}%・残り約${plan.hlTerm}年` },
    });
  }
  plan.res.forEach((r, i) => {
    if (r.bal > 0)
      out.push({
        src: `reloan-${i}`,
        cat: "loan",
        amount: r.bal,
        f: { kind: "不動産ローン", memo: `${r.name || `物件${i + 1}`}・金利${r.rate}%・期間${r.term}年` },
      });
  });
  plan.otherLoans.forEach((ln, i) => {
    const amount = ln.monthlyPay * ln.remainMonths;
    if (amount > 0)
      out.push({
        src: `loan-${i}`,
        cat: "loan",
        amount,
        f: { kind: loanKindOf(ln.label), memo: ln.label, monthly: `月${(ln.monthlyPay / MAN).toFixed(1)}万円・残り${ln.remainMonths}回` },
      });
  });
  return out;
}

// 項目の金額（シミュレーターから作った項目は、手で直していなければ入力の金額）
export function itemAmount(plan: PlanInput, item: HandoverItem, sources = autoSources(plan)): number {
  if (typeof item.amount === "number" && Number.isFinite(item.amount)) return item.amount;
  if (item.src) return sources.find((s) => s.src === item.src)?.amount ?? 0;
  return 0;
}

// シミュレーターの入力にある財産・ローンが、引き継ぎ書の項目にまだなければ足す。
// はじめて新しい形式にするときは、前の形式の「保管場所」「その他の財産」を移す。変化がなければ null
export function syncHandoverItems(plan: PlanInput): HandoverItem[] | null {
  const h = plan.handover;
  const items = [...(h.items ?? [])];
  let changed = false;
  const migrate = (h.version ?? 1) < 2;
  // 前の形式で書いた保管場所を、名前の欄に入れる
  const OLD_KEY: Record<string, string> = { cash: "cash", nisa: "nisa", toku: "toku", gold: "gold", dc: "dc", crypto: "crypto", home: "home", hl: "hl" };
  const NAME_FIELD: Record<string, string> = { bank: "bank", securities: "company", dc: "company", crypto: "exchange", realestate: "deed", housingLoan: "bank", loan: "lender" };
  for (const s of autoSources(plan)) {
    if (s.amount <= 0 || items.some((x) => x.src === s.src)) continue;
    const f = Object.fromEntries(Object.entries(s.f).filter(([, v]) => v));
    const old = migrate ? h.where?.[OLD_KEY[s.src] ?? s.src] : "";
    if (old) {
      const nf = NAME_FIELD[s.cat];
      if (nf && !f[nf]) f[nf] = old;
      else f.memo = [f.memo, old].filter(Boolean).join("／");
    }
    items.push({ id: newItemId(), cat: s.cat, src: s.src, f });
    changed = true;
  }
  if (migrate) {
    (h.extraAssets ?? []).forEach((x) => {
      if (!x.label && !x.amount) return;
      items.push({ id: newItemId(), cat: "otherAsset", f: { name: x.label, place: x.where }, amount: x.amount || 0 });
    });
    changed = true;
  }
  return changed ? items : null;
}
