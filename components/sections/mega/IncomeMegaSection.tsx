"use client";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { NumberField } from "@/components/inputs/NumberField";
import { SelectField } from "@/components/inputs/SelectField";
import { SliderField } from "@/components/inputs/SliderField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { CollapsibleSubGroup } from "@/components/CollapsibleSubGroup";
import { Section } from "@/components/Section";
import { calcPension } from "@/lib/calc/pension";
import type {
  Job,
  PensionCategory,
  PensionInput,
  PensionMode,
  SideJob,
} from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const PEN_MODE_OPTIONS: { value: PensionMode; label: string }[] = [
  { value: "auto", label: "自動計算（推奨）" },
  { value: "manual", label: "手動指定" },
];

const PEN_CATEGORY_SELF_OPTIONS: { value: PensionCategory; label: string }[] = [
  { value: "kosei", label: "2号 会社員・公務員（厚生年金 + 国民年金）" },
  { value: "kokumin", label: "1号 自営業・無職（国民年金のみ）" },
];

const PEN_CATEGORY_SPOUSE_OPTIONS: { value: PensionCategory; label: string }[] = [
  { value: "kosei", label: "2号 会社員・公務員（厚生年金 + 国民年金）" },
  { value: "dependent", label: "3号 扶養配偶者（国民年金のみ・保険料免除）" },
  { value: "kokumin", label: "1号 自営業・無職（国民年金のみ・自己納付）" },
];

const NEW_JOB = (): Job => ({
  name: "新しい勤務先",
  start: 30,
  end: 60,
  inc: 0,
  raise: 2.0,
  sev: 0,
  sevAge: 60,
});

const NEW_SIDE_JOB = (): SideJob => ({
  name: "新しい副業",
  start: 30,
  end: 60,
  inc: 0,
});

interface PensionEditorProps {
  kicker: string;
  startAge: number;
  setStartAge: (v: number) => void;
  pension: PensionInput;
  setPension: (p: PensionInput) => void;
  isSelf: boolean;
}

function PensionEditor({
  kicker,
  startAge,
  setStartAge,
  pension,
  setPension,
  isSelf,
}: PensionEditorProps) {
  const update = (patch: Partial<PensionInput>) => setPension({ ...pension, ...patch });
  const breakdown = calcPension(pension, startAge);
  const adjPct = (breakdown.adjustment - 1) * 100;
  const adjLabel = breakdown.adjustment === 1
    ? "本来支給"
    : breakdown.adjustment > 1
      ? `繰下げ +${adjPct.toFixed(1)}%`
      : `繰上げ ${adjPct.toFixed(1)}%`;

  return (
    <ListItemCard kicker={kicker}>
      <div className="grid grid-cols-1 gap-2">
        <SelectField
          label="入力モード"
          value={pension.mode}
          onChange={(v) => update({ mode: v })}
          options={PEN_MODE_OPTIONS}
        />

        {pension.mode === "auto" ? (
          <>
            <SelectField
              label="被保険者区分"
              value={pension.category}
              onChange={(v) => update({ category: v })}
              options={isSelf ? PEN_CATEGORY_SELF_OPTIONS : PEN_CATEGORY_SPOUSE_OPTIONS}
            />

            {pension.category === "kosei" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                <NumberField
                  label="厚生年金 加入年数"
                  value={pension.koseiYears}
                  onChange={(v) => update({ koseiYears: v })}
                  unit="年"
                  min={0}
                  max={45}
                />
                <NumberField
                  label="厚生年金 平均年収（賞与込み）"
                  value={pension.koseiAvgIncome}
                  onChange={(v) => update({ koseiAvgIncome: v })}
                  unit="円"
                />
              </div>
            ) : null}

            <NumberField
              label="国民年金 納付済月数（満額480）"
              value={pension.kokuminMonths}
              onChange={(v) => update({ kokuminMonths: v })}
              unit="月"
              min={0}
              max={480}
            />

            <NumberField
              label="受給開始年齢（60〜75）"
              value={startAge}
              onChange={setStartAge}
              unit="歳"
              min={60}
              max={75}
            />

            <PensionPreview
              monthly={breakdown.monthly}
              basicMonthly={breakdown.basicMonthly}
              koseiMonthly={breakdown.koseiMonthly}
              adjLabel={adjLabel}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            <NumberField
              label="月額（手取り想定）"
              value={pension.manualMonth}
              onChange={(v) => update({ manualMonth: v })}
              unit="円"
            />
            <NumberField
              label="受給開始年齢（60〜75）"
              value={startAge}
              onChange={setStartAge}
              unit="歳"
              min={60}
              max={75}
            />
          </div>
        )}
      </div>
    </ListItemCard>
  );
}

