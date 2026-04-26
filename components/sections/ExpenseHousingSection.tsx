"use client";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { Section } from "@/components/Section";
import { usePlanStore } from "@/store/plan-store";

export function ExpenseHousingSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  return (
    <Section
      id="ch-04"
      no="04"
      title="支出・住居"
      description="生活費・家賃・住宅ローン"
      status={plan.livingM > 0 || plan.rentM > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-6">
        <SubGroup title="生活支出">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
            <NumberField label="基本支出(月)" value={plan.livingM} onChange={(v) => setField("livingM", v)} unit="円" />
            <NumberField label="特別費(年)" value={plan.specialY} onChange={(v) => setField("specialY", v)} unit="円" />
          </div>
        </SubGroup>

        <SubGroup title="住居（家賃・税金）">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
            <NumberField label="家賃 / 管理費(月)" value={plan.rentM} onChange={(v) => setField("rentM", v)} unit="円" />
            <NumberField label="固定資産税(年)" value={plan.homeTaxY} onChange={(v) => setField("homeTaxY", v)} unit="円" />
          </div>
        </SubGroup>

        <SubGroup title="住宅ローン">
          <div className="mb-2">
            <CheckboxField
              label="住宅ローンあり"
              value={plan.useHomeLoan}
              onChange={(v) => setField("useHomeLoan", v)}
            />
          </div>
          {plan.useHomeLoan ? (
            <div className="grid grid-cols-1 gap-2">
              <NumberField label="残高" value={plan.hlBal} onChange={(v) => setField("hlBal", v)} unit="円" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <PercentField label="金利" value={plan.hlRate} onChange={(v) => setField("hlRate", v)} />
                <NumberField label="期間" value={plan.hlTerm} onChange={(v) => setField("hlTerm", v)} unit="年" />
              </div>
              <NumberField label="返済開始年齢" value={plan.hlStart} onChange={(v) => setField("hlStart", v)} unit="歳" />
            </div>
          ) : null}
        </SubGroup>
      </div>
    </Section>
  );
}

function SubGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
        — {title}
      </div>
      {children}
    </div>
  );
}
