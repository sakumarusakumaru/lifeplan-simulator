"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { Section } from "@/components/v1/Section";
import { usePlanStore } from "@/store/v1/plan-store";

export function ExpenseSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  return (
    <Section
      id="ch-05"
      no="05"
      title="支出"
      description="生活費・特別費"
      status={plan.livingM > 0 ? "entered" : "default"}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
        <NumberField
          label="基本支出(月)"
          value={plan.livingM}
          onChange={(v) => setField("livingM", v)}
          unit="円"
        />
        <NumberField
          label="特別費(年)"
          value={plan.specialY}
          onChange={(v) => setField("specialY", v)}
          unit="円"
        />
      </div>
    </Section>
  );
}
