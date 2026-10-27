"use client";

import { useState } from "react";

import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { DateField } from "@/components/v4/inputs/DateField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { TextField } from "@/components/v4/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/v4/ListItemCard";
import { CollapsibleSubGroup } from "@/components/v4/CollapsibleSubGroup";
import { InsuranceCard } from "@/components/v4/InsuranceCard";
import { Section } from "@/components/v4/Section";
import { deathCoverAt, newInsurance, normalizeInsurance, premiumAt } from "@/lib/v4/calc/insurance";
import { kidAge, kidOffset } from "@/lib/v4/calc/age";
import { computeRealEstateValue } from "@/lib/v4/calc/finance";
import type {
  BuildingStructure,
  CareEvent,
  InheritanceEvent,
  JukuMonthly,
  Kid,
  LifeExpenseEvent,
  OtherLoan,
  RealEstateType,
  SchoolType,
} from "@/lib/v4/calc/types";

const HOME_PROP_TYPE_OPTIONS: { value: RealEstateType; label: string }[] = [
  { value: "house", label: "戸建て" },
  { value: "mansion", label: "マンション（区分所有）" },
  { value: "land", label: "土地のみ" },
];

const HOME_STRUCTURE_OPTIONS: { value: BuildingStructure; label: string }[] = [
  { value: "wood", label: "木造（耐用22年）" },
  { value: "lightSteel", label: "軽量鉄骨（27年）" },
  { value: "heavySteel", label: "重量鉄骨（34年）" },
  { value: "rc", label: "RC造（47年）" },
  { value: "src", label: "SRC造（47年）" },
];

const fmtMan = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  return `${sign}${abs.toLocaleString()}万円`;
};
import { usePlanStore } from "@/store/v4/plan-store";

const SCHOOL_OPTIONS: { value: SchoolType; label: string }[] = [
  { value: "pub", label: "公立" },
  { value: "pri", label: "私立" },
];

const UNIV_OPTIONS: { value: SchoolType; label: string }[] = [
  { value: "pub", label: "国公立" },
  { value: "pri", label: "私立" },
  { value: "none", label: "進学しない" },
];

interface JukuPreset {
  key: string;
  label: string;
  desc: string;
  values: JukuMonthly;
}

// 出典: 文部科学省 学校外活動費 / Benesse教育研究所 / 大手塾相場
// 月額(円)・幼児〜浪人。塾＋習い事（英語・スイミング・ピアノ等）を合算した家庭別の典型値
const JUKU_PRESETS: JukuPreset[] = [
  {
    key: "none",
    label: "通塾・習い事なし",
    desc: "塾も習い事もなし",
    values: { pre: 0, e13: 0, e46: 0, jh: 0, hs: 0, ronin: 0 },
  },
  {
    key: "modest",
    label: "控えめ層",
    desc: "習い事1〜2個＋通信教育・公文中心",
    values: { pre: 5_000, e13: 12_000, e46: 20_000, jh: 25_000, hs: 35_000, ronin: 80_000 },
  },
  {
    key: "average",
    label: "全国平均層",
    desc: "習い事複数＋平均的な進学塾を併用",
    values: { pre: 12_000, e13: 18_000, e46: 40_000, jh: 35_000, hs: 50_000, ronin: 100_000 },
  },
  {
    key: "keen",
    label: "教育熱心層",
    desc: "中受・大受対策の進学塾＋習い事を多めに",
    values: { pre: 25_000, e13: 35_000, e46: 80_000, jh: 60_000, hs: 80_000, ronin: 150_000 },
  },
  {
    key: "tokyo",
    label: "東京熱心層",
    desc: "SAPIX・鉄緑会等の有名塾＋複数の習い事",
    values: { pre: 40_000, e13: 60_000, e46: 120_000, jh: 90_000, hs: 120_000, ronin: 200_000 },
  },
];

const NEW_KID = (): Kid => ({
  name: "新しい子",
  birth: "",
  offset: 0,
  s: { k: "pub", e: "pub", j: "pub", h: "pub", u: "pub", g: "none" },
  opt: { ronin: false, dorm: false, send: 50_000 },
});

const NEW_LOAN = (): OtherLoan => ({
  label: "自動車ローン",
  monthlyPay: 30_000,
  remainMonths: 60,
});

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

const NEW_CARE = (): CareEvent => ({
  startAge: 60,
  durationYears: 5,
  monthlyCost: 80_000,
  label: "親A 介護",
});

