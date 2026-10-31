"use client";

import { useState } from "react";

import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import type { LoanMethod, LoanPrepay, LoanRateType, PrepayKind } from "@/lib/v4/calc/types";

// ローンのくわしい設定（金利タイプ・返済方法・繰上返済の予定）。
// 住宅ローンと不動産投資のローンで共通。ふだんは閉じた1行のリンクで、開いた人だけ設定する

export interface LoanDetail {
  rateType: LoanRateType;
  fixedUntilAge?: number;
  rateAfter?: number;
  method: LoanMethod;
  rule5y?: boolean;
  prepays: LoanPrepay[];
}

const RATE_TYPE_OPTIONS = [
  { value: "variable" as const, label: "変動金利" },
  { value: "fixedPeriod" as const, label: "当初固定（○年固定のあと変動）" },
  { value: "fixed" as const, label: "全期間固定" },
];
const METHOD_OPTIONS = [
  { value: "annuity" as const, label: "元利均等（毎月同じ額。ふつうはこちら）" },
  { value: "principal" as const, label: "元金均等（はじめ多め、だんだん減る）" },
];
const PREPAY_OPTIONS: { value: PrepayKind; label: string }[] = [
  { value: "shorten", label: "一部繰上（期間短縮型）" },
  { value: "reduce", label: "一部繰上（返済額軽減型）" },
  { value: "full", label: "全額繰上（一括返済）" },
];

export function LoanDetailFields({
  value,
  onChange,
  curAge,
  curRate,
  defaultOpen = false,
}: {
  value: LoanDetail;
  onChange: (v: Partial<LoanDetail>) => void;
  curAge: number;
  curRate: number; // 今の金利（当初固定のあとの金利の初期値に使う）
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || value.rateType !== "variable" || value.prepays.length > 0 || value.method !== "annuity");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-[11px] font-bold underline underline-offset-4 hover:text-[#c8383a]">
        くわしく設定する（金利のタイプ・元金均等・繰上返済の予定）
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg p-3" style={{ border: "1.5px solid #0a0a0a20", background: "#fafaf9" }}>
      <SelectField label="金利のタイプ" value={value.rateType} onChange={(v) => onChange({ rateType: v })} options={RATE_TYPE_OPTIONS} />
      {value.rateType === "fixedPeriod" ? (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="固定が終わる年齢" value={value.fixedUntilAge ?? curAge + 10} onChange={(v) => onChange({ fixedUntilAge: v })} unit="歳" />
          <PercentField
            label="固定後の金利（見込み）"
            value={value.rateAfter ?? curRate}
            onChange={(v) => onChange({ rateAfter: v })}
            hint="わからなければ、いまの変動金利より少し高めに"
          />
        </div>
      ) : null}
      <SelectField label="返済方法" value={value.method} onChange={(v) => onChange({ method: v })} options={METHOD_OPTIONS} />
      {value.method === "annuity" && value.rateType !== "fixed" ? (
        <CheckboxField
          label="5年ルール・125%ルールあり"
          value={value.rule5y !== false}
          onChange={(v) => onChange({ rule5y: v })}
          hint="金利が動いても毎月の返済額は5年ごとの見直しで、上げ幅は1.25倍まで（ない銀行もある）"
        />
      ) : null}
      <div>
        <p className="text-[11px] font-bold text-[#0a0a0a]/70">繰上返済の予定（あれば）</p>
        {value.prepays.map((pp, i) => (
          <div key={i} className="mt-1.5 flex flex-wrap items-end gap-2 rounded-lg bg-white p-2" style={{ border: "1.5px solid #0a0a0a20" }}>
            <div className="w-24">
              <NumberField label="何歳で" value={pp.age} onChange={(v) => onChange({ prepays: value.prepays.map((x, idx) => (idx === i ? { ...x, age: v } : x)) })} unit="歳" />
            </div>
            {pp.kind !== "full" ? (
              <div className="w-36">
                <NumberField
                  label="いくら"
                  value={pp.amount}
                  onChange={(v) => onChange({ prepays: value.prepays.map((x, idx) => (idx === i ? { ...x, amount: v } : x)) })}
                  unit="円"
                />
              </div>
            ) : null}
            <div className="min-w-44 flex-1">
              <SelectField
                label="種類"
                value={pp.kind}
                onChange={(v) => onChange({ prepays: value.prepays.map((x, idx) => (idx === i ? { ...x, kind: v } : x)) })}
                options={PREPAY_OPTIONS}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange({ prepays: value.prepays.filter((_, idx) => idx !== i) })}
              className="pb-2 text-[11px] font-bold text-[#0a0a0a]/45 hover:text-[#c8383a]"
            >
              削除 ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ prepays: [...value.prepays, { age: curAge + 1, amount: 1_000_000, kind: "shorten" }] })}
          className="mt-1.5 text-[11px] font-bold underline underline-offset-4 hover:text-[#c8383a]"
        >
          ＋ 繰上返済の予定を足す
        </button>
      </div>
    </div>
  );
}
