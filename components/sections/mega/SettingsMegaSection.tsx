"use client";

import { useEffect, useMemo } from "react";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { DateField } from "@/components/inputs/DateField";
import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { SelectField } from "@/components/inputs/SelectField";
import { CollapsibleSubGroup } from "@/components/CollapsibleSubGroup";
import { Section } from "@/components/Section";
import { ageOn } from "@/lib/calc/age";
import type { DrawAsset, DrawOrderMode } from "@/lib/calc/types";
import { calcDetailedTaxV2 } from "@/lib/calc/tax";
import { usePlanStore } from "@/store/plan-store";

const fmtMan = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  return `${sign}${abs.toLocaleString()}万`;
};

const SPOUSE_WORK_OPTIONS = [
  { value: "work" as const, label: "就労中" },
  { value: "none" as const, label: "就労なし" },
];

const DRAW_ORDER_OPTIONS: { value: DrawOrderMode; label: string }[] = [
  { value: "auto-tiered", label: "自動（年齢別に最適化）" },
  { value: "fund-stock-crypto", label: "投信→株→仮想通貨" },
  { value: "stock-fund-crypto", label: "株→投信→仮想通貨" },
  { value: "custom", label: "カスタム順序" },
];

const DRAW_LABEL: Record<DrawAsset, string> = {
  f: "投信",
  s: "株",
  k: "仮想通貨",
  g: "金・コモディティ",
  dc: "確定拠出年金",
};

function AgeDisplay({ birth }: { birth: string }) {
  const age = ageOn(birth, undefined);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">現在年齢</span>
      <div
        className="flex items-center justify-end px-2 py-1.5 text-xs font-bold tabular-nums text-[#0a0a0a]/50"
        style={{ border: "2px solid #0a0a0a25", borderRadius: 8, background: "#f0f0ee" }}
      >
        {age !== null ? `${age} 歳` : "—"}
      </div>
    </div>
  );
}

