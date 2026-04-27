"use client";

import { useState } from "react";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { DateField } from "@/components/inputs/DateField";
import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { SelectField } from "@/components/inputs/SelectField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { CollapsibleSubGroup } from "@/components/CollapsibleSubGroup";
import { Section } from "@/components/Section";
import { kidAge, kidOffset } from "@/lib/calc/age";
import type {
  CareEvent,
  InheritanceEvent,
  Insurance,
  InsuranceType,
  Insured,
  JukuMonthly,
  Kid,
  LifeExpenseEvent,
  OtherLoan,
  SchoolType,
} from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

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
// 月額(円)・幼児〜浪人。家庭の教育投資レベル別の典型値
const JUKU_PRESETS: JukuPreset[] = [
  {
    key: "none",
    label: "通塾なし",
    desc: "通信教育・公文等もなし",
    values: { pre: 0, e13: 0, e46: 0, jh: 0, hs: 0, ronin: 0 },
  },
  {
    key: "modest",
    label: "控えめ層",
    desc: "公文・通信教育中心",
    values: { pre: 0, e13: 3_000, e46: 8_000, jh: 15_000, hs: 20_000, ronin: 50_000 },
  },
  {
    key: "average",
    label: "全国平均層",
    desc: "受験対策や習い事を含む全国平均",
    values: { pre: 2_000, e13: 8_000, e46: 20_000, jh: 25_000, hs: 30_000, ronin: 80_000 },
  },
  {
    key: "keen",
    label: "教育熱心層",
    desc: "中受・大受対策を本格化",
    values: { pre: 8_000, e13: 20_000, e46: 50_000, jh: 40_000, hs: 50_000, ronin: 100_000 },
  },
  {
    key: "tokyo",
    label: "東京熱心層",
    desc: "有名塾フル活用（鉄緑会・SAPIX等）",
    values: { pre: 15_000, e13: 35_000, e46: 80_000, jh: 60_000, hs: 80_000, ronin: 150_000 },
  },
];

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

  const updateIns = (i: number, patch: Partial<Insurance>) =>
    setField("ins", plan.ins.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const addIns = () =>
    setField("ins", [
      ...plan.ins,
      {
        name: "新しい保険",
        type: "生命（死亡・収入保障）" as InsuranceType,
        insured: "本人" as Insured,
        premM: 0,
        start: plan.curAge,
        end: plan.endAge,
        memo: "",
        enabled: true,
      },
    ]);
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
        <CollapsibleSubGroup title="基本生活費">
          <button
            type="button"
            onClick={() => setShowLivingGuide(!showLivingGuide)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#fff8e7]"
            style={{ border: "1.5px solid #d4a017", background: showLivingGuide ? "#fff8e7" : "#fffdf6" }}
          >
            <span
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-bold text-white"
              style={{ background: "#d4a017", borderRadius: "50%" }}
            >
              !
            </span>
            <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a07900]">
              ここに含めるもの／含めないものを確認
            </span>
            <span
              className="text-[10px] font-bold text-[#a07900] transition-transform"
              style={{ display: "inline-block", transform: showLivingGuide ? "rotate(180deg)" : "none" }}
            >
              ▾
            </span>
          </button>
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
              label="住宅ローンあり"
              value={plan.useHomeLoan}
              onChange={(v) => setField("useHomeLoan", v)}
            />
            {plan.useHomeLoan ? (
              <div className="grid grid-cols-1 gap-2">
                <NumberField
                  label="残高"
                  value={plan.hlBal}
                  onChange={(v) => setField("hlBal", v)}
                  unit="円"
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                  <PercentField
                    label="金利"
                    value={plan.hlRate}
                    onChange={(v) => setField("hlRate", v)}
                  />
                  <NumberField
                    label="期間"
                    value={plan.hlTerm}
                    onChange={(v) => setField("hlTerm", v)}
                    unit="年"
                  />
                </div>
                <NumberField
                  label="返済開始年齢"
                  value={plan.hlStart}
                  onChange={(v) => setField("hlStart", v)}
                  unit="歳"
                />
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
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                — 塾の月額（モデルケースから選んで自動入力）
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
            {plan.ins.map((p, i) => (
              <ListItemCard
                key={i}
                kicker={`POLICY ${String(i + 1).padStart(2, "0")}${p.enabled ? "" : " · OFF"}`}
                onRemove={() => removeIns(i)}
              >
                <div className="mb-3">
                  <CheckboxField
                    label="この保険を計算に含める"
                    value={p.enabled}
                    onChange={(v) => updateIns(i, { enabled: v })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <TextField
                    label="保険名"
                    value={p.name}
                    onChange={(v) => updateIns(i, { name: v })}
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <SelectField
                      label="種類"
                      value={p.type}
                      onChange={(v) => updateIns(i, { type: v })}
                      options={TYPE_OPTIONS}
                    />
                    <SelectField
                      label="被保険者"
                      value={p.insured}
                      onChange={(v) => updateIns(i, { insured: v })}
                      options={INSURED_OPTIONS}
                    />
                  </div>
                  <NumberField
                    label="月額保険料"
                    value={p.premM}
                    onChange={(v) => updateIns(i, { premM: v })}
                    unit="円"
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField
                      label="払込開始"
                      value={p.start}
                      onChange={(v) => updateIns(i, { start: v })}
                      unit="歳"
                    />
                    <NumberField
                      label="払込終了"
                      value={p.end}
                      onChange={(v) => updateIns(i, { end: v })}
                      unit="歳"
                    />
                  </div>
                  <TextField
                    label="メモ（計算非対象）"
                    value={p.memo}
                    onChange={(v) => updateIns(i, { memo: v })}
                  />
                </div>
              </ListItemCard>
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
