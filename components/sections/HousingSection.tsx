"use client";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import type { OtherLoan } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const NEW_LOAN = (): OtherLoan => ({
  label: "自動車ローン",
  monthlyPay: 30_000,
  remainMonths: 60,
});

export function HousingSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const updateLoan = (i: number, patch: Partial<OtherLoan>) =>
    setField("otherLoans", plan.otherLoans.map((ln, idx) => (idx === i ? { ...ln, ...patch } : ln)));
  const addLoan = () => setField("otherLoans", [...plan.otherLoans, NEW_LOAN()]);
  const removeLoan = (i: number) => setField("otherLoans", plan.otherLoans.filter((_, idx) => idx !== i));

  const entered = plan.rentM > 0 || plan.useHomeLoan || plan.homeTaxY > 0 || plan.otherLoans.length > 0;

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

        <SubGroup title="その他ローン（自動車・奨学金など）">
          {plan.otherLoans.length === 0 && (
            <p className="mb-2 px-1 text-[11px] leading-relaxed text-[#0a0a0a]/55">
              住宅ローン以外の借入を登録。毎月の返済額が支出に計上され、純資産にも反映されます。
            </p>
          )}
          <div className="flex flex-col gap-3">
            {plan.otherLoans.map((ln, i) => (
              <ListItemCard
                key={i}
                kicker={`LOAN ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeLoan(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField label="名称" value={ln.label} onChange={(v) => updateLoan(i, { label: v })} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField
                      label="月返済額"
                      value={ln.monthlyPay}
                      onChange={(v) => updateLoan(i, { monthlyPay: v })}
                      unit="円"
                    />
                    <NumberField
                      label="残り返済月数"
                      value={ln.remainMonths}
                      onChange={(v) => updateLoan(i, { remainMonths: v })}
                      unit="ヶ月"
                    />
                  </div>
                </div>
              </ListItemCard>
            ))}
            <AddButton label="ローンを追加" onClick={addLoan} />
          </div>
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
