"use client";

import { useRouter } from "next/navigation";

import type { QuickInput } from "@/lib/calc/quick-types";
import { useQuickStore } from "@/store/quick-store";

type SF = <K extends keyof QuickInput>(key: K, value: QuickInput[K]) => void;
type Q = QuickInput;

const STEPS = ["基本情報", "収入", "資産・住宅", "生活費"];
const TOTAL = STEPS.length;

export default function QuickPage() {
  const router = useRouter();
  const { q, step, setField, setStep } = useQuickStore();

  const next = () => {
    if (step < TOTAL - 1) setStep(step + 1);
    else router.push("/v2/result");
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:py-16">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="h-1.5 w-full rounded-full transition-all duration-300"
              style={{ background: i <= step ? "#0a0a0a" : "#0a0a0a22" }}
            />
            <span
              className="text-[9px] font-bold uppercase tracking-wide transition-colors"
              style={{ color: i === step ? "#0a0a0a" : "#0a0a0a44" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border-2 border-[#0a0a0a] bg-white p-6 sm:p-8">
        {step === 0 && <StepBasic q={q} setField={setField} />}
        {step === 1 && <StepIncome q={q} setField={setField} />}
        {step === 2 && <StepAssets q={q} setField={setField} />}
        {step === 3 && <StepLiving q={q} setField={setField} />}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          className="px-4 text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
          style={{
            height: 40,
            background: step === 0 ? "transparent" : "#fff",
            color: step === 0 ? "transparent" : "#0a0a0a",
            border: step === 0 ? "none" : "2.5px solid #0a0a0a",
            borderRadius: 10,
            pointerEvents: step === 0 ? "none" : "auto",
          }}
        >
          ← 戻る
        </button>

        <span className="text-xs font-bold text-[#0a0a0a]/40">
          {step + 1} / {TOTAL}
        </span>

        <button
          type="button"
          onClick={next}
          className="px-6 text-xs font-bold text-white transition-colors hover:bg-[#0a0a0a]"
          style={{
            height: 40,
            background: step === TOTAL - 1 ? "#c8383a" : "#0a0a0a",
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
          }}
        >
          {step === TOTAL - 1 ? "診断する →" : "次へ →"}
        </button>
      </div>
    </main>
  );
}

/* ─── Step 0: 基本情報 ─── */

function StepBasic({ q, setField }: { q: Q; setField: SF }) {
  const addKid = () => {
    if (q.kidAges.length < 4) setField("kidAges", [...q.kidAges, 5]);
  };
  const removeKid = (i: number) => {
    setField("kidAges", q.kidAges.filter((_, j) => j !== i));
  };
  const setKidAge = (i: number, val: number) => {
    const next = [...q.kidAges];
    next[i] = val;
    setField("kidAges", next);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>あなたと家族について教えてください</SectionTitle>

      <SliderField
        label="あなたの年齢"
        value={q.curAge}
        min={20}
        max={70}
        step={1}
        unit="歳"
        onChange={(v) => setField("curAge", v)}
      />

      <ToggleField
        label="配偶者はいますか？"
        value={q.hasSpouse}
        onChange={(v) => setField("hasSpouse", v)}
      />

      {q.hasSpouse && (
        <SliderField
          label="配偶者の年齢"
          value={q.spouseAge}
          min={20}
          max={70}
          step={1}
          unit="歳"
          onChange={(v) => setField("spouseAge", v)}
        />
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wide text-[#0a0a0a]/60">
            子どもの年齢
          </label>
          {q.kidAges.length < 4 && (
            <button
              type="button"
              onClick={addKid}
              className="text-xs font-bold text-[#0a0a0a]/50 hover:text-[#0a0a0a]"
            >
              + 追加
            </button>
          )}
        </div>

        {q.kidAges.length === 0 ? (
          <p className="text-xs text-[#0a0a0a]/40">子どもなし</p>
        ) : (
          q.kidAges.map((age, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-xs text-[#0a0a0a]/60">子{i + 1}</span>
              <SliderField
                label=""
                value={age}
                min={0}
                max={22}
                step={1}
                unit="歳"
                onChange={(v) => setKidAge(i, v)}
                compact
              />
              <button
                type="button"
                onClick={() => removeKid(i)}
                className="shrink-0 text-xs text-[#0a0a0a]/30 hover:text-[#c8383a]"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Step 1: 収入 ─── */

function StepIncome({ q, setField }: { q: Q; setField: SF }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>収入と退職について教えてください</SectionTitle>

      <SliderField
        label="あなたの手取り年収"
        value={q.selfIncomeNet}
        min={0}
        max={2000}
        step={50}
        unit="万円"
        onChange={(v) => setField("selfIncomeNet", v)}
      />

      {q.hasSpouse && (
        <SliderField
          label="配偶者の手取り年収"
          value={q.spouseIncomeNet}
          min={0}
          max={2000}
          step={50}
          unit="万円"
          onChange={(v) => setField("spouseIncomeNet", v)}
          note="働いていない場合は 0"
        />
      )}

      <SliderField
        label="退職予定年齢"
        value={q.workEndAge}
        min={Math.max(q.curAge + 1, 45)}
        max={80}
        step={1}
        unit="歳"
        onChange={(v) => setField("workEndAge", v)}
      />
    </div>
  );
}

/* ─── Step 2: 資産・住宅 ─── */

function StepAssets({ q, setField }: { q: Q; setField: SF }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>資産と住宅ローンを教えてください</SectionTitle>

      <SliderField
        label="現在の貯蓄・投資総額"
        value={q.totalAssets}
        min={0}
        max={10000}
        step={100}
        unit="万円"
        onChange={(v) => setField("totalAssets", v)}
        note="現金・株・投信・iDeCoなどすべて合計"
      />

      <ToggleField
        label="住宅ローンがありますか？"
        value={q.hasHomeLoan}
        onChange={(v) => setField("hasHomeLoan", v)}
      />

      {q.hasHomeLoan && (
        <>
          <SliderField
            label="ローン残高"
            value={q.hlBal}
            min={0}
            max={10000}
            step={100}
            unit="万円"
            onChange={(v) => setField("hlBal", v)}
          />
          <SliderField
            label="金利（年率）"
            value={q.hlRate}
            min={0.1}
            max={5.0}
            step={0.1}
            unit="%"
            decimals={1}
            onChange={(v) => setField("hlRate", v)}
          />
          <SliderField
            label="残り年数"
            value={q.hlRemainYears}
            min={1}
            max={40}
            step={1}
            unit="年"
            onChange={(v) => setField("hlRemainYears", v)}
          />
        </>
      )}
    </div>
  );
}

/* ─── Step 3: 生活費 ─── */

function StepLiving({ q, setField }: { q: Q; setField: SF }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>生活費の目安を教えてください</SectionTitle>

      <SliderField
        label="現在の月の生活費"
        value={q.livingM}
        min={5}
        max={100}
        step={1}
        unit="万円"
        onChange={(v) => {
          setField("livingM", v);
          if (q.retireLivingM > v) setField("retireLivingM", v);
        }}
        note="住居費・食費・光熱費など全部込み"
      />

      <SliderField
        label="老後の月の生活費（目標）"
        value={q.retireLivingM}
        min={5}
        max={q.livingM}
        step={1}
        unit="万円"
        onChange={(v) => setField("retireLivingM", v)}
        note="退職後に想定するゆとりの生活費"
      />

      <div
        className="rounded-xl p-4 text-xs leading-relaxed"
        style={{ background: "#f0f0ee" }}
      >
        <p className="font-bold text-[#0a0a0a]/70">入力内容のまとめ</p>
        <div className="mt-2 flex flex-col gap-1 text-[#0a0a0a]/60">
          <span>年齢: {q.curAge}歳 / {q.hasSpouse ? `配偶者 ${q.spouseAge}歳` : "独身"}</span>
          <span>子ども: {q.kidAges.length}人{q.kidAges.length > 0 ? `（${q.kidAges.join("・")}歳）` : ""}</span>
          <span>手取り年収: {q.selfIncomeNet}万円{q.hasSpouse && q.spouseIncomeNet > 0 ? ` + 配偶者 ${q.spouseIncomeNet}万円` : ""}</span>
          <span>退職: {q.workEndAge}歳 / 総資産: {q.totalAssets}万円</span>
          {q.hasHomeLoan && <span>ローン残高: {q.hlBal}万円（残 {q.hlRemainYears}年 / {q.hlRate}%）</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Primitives ─── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-[#0a0a0a]">{children}</h2>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals = 0,
  note,
  onChange,
  compact = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
  note?: string;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  const display = decimals > 0 ? value.toFixed(decimals) : value.toLocaleString();

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? "" : ""}`}>
      {label && (
        <div className="flex items-baseline justify-between">
          <label className="text-xs font-bold uppercase tracking-wide text-[#0a0a0a]/60">
            {label}
          </label>
          <span className="text-sm font-bold tabular-nums text-[#0a0a0a]">
            {display}
            <span className="ml-0.5 text-xs font-normal">{unit}</span>
          </span>
        </div>
      )}
      {!label && (
        <div className="flex justify-end">
          <span className="text-sm font-bold tabular-nums text-[#0a0a0a]">
            {display}
            <span className="ml-0.5 text-xs font-normal">{unit}</span>
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#0a0a0a22] accent-[#0a0a0a]"
      />
      {note && <p className="text-[10px] text-[#0a0a0a]/40">{note}</p>}
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-bold uppercase tracking-wide text-[#0a0a0a]/60">
        {label}
      </label>
      <div className="flex gap-1">
        {[true, false].map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className="px-3 text-xs font-bold transition-colors"
            style={{
              height: 30,
              background: value === opt ? "#0a0a0a" : "#fff",
              color: value === opt ? "#fff" : "#0a0a0a",
              border: "2px solid #0a0a0a",
              borderRadius: 8,
            }}
          >
            {opt ? "はい" : "いいえ"}
          </button>
        ))}
      </div>
    </div>
  );
}
