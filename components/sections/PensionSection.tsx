"use client";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { NumberField } from "@/components/inputs/NumberField";
import { SelectField } from "@/components/inputs/SelectField";
import { ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import { calcPension } from "@/lib/calc/pension";
import type {
  PensionCategory,
  PensionInput,
  PensionMode,
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

export function PensionSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const entered =
    plan.selfPension.mode === "manual"
      ? plan.selfPension.manualMonth > 0
      : plan.selfPension.koseiAvgIncome > 0 || plan.selfPension.kokuminMonths > 0;

  return (
    <Section
      id="ch-03"
      no="03"
      title="年金"
      description="老齢基礎年金・老齢厚生年金・繰上げ繰下げ"
      status={entered ? "entered" : "default"}
    >
      <div className="flex flex-col gap-3">
        <PensionEditor
          kicker="本人"
          startAge={plan.penStartA}
          setStartAge={(v) => setField("penStartA", v)}
          pension={plan.selfPension}
          setPension={(p) => setField("selfPension", p)}
          isSelf
        />
        <CheckboxField
          label="配偶者分も年金収入に含める"
          value={plan.useSpousePen}
          onChange={(v) => setField("useSpousePen", v)}
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
    </Section>
  );
}

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
              label="受給開始年齢"
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