function PensionPreview({
  monthly,
  basicMonthly,
  koseiMonthly,
  adjLabel,
}: {
  monthly: number;
  basicMonthly: number;
  koseiMonthly: number;
  adjLabel: string;
}) {
  const fmt = (n: number) => `${Math.round(n).toLocaleString("ja-JP")}円`;
  return (
    <div
      className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-1 md:grid-cols-2"
      style={{ background: "#f0f0ee", border: "1.5px dashed #0a0a0a40", borderRadius: 8 }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#66666a]">
          推定 月額
        </span>
        <span className="text-base font-bold tabular-nums text-[#c8383a]">
          {fmt(monthly)}
        </span>
        <span className="text-[9px] tabular-nums text-[#66666a]">
          年額 {fmt(monthly * 12)} ／ {adjLabel}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 text-[10px] tabular-nums text-[#0a0a0a]">
        <span>老齢基礎年金: {fmt(basicMonthly)}/月</span>
        <span>老齢厚生年金: {fmt(koseiMonthly)}/月</span>
      </div>
    </div>
  );
}

export function IncomeMegaSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const updateJob = (i: number, patch: Partial<Job>) =>
    setField("jobs", plan.jobs.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  const addJob = () => setField("jobs", [...plan.jobs, NEW_JOB()]);
  const removeJob = (i: number) => setField("jobs", plan.jobs.filter((_, idx) => idx !== i));

  const updateSide = (i: number, patch: Partial<SideJob>) =>
    setField("sideJobs", plan.sideJobs.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  const addSide = () => setField("sideJobs", [...plan.sideJobs, NEW_SIDE_JOB()]);
  const removeSide = (i: number) => setField("sideJobs", plan.sideJobs.filter((_, idx) => idx !== i));

  return (
    <Section
      id="ch-income"
      no="02"
      title="収入"
      description="給与・副業・年金（現役期〜老後）"
      status={plan.jobs.length > 0 || plan.selfPension.koseiAvgIncome > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-2">
        <CollapsibleSubGroup title="給与・勤務先">
          <div className="flex flex-col gap-3">
            {plan.jobs.map((j, i) => (
              <ListItemCard
                key={i}
                kicker={`JOB ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeJob(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField label="名称" value={j.name} onChange={(v) => updateJob(i, { name: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="年収（額面）"
                      value={j.inc}
                      onChange={(v) => updateJob(i, { inc: v })}
                      unit="円"
                    />
                    <SliderField
                      label="昇給率（年・複利）"
                      value={j.raise ?? 0}
                      onChange={(v) => updateJob(i, { raise: v })}
                      min={0}
                      max={10}
                      step={0.1}
                      hint="年収が毎年この率で上がると仮定"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="入社" value={j.start} onChange={(v) => updateJob(i, { start: v })} unit="歳" />
                    <NumberField label="退職" value={j.end} onChange={(v) => updateJob(i, { end: v })} unit="歳" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="退職金" value={j.sev} onChange={(v) => updateJob(i, { sev: v })} unit="円" />
                    <NumberField label="退職金 受取" value={j.sevAge} onChange={(v) => updateJob(i, { sevAge: v })} unit="歳" />
                  </div>
                </div>
              </ListItemCard>
            ))}
            <AddButton label="勤務先を追加" onClick={addJob} />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="副業" defaultOpen={false}>
          <div className="flex flex-col gap-3">
            {plan.sideJobs.map((j, i) => (
              <ListItemCard
                key={i}
                kicker={`SIDE ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeSide(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField label="名称" value={j.name} onChange={(v) => updateSide(i, { name: v })} />
                  <NumberField label="年収" value={j.inc} onChange={(v) => updateSide(i, { inc: v })} unit="円" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField label="開始年齢" value={j.start} onChange={(v) => updateSide(i, { start: v })} unit="歳" />
                    <NumberField label="終了年齢" value={j.end} onChange={(v) => updateSide(i, { end: v })} unit="歳" />
                  </div>
                </div>
              </ListItemCard>
            ))}
            <AddButton label="副業を追加" onClick={addSide} />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="年金">
          <div className="flex flex-col gap-3">
            <CheckboxField
              label="配偶者分も年金収入に含める"
              value={plan.useSpousePen}
              onChange={(v) => setField("useSpousePen", v)}
            />
            <PensionEditor
              kicker="本人"
              startAge={plan.penStartA}
              setStartAge={(v) => setField("penStartA", v)}
              pension={plan.selfPension}
              setPension={(p) => setField("selfPension", p)}
              isSelf
            />
            {plan.useSpousePen ? (
              <PensionEditor
                kicker="配偶者"
                startAge={plan.penStartB}
                setStartAge={(v) => setField("penStartB", v)}
                pension={plan.spousePension}
                setPension={(p) => setField("spousePension", p)}
                isSelf={false}
              />
            ) : null}
          </div>
        </CollapsibleSubGroup>
      </div>
    </Section>
  );
}