export function ExpenseMegaSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const [showLivingGuide, setShowLivingGuide] = useState(false);

  const updateLoan = (i: number, patch: Partial<OtherLoan>) =>
    setField("otherLoans", plan.otherLoans.map((ln, idx) => (idx === i ? { ...ln, ...patch } : ln)));
  const addLoan = () => setField("otherLoans", [...plan.otherLoans, NEW_LOAN()]);
  const removeLoan = (i: number) => setField("otherLoans", plan.otherLoans.filter((_, idx) => idx !== i));

  const updateKid = (i: number, patch: Partial<Kid>) => {
    const kids = plan.kids.map((k, idx) => (idx === i ? { ...k, ...patch } : k));
    if (patch.birth !== undefined) {
      kids[i] = { ...kids[i], offset: kidOffset(plan.selfBirth, plan.baseDate, patch.birth) };
    }
    setField("kids", kids);
  };
  const addKid = () => setField("kids", [...plan.kids, NEW_KID()]);
  const removeKid = (i: number) => setField("kids", plan.kids.filter((_, idx) => idx !== i));

  const updateStage = (i: number, key: keyof Kid["s"], value: SchoolType) => {
    const kid = plan.kids[i];
    updateKid(i, { s: { ...kid.s, [key]: value } });
  };
  const updateOpt = <K extends keyof Kid["opt"]>(i: number, key: K, value: Kid["opt"][K]) => {
    const kid = plan.kids[i];
    updateKid(i, { opt: { ...kid.opt, [key]: value } });
  };

  const addIns = () => setField("ins", [...plan.ins, newInsurance("定期保険", plan.curAge, plan.endAge)]);
  const insList = plan.ins.map((p) => normalizeInsurance(p as never, plan.curAge, plan.endAge));
  const insPremNow = insList.reduce((a, p) => a + premiumAt(p, plan.curAge, 1), 0);
  const coverSelf = deathCoverAt(insList, "本人", plan.curAge);
  const coverSpouse = deathCoverAt(insList, "配偶者", plan.curAge);
  const removeIns = (i: number) => setField("ins", plan.ins.filter((_, idx) => idx !== i));

  const updateIncome = (i: number, patch: Partial<InheritanceEvent>) =>
    setField("inheritances", plan.inheritances.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  const addIncome = () => setField("inheritances", [...plan.inheritances, NEW_INCOME()]);
  const removeIncome = (i: number) =>
    setField("inheritances", plan.inheritances.filter((_, idx) => idx !== i));

  const updateExpense = (i: number, patch: Partial<LifeExpenseEvent>) =>
    setField("lifeExpenses", plan.lifeExpenses.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  const addExpense = () => setField("lifeExpenses", [...plan.lifeExpenses, NEW_EXPENSE()]);
  const removeExpense = (i: number) =>
    setField("lifeExpenses", plan.lifeExpenses.filter((_, idx) => idx !== i));

  const updateCare = (i: number, patch: Partial<CareEvent>) =>
    setField("careEvents", plan.careEvents.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  const addCare = () => setField("careEvents", [...plan.careEvents, NEW_CARE()]);
  const removeCare = (i: number) =>
    setField("careEvents", plan.careEvents.filter((_, idx) => idx !== i));

  return (
    <Section
      id="ch-expense"
      no="04"
      title="支出"
      description="生活費・住居・教育・保険・ライフイベント・介護"
      status={plan.livingM > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-2">
        <CollapsibleSubGroup
          title="基本生活費"
          headerExtra={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLivingGuide(!showLivingGuide);
              }}
              aria-label="含めるもの／含めないものを確認"
              title="含めるもの／含めないものを確認"
              className="inline-flex h-6 w-6 items-center justify-center text-[12px] font-bold text-white transition-colors hover:opacity-80"
              style={{
                background: showLivingGuide ? "#a07900" : "#d4a017",
                borderRadius: "50%",
              }}
            >
              !
            </button>
          }
        >
          {showLivingGuide && (
            <div
              className="rounded-lg p-3"
              style={{ background: "#fff8e7", border: "1.5px solid #d4a017" }}
            >
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a07900]">
                ⚠ 重複入力を防ぐため、ここに含めるもの／含めないものを確認
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10px] font-bold text-[#22863a]">✓ 含める</p>
                  <ul className="text-[10px] leading-relaxed text-[#0a0a0a]/75">
                    <li>・食費・外食</li>
                    <li>・水道光熱費</li>
                    <li>・通信費（スマホ・ネット）</li>
                    <li>・日用品・被服費</li>
                    <li>・交通費・ガソリン代</li>
                    <li>・娯楽・サブスク・交際費</li>
                    <li>・医療費（保険適用範囲）</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold text-[#c8383a]">✗ 含めない（別項目で入力）</p>
                  <ul className="text-[10px] leading-relaxed text-[#0a0a0a]/75">
                    <li>・家賃・住宅ローン → 住居</li>
                    <li>・保険料 → 保険</li>
                    <li>・教育費・塾代 → 教育費</li>
                    <li>・投信/株/NISA積立 → 資産・運用</li>
                    <li>・介護費用 → 介護費用</li>
                    <li>・ライフイベント → ライフイベント</li>
                    <li>・自動車/奨学金返済 → その他ローン</li>
                  </ul>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[#0a0a0a]/55">
                参考: 単身 12〜18万 / 夫婦 22〜30万 / 子あり世帯 28〜40万（家賃・教育費除く・月額）
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2">
            <NumberField
              label="基本支出(月)"
              value={plan.livingM}
              onChange={(v) => setField("livingM", v)}
              unit="円"
            />
            <NumberField
              label="特別費(年)"
              value={plan.specialY}
              onChange={(v) => setField("specialY", v)}
              unit="円"
              hint="年に数回発生する出費（旅行・家電買替・冠婚葬祭・ふるさと納税等）。住居・保険・教育費とは別。"
            />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="住居">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
              <NumberField
                label="家賃/管理費(月)"
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
            <CheckboxField
              label="持ち家（自宅を所有している）"
              value={plan.homeOwned ?? plan.useHomeLoan}
              onChange={(v) => setField("homeOwned", v)}
            />
            {plan.homeOwned && (
              <div
                className="flex flex-col gap-2 rounded-lg p-3"
                style={{ background: "#f0f7ff", border: "1.5px solid #3b82f640" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/65">
                  自宅の評価額（BSの資産側に計上）
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <SelectField
                    label="物件種別"
                    value={plan.homePropType ?? "house"}
                    onChange={(v) => setField("homePropType", v)}
                    options={HOME_PROP_TYPE_OPTIONS}
                  />
                  {(plan.homePropType ?? "house") === "house" ? (
                    <SelectField
                      label="建物構造"
                      value={plan.homeStructure ?? "wood"}
                      onChange={(v) => setField("homeStructure", v)}
                      options={HOME_STRUCTURE_OPTIONS}
                    />
                  ) : (
                    <div />
                  )}
                </div>
                {(plan.homePropType ?? "house") !== "land" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="築年（西暦）"
                      value={plan.homeBuiltYear ?? new Date().getFullYear()}
                      onChange={(v) => setField("homeBuiltYear", v)}
                      unit="年"
                      hint={`築${Math.max(0, new Date().getFullYear() - (plan.homeBuiltYear ?? new Date().getFullYear()))}年`}
                    />
                    <NumberField
                      label="購入価格"
                      value={plan.homePurchasePrice ?? 0}
                      onChange={(v) => setField("homePurchasePrice", v)}
                      unit="円"
                      hint="諸費用込みの取得時総額"
                    />
                  </div>
                ) : (
                  <NumberField
                    label="購入価格"
                    value={plan.homePurchasePrice ?? 0}
                    onChange={(v) => setField("homePurchasePrice", v)}
                    unit="円"
                  />
                )}
                {(plan.homePropType ?? "house") === "house" && (
                  <NumberField
                    label="土地価格比率"
                    value={plan.homeLandRatio ?? 50}
                    onChange={(v) => setField("homeLandRatio", v)}
                    unit="%"
                    hint="購入価格のうち土地が占める割合"
                  />
                )}
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const estimatedHomeValue = computeRealEstateValue(
                    {
                      name: "自宅",
                      rent: 0,
                      cost: 0,
                      propTax: 0,
                      bal: 0,
                      rate: 0,
                      term: 0,
                      start: 0,
                      propType: plan.homePropType ?? "house",
                      structure: plan.homeStructure ?? "wood",
                      builtYear: plan.homeBuiltYear ?? currentYear,
                      purchasePrice: plan.homePurchasePrice ?? 0,
                      landRatio: plan.homeLandRatio ?? 50,
                      currentValueOverride: plan.homeCurrentValueOverride ?? 0,
                    },
                    currentYear,
                  );
                  const useOverride = (plan.homeCurrentValueOverride ?? 0) > 0;
                  return (
                    <div
                      className="rounded-lg p-2"
                      style={{
                        background: useOverride ? "#fff8e7" : "#f0fff4",
                        border: `1.5px solid ${useOverride ? "#d4a017" : "#22863a"}40`,
                      }}
                    >
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: useOverride ? "#a07900" : "#22863a" }}
                        >
                          {useOverride ? "現在評価額（手動指定）" : "推定現在評価額"}
                        </span>
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{ color: useOverride ? "#a07900" : "#22863a" }}
                        >
                          {fmtMan(estimatedHomeValue)}
                        </span>
                      </div>
                      <NumberField
                        label="現在評価額（手動上書き・空欄=自動）"
                        value={plan.homeCurrentValueOverride ?? 0}
                        onChange={(v) => setField("homeCurrentValueOverride", v)}
                        unit="円"
                      />
                    </div>
                  );
                })()}
              </div>
            )}
            <CheckboxField
              label="住宅ローンあり"
              value={plan.useHomeLoan}
              onChange={(v) => setField("useHomeLoan", v)}
            />
            {plan.useHomeLoan ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="ローン残高"
                    value={plan.hlBal}
                    onChange={(v) => setField("hlBal", v)}
                    unit="円"
                  />
                  <PercentField
                    label="金利"
                    value={plan.hlRate}
                    onChange={(v) => setField("hlRate", v)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="返済開始"
                    value={plan.hlStart}
                    onChange={(v) => setField("hlStart", v)}
                    unit="歳"
                  />
                  <NumberField
                    label="ローン期間"
                    value={plan.hlTerm}
                    onChange={(v) => setField("hlTerm", v)}
                    unit="年"
                  />
                </div>
                <CheckboxField
                  label="住宅ローン控除を受けている"
                  value={plan.hlDeduct}
                  onChange={(v) => setField("hlDeduct", v)}
                  hint="年末残高×0.7%を所得税（引ききれない分は住民税）から差し引く"
                />
                {plan.hlDeduct ? (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="控除が終わる年齢"
                      value={plan.hlDeductEndAge}
                      onChange={(v) => setField("hlDeductEndAge", v)}
                      unit="歳"
                      hint="新築は入居から13年、中古は10年（省エネ中古は13年）"
                    />
                    <NumberField
                      label="借入限度額"
                      value={plan.hlDeductLimit}
                      onChange={(v) => setField("hlDeductLimit", v)}
                      unit="円"
                      hint="新築・2026年入居: 長期優良4,500万／ZEH3,500万／省エネ2,000万"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                — その他ローン（自動車・奨学金など）
              </div>
              <div className="flex flex-col gap-3">
                {plan.otherLoans.map((ln, i) => (
                  <ListItemCard
                    key={i}
                    kicker={`LOAN ${String(i + 1).padStart(2, "0")}`}
                    onRemove={() => removeLoan(i)}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      <TextField
                        label="名称"
                        value={ln.label}
                        onChange={(v) => updateLoan(i, { label: v })}
                      />
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
            </div>
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="教育費" defaultOpen={false}>
          <div className="flex flex-col gap-4">
            <CheckboxField
              label="児童手当を収入に含める"
              value={plan.childAllowance}
              onChange={(v) => setField("childAllowance", v)}
              hint="0〜2歳 月1.5万／3歳〜高校生 月1万／第3子以降 月3万（所得制限なし）"
            />
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                — 塾・習い事の月額（モデルケースから選んで自動入力）
              </div>
              <div className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {JUKU_PRESETS.map((p) => {
                  const matches =
                    plan.jukuM.pre === p.values.pre &&
                    plan.jukuM.e13 === p.values.e13 &&
                    plan.jukuM.e46 === p.values.e46 &&
                    plan.jukuM.jh === p.values.jh &&
                    plan.jukuM.hs === p.values.hs &&
                    plan.jukuM.ronin === p.values.ronin;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setField("jukuM", p.values)}
                      className="flex flex-col gap-0.5 px-3 py-2 text-left transition-colors"
                      style={{
                        border: matches ? "2.5px solid #c8383a" : "2px solid #0a0a0a25",
                        background: matches ? "#fff0f0" : "#ffffff",
                        borderRadius: 8,
                      }}
                    >
                      <span className="text-[11px] font-bold text-[#0a0a0a]">{p.label}</span>
                      <span className="text-[9px] leading-tight text-[#0a0a0a]/55">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mb-2 text-[9px] leading-relaxed text-[#0a0a0a]/50">
                ※ プリセット選択後、各段階の数値を個別に編集できます。出典: 文部科学省 学校外活動費 / Benesse教育研究所 / 大手塾相場
              </p>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="幼児(3-5)"
                  value={plan.jukuM.pre}
                  onChange={(v) => setField("jukuM", { ...plan.jukuM, pre: v })}
                  unit="円"
                />
                <NumberField
                  label="小1-3"
                  value={plan.jukuM.e13}
                  onChange={(v) => setField("jukuM", { ...plan.jukuM, e13: v })}
                  unit="円"
                />
                <NumberField
                  label="小4-6"
                  value={plan.jukuM.e46}
                  onChange={(v) => setField("jukuM", { ...plan.jukuM, e46: v })}
                  unit="円"
                />
                <NumberField
                  label="中学"
                  value={plan.jukuM.jh}
                  onChange={(v) => setField("jukuM", { ...plan.jukuM, jh: v })}
                  unit="円"
                />
                <NumberField
                  label="高校"
                  value={plan.jukuM.hs}
                  onChange={(v) => setField("jukuM", { ...plan.jukuM, hs: v })}
                  unit="円"
                />
                <NumberField
                  label="浪人"
                  value={plan.jukuM.ronin}
                  onChange={(v) => setField("jukuM", { ...plan.jukuM, ronin: v })}
                  unit="円"
                />
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                — お子さま
              </div>
              <div className="flex flex-col gap-3">
                {plan.kids.map((k, i) => {
                  const ca = kidAge(k.birth, plan.baseDate);
                  return (
                    <ListItemCard
                      key={i}
                      kicker={`KID ${String(i + 1).padStart(2, "0")}`}
                      onRemove={() => removeKid(i)}
                    >
                      <div className="grid grid-cols-1 gap-2">
                        <TextField
                          label="名前"
                          value={k.name}
                          onChange={(v) => updateKid(i, { name: v })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <DateField
                            label="生年月日"
                            value={k.birth}
                            onChange={(v) => updateKid(i, { birth: v })}
                          />
                          <NumberField
                            label="現在年齢"
                            value={ca ?? 0}
                            onChange={() => {}}
                            unit="歳"
                            hint="生年月日から自動"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                          — 進学プラン（公立 / 私立 / 進学しない）
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <SelectField
                            label="幼稚園"
                            value={k.s.k}
                            onChange={(v) => updateStage(i, "k", v)}
                            options={SCHOOL_OPTIONS}
                          />
                          <SelectField
                            label="小学校"
                            value={k.s.e}
                            onChange={(v) => updateStage(i, "e", v)}
                            options={SCHOOL_OPTIONS}
                          />
                          <SelectField
                            label="中学"
                            value={k.s.j}
                            onChange={(v) => updateStage(i, "j", v)}
                            options={SCHOOL_OPTIONS}
                          />
                          <SelectField
                            label="高校"
                            value={k.s.h}
                            onChange={(v) => updateStage(i, "h", v)}
                            options={SCHOOL_OPTIONS}
                          />
                          <SelectField
                            label="大学"
                            value={k.s.u}
                            onChange={(v) => updateStage(i, "u", v)}
                            options={UNIV_OPTIONS}
                          />
                          <SelectField
                            label="大学院"
                            value={k.s.g ?? "none"}
                            onChange={(v) => updateStage(i, "g", v)}
                            options={UNIV_OPTIONS}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                          — オプション
                        </div>
                        <div className="flex flex-col gap-2">
                          <CheckboxField
                            label="浪人を経て1年遅れで進学"
                            value={k.opt.ronin}
                            onChange={(v) => updateOpt(i, "ronin", v)}
                          />
                          <CheckboxField
                            label="下宿（大学・大学院期間中）"
                            value={k.opt.dorm ?? false}
                            onChange={(v) => updateOpt(i, "dorm", v)}
                          />
                          {k.opt.dorm ? (
                            <div
                              className="rounded-lg p-3"
                              style={{ background: "#f0f7ff", border: "1.5px solid #3b82f640" }}
                            >
                              <p className="mb-2 text-[10px] leading-relaxed text-[#0a0a0a]/65">
                                💡 下宿先への月々の仕送り（家賃・食費補助等）。下宿期間中のみ計算に反映されます。参考: 月5〜10万円が一般的
                              </p>
                              <NumberField
                                label="仕送り(月)"
                                value={k.opt.send}
                                onChange={(v) => updateOpt(i, "send", v)}
                                unit="円"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </ListItemCard>
                  );
                })}
                <AddButton label="お子さまを追加" onClick={addKid} />
              </div>
            </div>
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="保険" defaultOpen={false}>
          <div className="flex flex-col gap-3">
            {insList.length ? (
              <div className="rounded-lg bg-white px-3 py-2 text-[11px] leading-relaxed tabular-nums" style={{ border: "1.5px solid #0a0a0a20" }}>
                <p className="font-bold">いまの保険料 年{Math.round(insPremNow / 10000).toLocaleString()}万円（月{Math.round(insPremNow / 12 / 1000) / 10}万円）</p>
                <p>
                  本人が亡くなったら 死亡保険金{Math.round(coverSelf.lump / 10000).toLocaleString()}万円
                  {coverSelf.incomeProtM > 0 ? `＋収入保障 月${Math.round(coverSelf.incomeProtM / 1000) / 10}万円` : ""}
                </p>
                {plan.spouseBirth ? (
                  <p>
                    配偶者が亡くなったら 死亡保険金{Math.round(coverSpouse.lump / 10000).toLocaleString()}万円
                    {coverSpouse.incomeProtM > 0 ? `＋収入保障 月${Math.round(coverSpouse.incomeProtM / 1000) / 10}万円` : ""}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-[#0a0a0a]/60">
                保険証券や設計書を見ながら、1件ずつ入れてください。種類を選ぶと、その保険に合った入力欄に変わります。
              </p>
            )}
            {insList.map((p, i) => (
              <InsuranceCard
                key={i}
                p={p}
                index={i}
                curAge={plan.curAge}
                endAge={plan.endAge}
                kids={plan.kids}
                onChange={(patch) => setField("ins", insList.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))}
                onRemove={() => removeIns(i)}
              />
            ))}
            <AddButton label="保険を追加" onClick={addIns} />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="ライフイベント（一時収支）" defaultOpen={false}>
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                — 一時収入（相続・贈与・保険金）
              </div>
              <div className="flex flex-col gap-3">
                {plan.inheritances.map((ev, i) => (
                  <ListItemCard
                    key={i}
                    kicker={`INCOME ${String(i + 1).padStart(2, "0")}`}
                    onRemove={() => removeIncome(i)}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      <TextField
                        label="名称"
                        value={ev.label}
                        onChange={(v) => updateIncome(i, { label: v })}
                      />
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
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                — 一時支出（リフォーム・車・慶弔など）
              </div>
              <p className="mb-2 px-1 text-[11px] leading-relaxed text-[#0a0a0a]/55">
                参考: リフォーム 100〜500万 / 車買替 200〜400万 / 結婚式 300万 / 葬儀 200万
              </p>
              <div className="flex flex-col gap-3">
                {plan.lifeExpenses.map((ev, i) => (
                  <ListItemCard
                    key={i}
                    kicker={`EXPENSE ${String(i + 1).padStart(2, "0")}`}
                    onRemove={() => removeExpense(i)}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      <TextField
                        label="名称"
                        value={ev.label}
                        onChange={(v) => updateExpense(i, { label: v })}
                      />
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
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="介護費用" defaultOpen={false}>
          {plan.careEvents.length === 0 ? (
            <p className="mb-2 px-1 text-[11px] leading-relaxed text-[#0a0a0a]/55">
              参考: 在宅介護 月平均8万円 / 施設介護 月平均13万円 / 介護期間平均 約5年
            </p>
          ) : null}
          <div className="flex flex-col gap-3">
            {plan.careEvents.map((ev, i) => (
              <ListItemCard
                key={i}
                kicker={`CARE ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeCare(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField
                    label="名称"
                    value={ev.label}
                    onChange={(v) => updateCare(i, { label: v })}
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField
                      label="開始年齢（本人基準）"
                      value={ev.startAge}
                      onChange={(v) => updateCare(i, { startAge: v })}
                      unit="歳"
                    />
                    <NumberField
                      label="期間"
                      value={ev.durationYears}
                      onChange={(v) => updateCare(i, { durationYears: v })}
                      unit="年"
                    />
                  </div>
                  <NumberField
                    label="月額"
                    value={ev.monthlyCost}
                    onChange={(v) => updateCare(i, { monthlyCost: v })}
                    unit="円"
                  />
                </div>
              </ListItemCard>
            ))}
            <AddButton label="介護イベントを追加" onClick={addCare} />
          </div>
        </CollapsibleSubGroup>
      </div>
    </Section>
  );
}
