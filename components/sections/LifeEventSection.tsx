"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import type { InheritanceEvent, LifeExpenseEvent } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const NEW_INCOME = (): InheritanceEvent => ({
  age: 70,
  amount: 10_000_000,
  label: "親からの相続",
});

const NEW_EXPENSE = (): LifeExpenseEvent => ({
  age: 50,
  amount: 2_000_000,
  label: "リフォーム",
});

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
      — {children}
    </div>
  );
}

export function LifeEventSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const updateIncome = (i: number, patch: Partial<InheritanceEvent>) =>
    setField("inheritances", plan.inheritances.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  const addIncome = () => setField("inheritances", [...plan.inheritances, NEW_INCOME()]);
  const removeIncome = (i: number) => setField("inheritances", plan.inheritances.filter((_, idx) => idx !== i));

  const updateExpense = (i: number, patch: Partial<LifeExpenseEvent>) =>
    setField("lifeExpenses", plan.lifeExpenses.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  const addExpense = () => setField("lifeExpenses", [...plan.lifeExpenses, NEW_EXPENSE()]);
  const removeExpense = (i: number) => setField("lifeExpenses", plan.lifeExpenses.filter((_, idx) => idx !== i));

  const hasData = plan.inheritances.length > 0 || plan.lifeExpenses.length > 0;

  return (
    <Section
      id="ch-lifeevent"
      no="11"
      title="ライフイベント"
      description="相続・贈与などの一時収入と、リフォーム・慶弔などの一時支出"
      status={hasData ? "entered" : "default"}
    >
      <div className="flex flex-col gap-5">
        {/* 一時収入 */}
        <div>
          <SubLabel>一時収入（相続・贈与・保険金）</SubLabel>
          {plan.inheritances.length === 0 && (
            <p className="mb-2 px-1 text-[11px] leading-relaxed text-[#0a0a0a]/55">
              親からの相続、生前贈与、保険金など。登録年齢に現金として加算されます。
            </p>
          )}
          <div className="flex flex-col gap-3">
            {plan.inheritances.map((ev, i) => (
              <ListItemCard
                key={i}
                kicker={`INCOME ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeIncome(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField label="名称" value={ev.label} onChange={(v) => updateIncome(i, { label: v })} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField
                      label="受け取る年齢"
                      value={ev.age}
                      onChange={(v) => updateIncome(i, { age: v })}
                      unit="歳"
                    />
                    <NumberField
                      label="金額"
                      value={ev.amount}
                      onChange={(v) => updateIncome(i, { amount: v })}
                      unit="円"
                    />
                  </div>
                </div>
              </ListItemCard>
            ))}
            <AddButton label="一時収入を追加" onClick={addIncome} />
          </div>
        </div>

        {/* 一時支出 */}
        <div>
          <SubLabel>一時支出（リフォーム・車・慶弔など）</SubLabel>
          {plan.lifeExpenses.length === 0 && (
            <p className="mb-2 px-1 text-[11px] leading-relaxed text-[#0a0a0a]/55">
              参考: リフォーム 100〜500万 / 車買替 200〜400万 / 結婚式 300万 / 葬儀 200万
            </p>
          )}
          <div className="flex flex-col gap-3">
            {plan.lifeExpenses.map((ev, i) => (
              <ListItemCard
                key={i}
                kicker={`EXPENSE ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeExpense(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField label="名称" value={ev.label} onChange={(v) => updateExpense(i, { label: v })} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField
                      label="支出年齢"
                      value={ev.age}
                      onChange={(v) => updateExpense(i, { age: v })}
                      unit="歳"
                    />
                    <NumberField
                      label="金額"
                      value={ev.amount}
                      onChange={(v) => updateExpense(i, { amount: v })}
                      unit="円"
                    />
                  </div>
                </div>
              </ListItemCard>
            ))}
            <AddButton label="一時支出を追加" onClick={addExpense} />
          </div>
        </div>
      </div>
    </Section>
  );
}
