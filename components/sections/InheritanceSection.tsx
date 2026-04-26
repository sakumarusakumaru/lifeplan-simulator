"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import type { InheritanceEvent } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const NEW_EV = (): InheritanceEvent => ({
  age: 70,
  amount: 10_000_000,
  label: "親からの相続",
});

export function InheritanceSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const update = (i: number, patch: Partial<InheritanceEvent>) =>
    setField("inheritances", plan.inheritances.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  const add = () => setField("inheritances", [...plan.inheritances, NEW_EV()]);
  const remove = (i: number) => setField("inheritances", plan.inheritances.filter((_, idx) => idx !== i));

  return (
    <Section
      id="ch-inherit"
      no="11"
      title="相続・贈与"
      description="親からの相続予定など、一時収入を予定として組み込み"
      status={plan.inheritances.length > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-3">
        {plan.inheritances.length === 0 && (
          <p className="px-1 text-[11px] leading-relaxed text-[#0a0a0a]/55">
            親からの相続、生前贈与、保険金など、特定年齢で受け取る一時収入を登録できます。
            <br />
            登録すると当該年齢に現金として加算され、その後の取り崩し計画に影響します。
          </p>
        )}
        {plan.inheritances.map((ev, i) => (
          <ListItemCard
            key={i}
            kicker={`EVENT ${String(i + 1).padStart(2, "0")}`}
            onRemove={() => remove(i)}
          >
            <div className="grid grid-cols-1 gap-2">
              <TextField label="名称" value={ev.label} onChange={(v) => update(i, { label: v })} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <NumberField
                  label="受け取る年齢（本人基準）"
                  value={ev.age}
                  onChange={(v) => update(i, { age: v })}
                  unit="歳"
                />
                <NumberField
                  label="金額"
                  value={ev.amount}
                  onChange={(v) => update(i, { amount: v })}
                  unit="円"
                />
              </div>
            </div>
          </ListItemCard>
        ))}
        <AddButton label="相続イベントを追加" onClick={add} />
      </div>
    </Section>
  );
}
