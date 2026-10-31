"use client";

import { useMemo } from "react";

import { INNER, note } from "@/components/v4/frame";
import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { AddButton } from "@/components/v4/ListItemCard";
import { scheduleParts } from "@/lib/v4/calc/homeLoan";
import type { HomeLoanPart, LoanPrepay } from "@/lib/v4/calc/types";

// ミックスローン（複数本）＋繰上返済の予定の入力。住宅ローンと不動産投資のローンで共用。
// どの組み合わせでも「毎月いくら・何歳で返し終わるか」をその場で出す

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

export function LoanPartsEditor({
  parts,
  setParts,
  prepays,
  setPrepays,
  curAge,
  start,
  onSimple,
}: {
  parts: HomeLoanPart[];
  setParts: (next: HomeLoanPart[]) => void;
  prepays: LoanPrepay[];
  setPrepays: (next: LoanPrepay[]) => void;
  curAge: number;
  start: number; // 返済が始まる年齢（すでに始まっていれば今の年齢）
  onSimple?: () => void; // 「簡単な入力に戻す」
}) {
  const updPart = (i: number, p: Partial<HomeLoanPart>) => setParts(parts.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  // 画面には入力中の中身をそのまま出す（残高0でも消さない）。計算側は残高のある分だけ使う
  const sched = useMemo(() => {
    const live = parts.filter((p) => p.bal > 0 && p.years > 0);
    return live.length ? scheduleParts(live, Math.max(start, curAge), prepays) : null;
  }, [parts, prepays, start, curAge]);
  const monthlyNow = sched ? sched.summaries.reduce((a, x) => a + x.firstMonthly, 0) : 0;
  const totalInterest = sched ? sched.summaries.reduce((a, x) => a + x.totalInterest, 0) : 0;

  return (
    <div className="flex flex-col gap-2">
      {parts.map((p, i) => (
        <div key={i} className="flex flex-col gap-2 p-3" style={INNER}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">{parts.length > 1 ? `ローン${i + 1}` : "ローン"}</span>
            {parts.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`ローン${i + 1}を消しますか？`)) setParts(parts.filter((_, idx) => idx !== i));
                }}
                className="text-[11px] font-bold text-[#0a0a0a]/45 hover:text-[#d55e00]"
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
              <NumberField label="固定が終わる年齢" value={p.fixedUntilAge ?? curAge + 10} onChange={(v) => updPart(i, { fixedUntilAge: v })} unit="歳" />
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
        {onSimple ? (
          <button type="button" onClick={onSimple} className="text-[11px] font-bold text-[#0a0a0a]/60 underline underline-offset-4 hover:text-[#d55e00]">
            簡単な入力に戻す
          </button>
        ) : null}
      </div>

      {/* 繰上返済の予定 */}
      <div className="mt-1">
        <p className="text-[11px] font-bold text-[#0a0a0a]/70">繰上返済の予定（あれば）</p>
        {prepays.map((pp, i) => (
          <div key={i} className="mt-1.5 flex flex-wrap items-end gap-2 p-2" style={INNER}>
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
            <button type="button" onClick={() => setPrepays(prepays.filter((_, idx) => idx !== i))} className="pb-2 text-[11px] font-bold text-[#0a0a0a]/45 hover:text-[#d55e00]">
              削除 ✕
            </button>
          </div>
        ))}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <AddButton label="繰上返済の予定を足す" onClick={() => setPrepays([...prepays, { age: Math.max(curAge + 1, start), amount: 1_000_000, kind: "shorten" }])} />
          <span className="text-[10px] text-[#0a0a0a]/55">期間短縮型（早く返し終わる）のほうが利息は減ります。手元のお金は減るので、生活防衛資金は残して</span>
        </div>
      </div>

      {sched ? (
        <div className="px-3 py-2 text-[11px] leading-relaxed" style={note("blue")}>
          この入力だと: 毎月の返済 約{Math.round(monthlyNow / 1000) / 10}万円
          {sched.summaries.length > 1 ? `（${sched.summaries.map((x, i) => `ローン${i + 1} ${Math.round(x.firstMonthly / 1000) / 10}万`).join("・")}）` : ""}
          ／ {sched.payoffAge !== null ? `${sched.payoffAge}歳ごろ返し終わる` : "この期間では返し終わらない"}
          ／ これから払う利息の合計 約{man(totalInterest)}
          {prepays.length ? "（繰上返済込み）" : ""}
        </div>
      ) : null}
    </div>
  );
}
