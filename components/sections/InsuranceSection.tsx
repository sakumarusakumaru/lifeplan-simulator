"use client";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { NumberField } from "@/components/inputs/NumberField";
import { SelectField } from "@/components/inputs/SelectField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import type { Insurance, InsuranceType, Insured } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const TYPE_OPTIONS: { value: InsuranceType; label: string }[] = [
  { value: "生命（死亡・収入保障）", label: "生命（死亡・収入保障）" },
  { value: "医療", label: "医療" },
  { value: "がん・三大疾病", label: "がん・三大疾病" },
  { value: "就業不能", label: "就業不能" },
  { value: "介護", label: "介護" },
  { value: "火災・地震", label: "火災・地震" },
  { value: "自動車", label: "自動車" },
  { value: "個人賠償・その他損保", label: "個人賠償・その他損保" },
  { value: "貯蓄型", label: "貯蓄型" },
  { value: "その他", label: "その他" },
];

const INSURED_OPTIONS: { value: Insured; label: string }[] = [
  { value: "本人", label: "本人" },
  { value: "配偶者", label: "配偶者" },
  { value: "子", label: "子" },
  { value: "その他", label: "その他" },
];

const NEW_INS = (curAge: number, endAge: number): Insurance => ({
  name: "新しい保険",
  type: "生命（死亡・収入保障）",
  insured: "本人",
  premM: 0,
  start: curAge,
  end: endAge,
  memo: "",
  enabled: true,
});

export function InsuranceSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const update = (i: number, patch: Partial<Insurance>) =>
    setField("ins", plan.ins.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const add = () => setField("ins", [...plan.ins, NEW_INS(plan.curAge, plan.endAge)]);
  const remove = (i: number) => setField("ins", plan.ins.filter((_, idx) => idx !== i));

  return (
    <Section
      id="ch-07"
      no="07"
      title="保険"
      description="生命・医療・損保・貯蓄型 etc"
      status={plan.ins.length > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-3">
        {plan.ins.map((p, i) => (
          <ListItemCard
            key={i}
            kicker={`POLICY ${String(i + 1).padStart(2, "0")}${p.enabled ? "" : " · OFF"}`}
            onRemove={() => remove(i)}
          >
            <div className="mb-3">
              <CheckboxField
                label="この保険を計算に含める"
                value={p.enabled}
                onChange={(v) => update(i, { enabled: v })}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <TextField label="保険名" value={p.name} onChange={(v) => update(i, { name: v })} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <SelectField label="種類" value={p.type} onChange={(v) => update(i, { type: v })} options={TYPE_OPTIONS} />
                <SelectField label="被保険者" value={p.insured} onChange={(v) => update(i, { insured: v })} options={INSURED_OPTIONS} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <NumberField label="月額保険料" value={p.premM} onChange={(v) => update(i, { premM: v })} unit="円" />
                <div />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <NumberField label="払込開始" value={p.start} onChange={(v) => update(i, { start: v })} unit="歳" />
                <NumberField label="払込終了" value={p.end} onChange={(v) => update(i, { end: v })} unit="歳" />
              </div>
              <TextField label="メモ（計算非対象）" value={p.memo} onChange={(v) => update(i, { memo: v })} />
            </div>
          </ListItemCard>
        ))}
        <AddButton label="保険を追加" onClick={add} />
      </div>
    </Section>
  );
}
