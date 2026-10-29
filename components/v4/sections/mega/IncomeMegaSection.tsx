"use client";

import { useContext, useMemo } from "react";

import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { TextField } from "@/components/v4/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/v4/ListItemCard";
import { CollapsibleSubGroup } from "@/components/v4/CollapsibleSubGroup";
import { Section, TabModeContext } from "@/components/v4/Section";
import { calcPension } from "@/lib/v4/calc/pension";
import { sevPlanOf, simulate } from "@/lib/v4/calc/simulate";
import { taishokuShotokuKojo } from "@/lib/v4/calc/tax";
import type {
  Job,
  PlanInput,
  PensionCategory,
  PensionInput,
  PensionMode,
  SideJob,
} from "@/lib/v4/calc/types";
import { usePlanStore } from "@/store/v4/plan-store";

const PEN_MODE_OPTIONS: { value: PensionMode; label: string }[] = [
  { value: "auto", label: "自動計算（推奨）" },
  { value: "manual", label: "手動指定" },
];

const PEN_CATEGORY_SELF_OPTIONS: { value: PensionCategory; label: string }[] = [
  { value: "kosei", label: "2号 会社員・公務員（厚生年金 + 国民年金）" },
  { value: "kokumin", label: "1号 自営業・フリーランス（国民年金のみ）" },
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
              <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-1 md:grid-cols-2">
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
      className="grid grid-cols-1 gap-2 p-2 md:grid-cols-2"
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
        <span className="whitespace-nowrap">老齢基礎年金: {fmt(basicMonthly)}/月</span>
        <span className="whitespace-nowrap">老齢厚生年金: {fmt(koseiMonthly)}/月</span>
      </div>
    </div>
  );
}

const SEV_METHOD_OPTIONS: { value: "lump" | "annuity" | "mix"; label: string }[] = [
  { value: "lump", label: "一時金でまとめて受け取る" },
  { value: "annuity", label: "年金（分割）で受け取る" },
  { value: "mix", label: "一部を一時金、残りを年金" },
];

