"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import type { CareEvent } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const NEW_EV = (): CareEvent => ({
  startAge: 60,
  durationYears: 5,
  monthlyCost: 80_000,
  label: "親A 介護",
});

export function CareSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const update = (i: number, patch: Partial<CareEvent>) =>
    setField("careEvents", plan.careEvents.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  const add = () => setField("careEvents", [...plan.careEvents, NEW_EV()]);
  const remove = (i: number) => setField("careEvents", plan.careEvents.filter((_, idx) => idx !== i));

  return (
    <Section
      id="ch-care"
      no="12"
      title="介護費用"
      description="親や本人の介護期間にかかる費用（月額×期間）"
      status={plan.careEvents.length > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-3">
        {plan.careEvents.length === 0 && (
          <p className="px-1 text-[11px] leading-relaxed text-[#0a0a0a]/55">
            親の介護や自分の介護にかかる費用を登録できます。
            <br />
            参考: 在宅介護 月平均8万円 / 施設介護 月平均13万円 / 介護期間平均 約5年（生命保険文化センター 2021）
          </p>
        )}
        {plan.careEvents.map((ev, i) => (
          <ListItemCard
            key={i}
            kicker={`CARE ${String(i + 1).padStart(2, "0")}`}
            onRemove={() => remove(i)}
          >
            <div className="grid grid-cols-1 gap-2">
              <TextField label="名称" value={ev.label} onChange={(v) => update(i, { label: v })} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <NumberField
                  label="開始年齢（本人基準）"
                  value={ev.startAge}
                  onChange={(v) => update(i, { startAge: v })}
                  unit="歳"
                />
                <NumberField
                  label="期間"
                  value={ev.durationYears}
                  onChange={(v) => update(i, { durationYears: v })}
                  unit="年"
                />
              </div>
              <NumberField
                label="月額"
                value={ev.monthlyCost}
                onChange={(v) => update(i, { monthlyCost: v })}
                unit="円"
              />
            </div>
          </ListItemCard>
        ))}
        <AddButton label="介護イベントを追加" onClick={add} />
      </div>
    </Section>
  );
}
