// 住宅ローンの返済予定（ミックスローン・金利タイプ・元利均等／元金均等・繰上返済）
//   毎月の返済を1年に12回まわし、年ごとに「返済額・利息・繰上返済・年末残高」を出す。
//   金利は年のはじめに切り替わる（固定期間の終わり、外的環境の金利上昇）。
//   変動・元利均等は、5年ルール（返済額は5年ごとに見直す）と125%ルール（見直しの上げ幅は1.25倍まで）。
//   返済額で利息を払いきれない月は、その分を残高に足す（未払利息）。最後の回で残りをまとめて払う
import { pmt } from "./finance";
import type { HomeLoanPart, LoanPrepay, PlanInput } from "./types";

export interface LoanYear {
  pay: number;       // 毎月の返済の合計（繰上返済を除く）
  interest: number;  // 払った利息の合計
  prepay: number;    // 繰上返済の額
  bal: number;       // 年末の残高
}

export interface LoanPartSummary {
  firstMonthly: number;     // 返済を始めた最初の月の返済額
  payoffAge: number | null; // 返し終わる年齢（その年のうちに0になる）
  totalInterest: number;
}

// 返す回数（元利均等で毎月 pay を払うとき、残高 bal を返し終わる回数）
function nper(r: number, pay: number, bal: number): number {
  if (bal <= 0) return 0;
  if (r === 0) return Math.ceil(bal / pay);
  const x = 1 - (r * bal) / pay;
  if (x <= 0) return Infinity;
  return Math.ceil(-Math.log(x) / Math.log(1 + r));
}

// 画面の入力から、ローンの中身を取り出す。hlParts がなければ、合計の欄から1本（変動・元利均等）として作る
export function loanParts(plan: PlanInput): HomeLoanPart[] {
  if (!plan.useHomeLoan) return [];
  if (plan.hlParts && plan.hlParts.length) return plan.hlParts.filter((p) => p.bal > 0 && p.years > 0);
  if (plan.hlBal > 0 && plan.hlTerm > 0)
    return [{ label: "住宅ローン", bal: plan.hlBal, years: plan.hlTerm, rate: plan.hlRate, rateType: "variable", method: "annuity", rule5y: true }];
  return [];
}

// その年の金利（%）
export function rateAt(p: HomeLoanPart, age: number): number {
  if (p.rateType === "fixedPeriod" && p.fixedUntilAge !== undefined && age >= p.fixedUntilAge) return p.rateAfter ?? p.rate;
  return p.rate;
}

