"use client";

import { useEffect } from "react";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { DateField } from "@/components/inputs/DateField";
import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { SelectField } from "@/components/inputs/SelectField";
import { Section } from "@/components/v1/Section";
import { ageOn } from "@/lib/v1/calc/age";
import type { DrawOrderMode } from "@/lib/v1/calc/types";
import { usePlanStore } from "@/store/v1/plan-store";

const SPOUSE_WORK_OPTIONS = [
  { value: "work", label: "就労中" },
  { value: "none", label: "就労なし" },
] as const;

const DRAW_ORDER_OPTIONS: { value: DrawOrderMode; label: string }[] = [
  { value: "auto-tiered", label: "自動（年齢別に最適化）" },
  { value: "fund-stock-crypto", label: "投信 → 株 → 仮想通貨" },
  { value: "stock-fund-crypto", label: "株 → 投信 → 仮想通貨" },
  { value: "custom", label: "カスタム順序" },
];

function AgeDisplay({ birth }: { birth: string }) {
  const age = ageOn(birth, undefined);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">現在年齢</span>
      <div
        className="flex items-center justify-end px-2 py-1.5 text-xs font-bold tabular-nums text-[#0a0a0a]/50"
        style={{ border: "2px solid #0a0a0a25", borderRadius: 8, background: "#f0f0ee" }}
      >
        {age !== null ? `${age} 歳` : "—"}
      </div>
    </div>
  );
}

export function BasicSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const patch = usePlanStore((s) => s.patch);

  useEffect(() => {
    const a = ageOn(plan.selfBirth, undefined);
    if (a !== null && a !== plan.curAge) patch({ curAge: a });
  }, [plan.selfBirth, plan.curAge, patch]);

  return (
    <Section
      id="ch-01"
      no="01"
      title="基本情報"
      description="生年月日・収入期間・税率・取り崩し方針"
      status={plan.selfBirth ? "entered" : "default"}
    >
      <div className="grid grid-cols-1 gap-2">

        {/* 自分 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
          <DateField
            label="あなたの生年月日"
            value={plan.selfBirth}
            onChange={(v) => setField("selfBirth", v)}
          />
          <AgeDisplay birth={plan.selfBirth} />
        </div>

        {/* 配偶者 — ListItemCard スタイル */}
        <div
          className="p-3"
          style={{ background: "#ffffff", border: "2.5px solid #0a0a0a", borderRadius: 12 }}
        >
          <div className="mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">配偶者</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
              <DateField
                label="生年月日"
                value={plan.spouseBirth}
                onChange={(v) => setField("spouseBirth", v)}
              />
              <AgeDisplay birth={plan.spouseBirth} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
              <SelectField
                label="就労状況"
                value={plan.spouseWork}
                onChange={(v) => setField("spouseWork", v)}
                options={SPOUSE_WORK_OPTIONS}
              />
              <NumberField
                label="年収"
                value={plan.spouseIncY}
                onChange={(v) => setField("spouseIncY", v)}
                unit="円"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
              <NumberField
                label="就労開始"
                value={plan.spouseIncStart}
                onChange={(v) => setField("spouseIncStart", v)}
                unit="歳"
              />
              <NumberField
                label="就労終了"
                value={plan.spouseIncEnd}
                onChange={(v) => setField("spouseIncEnd", v)}
                unit="歳"
              />
            </div>
          </div>
        </div>

        {/* シミュレーション期間 */}
        <NumberField
          label="シミュレーション最終年齢"
          value={plan.endAge}
          onChange={(v) => setField("endAge", v)}
          unit="歳"
          min={plan.curAge}
          max={120}
        />

        {/* インフレ・税率 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
          <PercentField label="インフレ率（年）" value={plan.infl} onChange={(v) => setField("infl", v)} />
          <PercentField label="税率（概算）" value={plan.taxRate} onChange={(v) => setField("taxRate", v)} step={1} />
        </div>

        {/* 最低現金・取り崩し */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
          <NumberField label="最低現金" value={plan.cashFloor} onChange={(v) => setField("cashFloor", v)} unit="円" />
          <SelectField label="取り崩し順序" value={plan.drawOrder} onChange={(v) => setField("drawOrder", v)} options={DRAW_ORDER_OPTIONS} />
        </div>

        <CheckboxField
          label="現金不足時に借金を許容（資産売却しない）"
          value={plan.allowNegCash}
          onChange={(v) => setField("allowNegCash", v)}
        />


      </div>
    </Section>
  );
}
