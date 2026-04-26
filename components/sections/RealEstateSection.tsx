"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import type { RealEstate } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const NEW_RE = (): RealEstate => ({
  name: "新しい物件",
  rent: 0,
  cost: 0,
  bal: 0,
  rate: 1.0,
  term: 20,
  start: 35,
});

export function RealEstateSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const update = (i: number, patch: Partial<RealEstate>) =>
    setField("res", plan.res.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => setField("res", [...plan.res, NEW_RE()]);
  const remove = (i: number) => setField("res", plan.res.filter((_, idx) => idx !== i));

  return (
    <Section
      id="ch-08"
      no="08"
      title="不動産投資"
      description="物件ごとの家賃・経費・ローン"
      status={plan.res.length > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-3">
        {plan.res.map((r, i) => (
          <ListItemCard
            key={i}
            kicker={`PROPERTY ${String(i + 1).padStart(2, "0")}`}
            onRemove={() => remove(i)}
          >
            <div className="grid grid-cols-1 gap-2">
              <TextField label="名称" value={r.name} onChange={(v) => update(i, { name: v })} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <NumberField label="家賃(月)" value={r.rent} onChange={(v) => update(i, { rent: v })} unit="円" />
                <NumberField label="経費(年)" value={r.cost} onChange={(v) => update(i, { cost: v })} unit="円" />
              </div>
              <NumberField label="ローン残高" value={r.bal} onChange={(v) => update(i, { bal: v })} unit="円" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <PercentField label="金利" value={r.rate} onChange={(v) => update(i, { rate: v })} />
                <NumberField label="ローン期間" value={r.term} onChange={(v) => update(i, { term: v })} unit="年" />
              </div>
              <NumberField
                label="開始年齢"
                value={typeof r.start === "number" ? r.start : Number(r.start) || 0}
                onChange={(v) => update(i, { start: v })}
                unit="歳"
              />
            </div>
          </ListItemCard>
        ))}
        <AddButton label="物件を追加" onClick={add} />
      </div>
    </Section>
  );
}