// 1本のローンの年ごとの予定。start = 返済を始める年齢（今より前なら今から、残高と残りの年数で）
export function schedulePart(p: HomeLoanPart, start: number, prepays: LoanPrepay[], partIndex: number, lastAge = 130) {
  const years = new Map<number, LoanYear>();
  let bal = Math.max(0, p.bal);
  let n = Math.max(1, Math.round(p.years * 12));
  let rate = rateAt(p, start);
  let r = rate / 100 / 12;
  let pay = pmt(r, n, bal);
  let principalM = bal / n;
  const variableRule = p.method === "annuity" && p.rateType !== "fixed" && p.rule5y !== false;
  let month = 0; // 返済を始めてからの回数（5年ルールの見直しに使う）
  let firstMonthly = p.method === "annuity" ? pay : principalM + bal * r;
  let payoffAge: number | null = null;
  let totalInterest = 0;
  for (let age = start; age <= lastAge && bal > 0.5; age++) {
    // 金利の切り替え（固定期間の終わりなど）。元金均等・5年ルールなしの元利均等は、すぐに返済額を計算し直す
    const newRate = rateAt(p, age);
    if (newRate !== rate) {
      rate = newRate;
      r = rate / 100 / 12;
      if (p.method === "annuity" && !(variableRule && p.rateType === "variable")) pay = pmt(r, n, bal);
      // 固定期間が終わって変動に移るときは、その時点で返済額を計算し直す（その後は5年ルール）
      if (p.method === "annuity" && p.rateType === "fixedPeriod") {
        pay = pmt(r, n, bal);
        month = 0;
      }
    }
    // 繰上返済（その年のはじめ）
    let prepay = 0;
    for (const pp of prepays) {
      if (pp.age !== age || (pp.part ?? 0) !== partIndex || bal <= 0) continue;
      if (pp.kind === "full") {
        prepay += bal;
        bal = 0;
        continue;
      }
      const a = Math.min(Math.max(0, pp.amount), bal);
      bal -= a;
      prepay += a;
      if (bal <= 0.5) {
        bal = 0;
        continue;
      }
      if (pp.kind === "shorten") {
        // 期間短縮型: 毎月の返済額はそのまま、回数を減らす
        n = p.method === "annuity" ? Math.min(n, nper(r, pay, bal)) : Math.min(n, Math.ceil(bal / principalM));
      } else {
        // 返済額軽減型: 回数はそのまま、毎月の返済額を減らす
        if (p.method === "annuity") pay = pmt(r, n, bal);
        else principalM = bal / n;
      }
    }
    let paid = 0;
    let interest = 0;
    for (let m = 0; m < 12 && bal > 0.5 && n > 0; m++) {
      const i = bal * r;
      let pmtM: number;
      if (n === 1) pmtM = bal + i; // 最後の回は残りをまとめて
      else if (p.method === "annuity") pmtM = Math.min(pay, bal + i);
      else pmtM = Math.min(principalM, bal) + i;
      interest += Math.min(i, pmtM);
      paid += pmtM;
      bal = bal + i - pmtM; // 利息を払いきれない分（未払利息）は残高に残る
      n--;
      month++;
      // 5年ルール・125%ルール（変動の元利均等）
      if (variableRule && (p.rateType === "variable" || (p.fixedUntilAge !== undefined && age >= p.fixedUntilAge)) && month % 60 === 0 && n > 0) {
        pay = Math.min(pmt(r, n, bal), pay * 1.25);
      }
    }
    if (bal < 0.5) bal = 0;
    totalInterest += interest;
    years.set(age, { pay: paid, interest, prepay, bal });
    if (bal === 0 && payoffAge === null) payoffAge = age;
  }
  if (firstMonthly < 0) firstMonthly = 0;
  return { years, summary: { firstMonthly, payoffAge, totalInterest } as LoanPartSummary };
}

// すべてのローンを合わせた年ごとの予定と、ローンごとのまとめ
export function scheduleLoans(plan: PlanInput) {
  const parts = loanParts(plan);
  const start = Math.max(plan.hlStart, plan.curAge);
  const prepays = plan.hlPrepays ?? [];
  const each = parts.map((p, i) => schedulePart(p, start, prepays, i));
  const byAge = new Map<number, LoanYear>();
  for (const e of each) {
    for (const [age, y] of e.years) {
      const t = byAge.get(age) ?? { pay: 0, interest: 0, prepay: 0, bal: 0 };
      byAge.set(age, { pay: t.pay + y.pay, interest: t.interest + y.interest, prepay: t.prepay + y.prepay, bal: t.bal + y.bal });
    }
  }
  const startBal = parts.reduce((a, p) => a + p.bal, 0);
  const payoffAge = each.length ? Math.max(...each.map((e) => e.summary.payoffAge ?? start)) : null;
  return { parts, start, startBal, byAge, summaries: each.map((e) => e.summary), payoffAge };
}

// 画面の入力から、合計の欄（hlBal・hlRate・hlTerm）を作る（ほかの画面・旧い計算との互換）
export function loanTotals(parts: HomeLoanPart[]) {
  const bal = parts.reduce((a, p) => a + p.bal, 0);
  const rate = bal > 0 ? parts.reduce((a, p) => a + p.rate * p.bal, 0) / bal : 0;
  const term = parts.length ? Math.max(...parts.map((p) => p.years)) : 0;
  return { hlBal: bal, hlRate: Math.round(rate * 1000) / 1000, hlTerm: term };
}
