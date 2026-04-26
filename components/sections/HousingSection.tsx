"use client";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { Section } from "@/components/Section";
import { usePlanStore } from "@/store/plan-store";

export function HousingSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const entered = plan.rentM > 0 || plan.useHomeLoan || plan.homeTaxY > 0;

  return (
    <Section
      id="ch-06"
      no="06"
      title="住居"
      description="家賃・固定資産税・住宅ローン"
      status={entered ? "entered" : "default"}
    >
      <div className="flex flex-col gap-6">
        <SubGroup title="家賃・税金">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
            <NumberField
              label="家賃 / 管理費(月)"
              value={plan.rentM}
              onChange={(v) => setField("rentM", v)}
              unit="円"
            />
            <NumberField
              label="固定資産税(年)"
              value={plan.homeTaxY}
              onChange={(v) => setField("homeTaxY", v)}
              unit="円"
            />
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
              <NumberField
                label="残高"
                value={plan.hlBal}
                onChange={(v) => setField("hlBal", v)}
                unit="円"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <PercentField
                  label="金利"
                  value={plan.hlRate}
                  onChange={(v) => setField("hlRate", v)}
                />
                <NumberField
                  label="期間"
                  value={plan.hlTerm}
                  onChange={(v) => setField("hlTerm", v)}
                  unit="年"
                />
              </div>
              <NumberField
                label="返済開始年齢"
                value={plan.hlStart}
                onChange={(v) => setField("hlStart", v)}
                unit="歳"
              />
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
