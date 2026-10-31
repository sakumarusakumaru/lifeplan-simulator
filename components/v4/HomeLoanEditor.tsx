"use client";

import { useMemo } from "react";

import { note } from "@/components/v4/frame";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { LoanPartsEditor } from "@/components/v4/LoanPartsEditor";
import { loanParts, loanTotals, scheduleLoans } from "@/lib/v4/calc/homeLoan";
import type { HomeLoanPart, LoanPrepay, PlanInput } from "@/lib/v4/calc/types";

// 住宅ローンの入力。ふだんは1本の簡単な欄だけ。
// 「くわしく設定」を開くと、ミックスローン（固定＋変動）・返済方法・繰上返済の予定を入れられる。
// どの組み合わせでも、下に「毎月いくら・何歳で返し終わるか」をその場で出して、入力の意味が見えるようにする


const man = (yen: number) => `${Math.round(yen / 10000).toLocaleString()}万円`;

export function HomeLoanEditor({
  plan,
  setField,
  patch,
}: {
  plan: PlanInput;
  setField: <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => void;
  patch: (p: Partial<PlanInput>) => void;
}) {
  // 画面には入力中の中身をそのまま出す（残高0でも消さない）。計算側（loanParts）は残高のある分だけ使う
  const detailed = !!plan.hlParts?.length;
  const parts = detailed ? plan.hlParts! : loanParts(plan);
  const prepays = plan.hlPrepays ?? [];

  // 返済予定のまとめ（毎月の返済額・返し終わる年齢・利息の合計）
  const sched = useMemo(() => (loanParts(plan).length ? scheduleLoans(plan) : null), [plan]);
  const monthlyNow = sched ? sched.summaries.reduce((a, x) => a + x.firstMonthly, 0) : 0;
  const totalInterest = sched ? sched.summaries.reduce((a, x) => a + x.totalInterest, 0) : 0;

  const setParts = (next: HomeLoanPart[]) => {
    // 合計の欄（ほかの画面の表示・Liteとの互換に使う）も一緒に合わせる
    patch({ hlParts: next, ...loanTotals(next) });
  };

  const toDetailed = () => {
    // 今の1本の入力を、そのまま「変動・元利均等」の1本として詳しい設定に引き継ぐ
    setParts([{ label: "ローン1", bal: plan.hlBal, years: plan.hlTerm, rate: plan.hlRate, rateType: "variable", method: "annuity", rule5y: true }]);
  };
  const toSimple = () => {
    if (parts.length > 1 && !confirm("くわしい設定（2本目以降・返済方法など）を消して、1本の簡単な入力に戻しますか？")) return;
    patch({ hlParts: undefined, ...loanTotals(parts) });
  };

  const setPrepays = (next: LoanPrepay[]) => setField("hlPrepays", next.length ? next : undefined);

  return (
    <div className="flex flex-col gap-2">
      {!detailed ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="ローン残高" value={plan.hlBal} onChange={(v) => setField("hlBal", v)} unit="円" />
            <PercentField label="金利" value={plan.hlRate} onChange={(v) => setField("hlRate", v)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="返済開始" value={plan.hlStart} onChange={(v) => setField("hlStart", v)} unit="歳" hint="すでに返済中なら、残高は今の額・年数は残りで" />
            <NumberField label="残りの返済年数" value={plan.hlTerm} onChange={(v) => setField("hlTerm", v)} unit="年" />
          </div>
          <button type="button" onClick={toDetailed} className="self-start text-[11px] font-bold underline underline-offset-4 hover:text-[#c8383a]">
            くわしく設定する（固定と変動のミックス・元金均等・繰上返済の予定）
          </button>
        </>
      ) : (
        <LoanPartsEditor parts={parts} setParts={setParts} prepays={prepays} setPrepays={setPrepays} curAge={plan.curAge} start={plan.hlStart} onSimple={toSimple} />
      )}

      {/* どの入力でも、意味がすぐ分かるように「毎月いくら・いつ返し終わるか」をその場で出す */}
      {!detailed && sched && parts.length ? (
        <div className="px-3 py-2 text-[11px] leading-relaxed" style={note("blue")}>
          この入力だと: 毎月の返済 約{Math.round(monthlyNow / 1000) / 10}万円
          {parts.length > 1 ? `（${sched.summaries.map((x, i) => `ローン${i + 1} ${Math.round(x.firstMonthly / 1000) / 10}万`).join("・")}）` : ""}
          ／ {sched.payoffAge !== null ? `${sched.payoffAge}歳ごろ返し終わる` : "この期間では返し終わらない"}
          ／ これから払う利息の合計 約{man(totalInterest)}
          {prepays.length ? "（繰上返済込み）" : ""}
        </div>
      ) : null}
    </div>
  );
}
