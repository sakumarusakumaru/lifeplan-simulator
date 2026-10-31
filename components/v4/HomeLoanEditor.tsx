"use client";

import { useMemo } from "react";

import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { AddButton } from "@/components/v4/ListItemCard";
import { loanParts, loanTotals, scheduleLoans } from "@/lib/v4/calc/homeLoan";
import type { HomeLoanPart, LoanPrepay, PlanInput } from "@/lib/v4/calc/types";

// 住宅ローンの入力。ふだんは1本の簡単な欄だけ。
// 「くわしく設定」を開くと、ミックスローン（固定＋変動）・返済方法・繰上返済の予定を入れられる。
// どの組み合わせでも、下に「毎月いくら・何歳で返し終わるか」をその場で出して、入力の意味が見えるようにする

const RATE_TYPE_OPTIONS = [
  { value: "variable" as const, label: "変動金利" },
  { value: "fixedPeriod" as const, label: "当初固定（○年固定のあと変動）" },
  { value: "fixed" as const, label: "全期間固定（フラット35など）" },
];
const METHOD_OPTIONS = [
  { value: "annuity" as const, label: "元利均等（毎月同じ額。ふつうはこちら）" },
  { value: "principal" as const, label: "元金均等（はじめ多め、だんだん減る）" },
];
const PREPAY_OPTIONS = [
  { value: "shorten" as const, label: "一部繰上（期間短縮型）" },
  { value: "reduce" as const, label: "一部繰上（返済額軽減型）" },
  { value: "full" as const, label: "全額繰上（一括返済）" },
];

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
  const updPart = (i: number, p: Partial<HomeLoanPart>) => setParts(parts.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

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
        <>
          {parts.map((p, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg p-3" style={{ border: "1.5px solid #0a0a0a30", background: "#fafaf9" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">{parts.length > 1 ? `ローン${i + 1}` : "ローン"}</span>
                {parts.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`ローン${i + 1}を消しますか？`)) setParts(parts.filter((_, idx) => idx !== i));
                    }}
                    className="text-[11px] font-bold text-[#0a0a0a]/45 hover:text-[#c8383a]"
                  >
                    削除 ✕
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="残高" value={p.bal} onChange={(v) => updPart(i, { bal: v })} unit="円" />
                <NumberField label="残りの返済年数" value={p.years} onChange={(v) => updPart(i, { years: v })} unit="年" />
              </div>
              <SelectField label="金利のタイプ" value={p.rateType} onChange={(v) => updPart(i, { rateType: v })} options={RATE_TYPE_OPTIONS} />
              <div className="grid grid-cols-2 gap-2">
                <PercentField label={p.rateType === "fixedPeriod" ? "いまの金利（固定期間中）" : "金利"} value={p.rate} onChange={(v) => updPart(i, { rate: v })} />
                {p.rateType === "fixedPeriod" ? (
                  <NumberField
                    label="固定が終わる年齢"
                    value={p.fixedUntilAge ?? plan.curAge + 10}
                    onChange={(v) => updPart(i, { fixedUntilAge: v })}
                    unit="歳"
                  />
                ) : null}
              </div>
              {p.rateType === "fixedPeriod" ? (
                <PercentField
                  label="固定が終わったあとの金利（見込み）"
                  value={p.rateAfter ?? p.rate}
                  onChange={(v) => updPart(i, { rateAfter: v })}
                  hint="わからなければ、いまの変動金利より少し高めに"
                />
              ) : null}
              <SelectField label="返済方法" value={p.method} onChange={(v) => updPart(i, { method: v })} options={METHOD_OPTIONS} />
              {p.method === "annuity" && p.rateType !== "fixed" ? (
                <CheckboxField
                  label="5年ルール・125%ルールあり"
                  value={p.rule5y !== false}
                  onChange={(v) => updPart(i, { rule5y: v })}
                  hint="金利が動いても毎月の返済額は5年ごとの見直しで、上げ幅は1.25倍まで（多くの銀行の変動金利。ない銀行もある）"
                />
              ) : null}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <AddButton
              label="ローンを足す（固定と変動のミックスなど）"
              onClick={() => setParts([...parts, { label: `ローン${parts.length + 1}`, bal: 0, years: parts[0]?.years ?? 30, rate: 1.5, rateType: "fixed", method: "annuity" }])}
            />
            <button type="button" onClick={toSimple} className="text-[11px] font-bold underline underline-offset-4 text-[#0a0a0a]/60 hover:text-[#c8383a]">
              簡単な入力に戻す
            </button>
          </div>

          {/* 繰上返済の予定 */}
          <div className="mt-1">
            <p className="text-[11px] font-bold text-[#0a0a0a]/70">繰上返済の予定（あれば）</p>
            {prepays.map((pp, i) => (
              <div key={i} className="mt-1.5 flex flex-wrap items-end gap-2 rounded-lg p-2" style={{ border: "1.5px solid #0a0a0a20" }}>
                <div className="w-24">
                  <NumberField label="何歳で" value={pp.age} onChange={(v) => setPrepays(prepays.map((x, idx) => (idx === i ? { ...x, age: v } : x)))} unit="歳" />
                </div>
                {pp.kind !== "full" ? (
                  <div className="w-36">
                    <NumberField label="いくら" value={pp.amount} onChange={(v) => setPrepays(prepays.map((x, idx) => (idx === i ? { ...x, amount: v } : x)))} unit="円" />
                  </div>
                ) : null}
                <div className="min-w-44 flex-1">
                  <SelectField
                    label="種類"
                    value={pp.kind}
                    onChange={(v) => setPrepays(prepays.map((x, idx) => (idx === i ? { ...x, kind: v } : x)))}
                    options={PREPAY_OPTIONS}
                  />
                </div>
                {parts.length > 1 ? (
                  <div className="w-32">
                    <SelectField
                      label="どのローン"
                      value={String(pp.part ?? 0)}
                      onChange={(v) => setPrepays(prepays.map((x, idx) => (idx === i ? { ...x, part: Number(v) } : x)))}
                      options={parts.map((_, idx) => ({ value: String(idx), label: `ローン${idx + 1}` }))}
                    />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPrepays(prepays.filter((_, idx) => idx !== i))}
                  className="pb-2 text-[11px] font-bold text-[#0a0a0a]/45 hover:text-[#c8383a]"
                >
                  削除 ✕
                </button>
              </div>
            ))}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <AddButton label="繰上返済の予定を足す" onClick={() => setPrepays([...prepays, { age: Math.max(plan.curAge + 1, plan.hlStart), amount: 1_000_000, kind: "shorten" }])} />
              <span className="text-[10px] text-[#0a0a0a]/55">期間短縮型（早く返し終わる）のほうが利息は減ります。手元のお金は減るので、生活防衛資金は残して</span>
            </div>
          </div>
        </>
      )}

      {/* どの入力でも、意味がすぐ分かるように「毎月いくら・いつ返し終わるか」をその場で出す */}
      {sched && parts.length ? (
        <div className="rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#eef6fc", border: "1.5px solid #3b82f640" }}>
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