export function SettingsMegaSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const patch = usePlanStore((s) => s.patch);

  useEffect(() => {
    const a = ageOn(plan.selfBirth, undefined);
    if (a !== null && a !== plan.curAge) patch({ curAge: a });
  }, [plan.selfBirth, plan.curAge, patch]);

  const detailed = plan.taxMode === "detailed";

  const sample = useMemo(() => {
    const selfWageY = plan.jobs.reduce((acc, j) => {
      return j.start <= plan.curAge && plan.curAge < j.end ? acc + j.inc : acc;
    }, 0) + plan.sideJobs.reduce((acc, j) => {
      return j.start <= plan.curAge && plan.curAge < j.end ? acc + j.inc : acc;
    }, 0);
    const spouseAge = ageOn(plan.spouseBirth, undefined);
    const spouseWageY = plan.spouseWork === "work"
      && spouseAge !== null
      && spouseAge >= plan.spouseIncStart
      && spouseAge < plan.spouseIncEnd
      ? plan.spouseIncY
      : 0;
    const kidAgesNow: number[] = plan.kids
      .map((k) => plan.curAge - k.offset)
      .filter((a) => a >= 0);

    return calcDetailedTaxV2(
      {
        selfWageY,
        spouseWageY,
        selfPenY: 0,
        spousePenY: 0,
        selfAge: plan.curAge,
        spouseAge: spouseAge ?? plan.curAge,
        hasSpouse: spouseAge !== null,
        numKidsForFuyo: 0,
        selfWorking: selfWageY > 0,
        spouseWorking: plan.spouseWork === "work" && spouseWageY > 0,
      },
      kidAgesNow,
    );
  }, [plan]);

  return (
    <Section
      id="ch-settings"
      no="01"
      title="基本設定"
      description="本人・配偶者・シミュレーション条件・税金"
      status={plan.selfBirth ? "entered" : "default"}
    >
      <div className="flex flex-col gap-2">
        <CollapsibleSubGroup title="本人">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
            <DateField
              label="生年月日"
              value={plan.selfBirth}
              onChange={(v) => setField("selfBirth", v)}
            />
            <AgeDisplay birth={plan.selfBirth} />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="配偶者">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
              <DateField
                label="生年月日"
                value={plan.spouseBirth}
                onChange={(v) => setField("spouseBirth", v)}
              />
              <AgeDisplay birth={plan.spouseBirth} />
            </div>
            <SelectField
              label="就労状況"
              value={plan.spouseWork}
              onChange={(v) => setField("spouseWork", v)}
              options={SPOUSE_WORK_OPTIONS}
            />
            <NumberField
              label="年収"
              value={plan.spouseIncY}
              onChange={(v) => setField("spouseIncY", v)}
              unit="円"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
              <NumberField
                label="就労開始"
                value={plan.spouseIncStart}
                onChange={(v) => setField("spouseIncStart", v)}
                unit="歳"
              />
              <NumberField
                label="就労終了"
                value={plan.spouseIncEnd}
                onChange={(v) => setField("spouseIncEnd", v)}
                unit="歳"
              />
            </div>
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="シミュレーション設定" defaultOpen={false}>
          <div className="grid grid-cols-1 gap-2">
            <NumberField
              label="シミュレーション最終年齢"
              value={plan.endAge}
              onChange={(v) => setField("endAge", v)}
              unit="歳"
              min={plan.curAge}
              max={120}
            />
            <PercentField
              label="インフレ率（年）"
              value={plan.infl}
              onChange={(v) => setField("infl", v)}
            />
            <NumberField
              label="最低現金"
              value={plan.cashFloor}
              onChange={(v) => setField("cashFloor", v)}
              unit="円"
            />
            <SelectField
              label="取り崩し順序"
              value={plan.drawOrder}
              onChange={(v) => setField("drawOrder", v)}
              options={DRAW_ORDER_OPTIONS}
            />
            {plan.drawOrder === "custom" ? (
              <div
                className="flex flex-col gap-1.5 rounded-lg p-2"
                style={{ background: "#f0f0ee", border: "1.5px solid #0a0a0a30" }}
              >
                <p className="px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/55">
                  カスタム順序（上から先に取り崩し）
                </p>
                {plan.drawCustomOrder.map((code, i) => {
                  const move = (dir: -1 | 1) => {
                    const order = [...plan.drawCustomOrder];
                    const j = i + dir;
                    if (j < 0 || j >= order.length) return;
                    [order[i], order[j]] = [order[j], order[i]];
                    setField("drawCustomOrder", order);
                  };
                  return (
                    <div
                      key={code}
                      className="flex items-center gap-2 px-2.5 py-1.5"
                      style={{
                        background: "#ffffff",
                        border: "2px solid #0a0a0a",
                        borderRadius: 8,
                      }}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#66666a]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-xs font-bold text-[#0a0a0a]">
                        {DRAW_LABEL[code]}
                      </span>
                      <button
                        type="button"
                        onClick={() => move(-1)}
                        disabled={i === 0}
                        className="px-2 py-0.5 text-[10px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#0a0a0a]"
                        style={{
                          border: "2px solid #0a0a0a",
                          borderRadius: 6,
                          background: "#f0f0ee",
                          color: "#0a0a0a",
                        }}
                        aria-label="上へ"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(1)}
                        disabled={i === plan.drawCustomOrder.length - 1}
                        className="px-2 py-0.5 text-[10px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#0a0a0a]"
                        style={{
                          border: "2px solid #0a0a0a",
                          borderRadius: 6,
                          background: "#f0f0ee",
                          color: "#0a0a0a",
                        }}
                        aria-label="下へ"
                      >
                        ↓
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <CheckboxField
              label="現金不足時に借金を許容（資産売却しない）"
              value={plan.allowNegCash}
              onChange={(v) => setField("allowNegCash", v)}
            />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="税金・社会保険（VER2）" defaultOpen={false}>
          <div className="flex flex-col gap-3">
            <div
              className="grid grid-cols-2 gap-0 overflow-hidden"
              style={{ border: "2.5px solid #0a0a0a", borderRadius: 12 }}
            >
              <button
                type="button"
                onClick={() => setField("taxMode", "simple")}
                className="px-4 py-3 text-xs font-bold transition-colors"
                style={{
                  background: !detailed ? "#0a0a0a" : "#ffffff",
                  color: !detailed ? "#ffffff" : "#0a0a0a",
                  borderRight: "2.5px solid #0a0a0a",
                }}
              >
                簡易（一律%で計算）
              </button>
              <button
                type="button"
                onClick={() => setField("taxMode", "detailed")}
                className="px-4 py-3 text-xs font-bold transition-colors"
                style={{
                  background: detailed ? "#0a0a0a" : "#ffffff",
                  color: detailed ? "#ffffff" : "#0a0a0a",
                }}
              >
                詳細（FP級計算）
              </button>
            </div>

            {!detailed && (
              <PercentField
                label="税率（概算）"
                value={plan.taxRate}
                onChange={(v) => setField("taxRate", v)}
                step={1}
              />
            )}

            {detailed && (
              <>
                <div
                  className="rounded-xl p-3 text-[11px] leading-relaxed text-[#0a0a0a]/70"
                  style={{ background: "#ffffff", border: "2.5px solid #0a0a0a" }}
                >
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">
                    詳細計算で考慮するもの
                  </p>
                  <ul className="ml-4 list-disc space-y-0.5">
                    <li>給与所得控除・公的年金等控除（年齢別）</li>
                    <li>基礎控除・配偶者控除・扶養控除（特定扶養含む）</li>
                    <li>所得税の累進5〜45%</li>
                    <li>復興特別所得税2.1%</li>
                    <li>住民税10%（所得割）</li>
                    <li>厚生年金・健康保険・雇用保険（自己負担）</li>
                    <li>介護保険料（40〜64歳）</li>
                    <li>退職後の国民健康保険料（簡易）</li>
                  </ul>
                </div>

                <div
                  className="rounded-xl p-4"
                  style={{ background: "#f0f0ee", border: "2.5px solid #0a0a0a" }}
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">
                    {plan.curAge}歳時点の試算（現在の収入条件で）
                  </p>
                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <span className="text-[#0a0a0a]/60">所得税（本人）</span>
                    <span className="text-right font-bold tabular-nums">{fmtMan(sample.shotokuzeiSelf)}</span>
                    <span className="text-[#0a0a0a]/60">復興特別税（本人）</span>
                    <span className="text-right font-bold tabular-nums">{fmtMan(sample.fukkouSelf)}</span>
                    <span className="text-[#0a0a0a]/60">住民税（本人）</span>
                    <span className="text-right font-bold tabular-nums">{fmtMan(sample.juminSelf)}</span>
                    <span className="text-[#0a0a0a]/60">社会保険料（本人）</span>
                    <span className="text-right font-bold tabular-nums">{fmtMan(sample.shahoSelf + sample.kaigoSelf)}</span>
                    {sample.shotokuzeiSpouse + sample.juminSpouse + sample.shahoSpouse > 0 && (
                      <>
                        <span className="text-[#0a0a0a]/60">所得税・住民税（配偶者）</span>
                        <span className="text-right font-bold tabular-nums">
                          {fmtMan(sample.shotokuzeiSpouse + sample.fukkouSpouse + sample.juminSpouse)}
                        </span>
                        <span className="text-[#0a0a0a]/60">社会保険料（配偶者）</span>
                        <span className="text-right font-bold tabular-nums">{fmtMan(sample.shahoSpouse + sample.kaigoSpouse)}</span>
                      </>
                    )}
                    <span className="col-span-2 my-1.5 h-px" style={{ background: "#0a0a0a30" }} />
                    <span className="text-sm font-bold text-[#0a0a0a]">税・社保合計</span>
                    <span className="text-right text-sm font-bold tabular-nums text-[#c8383a]">{fmtMan(sample.total)}</span>
                    <span className="text-[#0a0a0a]/60">手取り合計</span>
                    <span className="text-right font-bold tabular-nums">{fmtMan(sample.netAfterTax)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleSubGroup>
      </div>
    </Section>
  );
}
