"use client";

import { useEffect } from "react";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { DateField } from "@/components/inputs/DateField";
import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { SelectField } from "@/components/inputs/SelectField";
import { Section } from "@/components/Section";
import { ageOn } from "@/lib/calc/age";
import type { DrawOrderMode } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

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

export function BasicSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const patch = usePlanStore((s) => s.patch);

  // Auto-sync current ages from birth + baseDate, mirroring legacy behavior.
  useEffect(() => {
    const ref = plan.baseDate || undefined;
    const a = ageOn(plan.selfBirth, ref);
    if (a !== null && a !== plan.curAge) {
      patch({ curAge: a });
    }
  }, [plan.selfBirth, plan.baseDate, plan.curAge, patch]);

  return (
    <Section
      title="基本情報"
      description="生年月日、シミュレーション期間、税率、取り崩し方針"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DateField
          label="基準日"
          value={plan.baseDate}
          onChange={(v) => setField("baseDate", v)}
          hint="未指定なら今日"
        />
        <DateField
          label="あなたの生年月日"
          value={plan.selfBirth}
          onChange={(v) => setField("selfBirth", v)}
        />
        <NumberField
          label="現在年齢（自動）"
          value={plan.curAge}
          onChange={(v) => setField("curAge", v)}
          unit="歳"
          hint="生年月日から自動更新"
        />
        <DateField
          label="配偶者の生年月日"
          value={plan.spouseBirth}
          onChange={(v) => setField("spouseBirth", v)}
        />
        <SelectField
          label="配偶者の就労"
          value={plan.spouseWork}
          onChange={(v) => setField("spouseWork", v)}
          options={SPOUSE_WORK_OPTIONS}
        />
        <NumberField
          label="配偶者の年収"
          value={plan.spouseIncY}
          onChange={(v) => setField("spouseIncY", v)}
          unit="円"
        />
        <NumberField
          label="配偶者の就労開始"
          value={plan.spouseIncStart}
          onChange={(v) => setField("spouseIncStart", v)}
          unit="歳"
        />
        <NumberField
          label="配偶者の就労終了"
          value={plan.spouseIncEnd}
          onChange={(v) => setField("spouseIncEnd", v)}
          unit="歳"
        />
        <NumberField
          label="シミュレーション最終年齢"
          value={plan.endAge}
          onChange={(v) => setField("endAge", v)}
          unit="歳"
          min={plan.curAge}
          max={120}
        />
        <PercentField
          label="インフレ率（年）"
          value={plan.infl}
          onChange={(v) => setField("infl", v)}
        />
        <PercentField
          label="税率（概算）"
          value={plan.taxRate}
          onChange={(v) => setField("taxRate", v)}
          step={1}
        />
        <NumberField
          label="最低現金（これを下回ると資産取り崩し）"
          value={plan.cashFloor}
          onChange={(v) => setField("cashFloor", v)}
          unit="円"
        />
        <SelectField
          label="取り崩し順序"
          value={plan.drawOrder}
          onChange={(v) => setField("drawOrder", v)}
          options={DRAW_ORDER_OPTIONS}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2 lg:col-span-3">
          <CheckboxField
            label="現金不足時に借金を許容（資産売却しない）"
            value={plan.allowNegCash}
            onChange={(v) => setField("allowNegCash", v)}
          />
        </div>
      </div>
    </Section>
  );
}