// 退職金の受け取り方を選び、3通りの「受取総額」と「税・社会保険を引いた手取り」を比べる
function SeverancePicker({ plan, index, update }: { plan: PlanInput; index: number; update: (p: Partial<Job>) => void }) {
  const j = plan.jobs[index];
  const method = j.sevMethod ?? "lump";
  const cmp = useMemo(() => {
    const withJob = (o: Partial<Job>): PlanInput => ({ ...plan, jobs: plan.jobs.map((x, k) => (k === index ? { ...x, ...o } : x)) });
    const cost = (r: ReturnType<typeof simulate>) => r.rows.reduce((a, x) => a + x.taxWage + x.sevTax, 0);
    const none = cost(simulate(withJob({ sev: 0 })));
    const one = (o: Partial<Job>) => {
      const p = withJob(o);
      const sp = sevPlanOf(p.jobs[index]);
      const extra = cost(simulate(p)) - none;
      return { total: sp.total, net: sp.total - extra, extra };
    };
    const yrs = j.sevYears ?? 10;
    const rate = j.sevRate ?? 1.5;
    return [
      { key: "lump", label: "一時金", ...one({ sevMethod: "lump" }) },
      { key: "annuity", label: `年金（${yrs}年）`, ...one({ sevMethod: "annuity", sevYears: yrs, sevRate: rate }) },
      { key: "mix", label: `一部年金（一時金${j.sevLumpPct ?? 50}%）`, ...one({ sevMethod: "mix", sevYears: yrs, sevRate: rate, sevLumpPct: j.sevLumpPct ?? 50 }) },
    ];
  }, [plan, index, j.sevYears, j.sevRate, j.sevLumpPct]);
  const best = cmp.reduce((a, b) => (b.net > a.net ? b : a));
  const man = (v: number) => `${Math.round(v / 10000).toLocaleString()}万円`;

  return (
    <div className="flex flex-col gap-2 rounded-lg p-2.5" style={{ background: "#f0f0ee", border: "1.5px solid #0a0a0a20" }}>
      <SelectField label="退職金の受け取り方" value={method} onChange={(v) => update({ sevMethod: v })} options={SEV_METHOD_OPTIONS} />
      {method !== "lump" ? (
        <div className="grid grid-cols-2 items-start gap-2">
          <NumberField label="年金で受け取る年数" value={j.sevYears ?? 10} onChange={(v) => update({ sevYears: v })} unit="年" min={1} max={30} />
          <PercentField
            label="給付利率(年)"
            value={j.sevRate ?? 1.5}
            onChange={(v) => update({ sevRate: v })}
            hint="会社の規程で年1〜3%程度が多い。分割中も残りに利息がつく"
          />
          {method === "mix" ? (
            <PercentField label="一時金の割合" value={j.sevLumpPct ?? 50} onChange={(v) => update({ sevLumpPct: v })} step={10} min={0} max={100} />
          ) : null}
        </div>
      ) : null}
      <ul className="flex flex-col gap-1">
        {cmp.map((c) => {
          const selected = c.key === method;
          return (
            <li
              key={c.key}
              className="rounded-md bg-white px-2.5 py-2"
              style={{ border: selected ? "2px solid #0a0a0a" : "1px solid #0a0a0a20" }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] font-bold">{c.label}</span>
                {selected ? <span className="text-[9px] text-[#0a0a0a]/55">選択中</span> : null}
                {c.key === best.key ? (
                  <span className="rounded px-1 text-[9px] font-bold text-white" style={{ background: "#22863a" }}>
                    手取り最大
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[11px] tabular-nums text-[#0a0a0a]/75">
                <span>受取 {man(c.total)}</span>
                <span>− 税・社保 {man(Math.max(0, c.extra))}</span>
                <span>
                  ＝ 手取り <b className="text-[13px] text-[#0a0a0a]">{man(c.net)}</b>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-relaxed text-[#0a0a0a]/60">
        一時金は「退職所得」として勤続年数に応じた控除があり（この勤務先は勤続{Math.max(1, j.end - j.start)}年で{man(taishokuShotokuKojo(Math.max(1, j.end - j.start)))}まで非課税）、超えた分も半分にしてから課税されるので、税金が軽く済むことが多いです。
        年金は利息がつく分だけ総額は増えますが、毎年ほかの年金と合わせて課税され、国民健康保険・介護保険の保険料も上がります。
        「税・社保」は、この退職金があることで一生のあいだに増える税金と社会保険料の合計です。
      </p>
    </div>
  );
}

export function IncomeMegaSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  // ver5: 配偶者が「いない」ときは配偶者の年金欄を出さない（ver4 はこれまでどおり出す）
  const hasSpouse = !useContext(TabModeContext) || !!plan.spouseBirth;

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
                      hint={j.start <= plan.curAge ? "今の勤務先は今年の年収" : "入社した年の年収"}
                    />
                    <PercentField
                      label="昇給率（年・複利）"
                      value={j.raise ?? 0}
                      onChange={(v) => updateJob(i, { raise: v })}
                      min={0}
                      max={20}
                      step={0.1}
                      hint="年収が毎年この率で上がると仮定"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="入社年齢" value={j.start} onChange={(v) => updateJob(i, { start: v })} unit="歳" />
                    <NumberField label="退社年齢" value={j.end} onChange={(v) => updateJob(i, { end: v })} unit="歳" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="退職金" value={j.sev} onChange={(v) => updateJob(i, { sev: v })} unit="円" hint="退職所得（勤続年数の控除＋1/2課税）で計算" />
                    <NumberField label="退職金 受取" value={j.sevAge} onChange={(v) => updateJob(i, { sevAge: v })} unit="歳" />
                  </div>
                  {j.sev > 0 ? <SeverancePicker plan={plan} index={i} update={(p) => updateJob(i, p)} /> : null}
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
                  <NumberField label="年間の所得（売上−経費）" value={j.inc} onChange={(v) => updateSide(i, { inc: v })} unit="円" hint="雑所得・事業所得として本業と合算して課税" />
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
            {hasSpouse ? (
              <CheckboxField
                label="配偶者分も年金収入に含める"
                value={plan.useSpousePen}
                onChange={(v) => setField("useSpousePen", v)}
              />
            ) : null}
            <PercentField
              label="年金額の改定率（年）"
              value={plan.penIndex ?? 0}
              onChange={(v) => setField("penIndex", v)}
              step={0.1}
              hint={`物価・賃金に連動するが、マクロ経済スライドで物価（${plan.infl.toFixed(1)}%）より低めに改定されるのが基本。2026年度は+1.9%`}
            />
            <PensionEditor
              kicker="本人"
              startAge={plan.penStartA}
              setStartAge={(v) => setField("penStartA", v)}
              pension={plan.selfPension}
              setPension={(p) => setField("selfPension", p)}
              isSelf
            />
            {plan.useSpousePen && hasSpouse ? (
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
