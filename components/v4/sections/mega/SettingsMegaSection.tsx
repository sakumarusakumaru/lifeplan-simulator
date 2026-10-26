"use client";

import { useEffect, useMemo } from "react";

import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { DateField } from "@/components/v4/inputs/DateField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { CollapsibleSubGroup } from "@/components/v4/CollapsibleSubGroup";
import { Section } from "@/components/v4/Section";
import { ageOn } from "@/lib/v4/calc/age";
import { DRAW_LABEL } from "@/lib/v4/calc/drawOrder";
import type { DrawOrderMode } from "@/lib/v4/calc/types";
import { calcHouseholdTax } from "@/lib/v4/calc/tax";
import { usePlanStore } from "@/store/v4/plan-store";

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
  { value: "auto", label: "おすすめ（特定口座→金→暗号資産→NISA）" },
  { value: "custom", label: "自分で順番を決める" },
];

function AgeDisplay({ birth }: { birth: string }) {
  const age = ageOn(birth, undefined);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">現在年齢</span>
      <div
        className="flex h-[34px] items-center justify-end px-2 text-xs font-bold tabular-nums text-[#0a0a0a]/50"
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

    const year = new Date().getFullYear();
    const selfStyle = plan.selfPension.category === "kokumin" ? "self-employed" : "employee";
    const spouseStyle = plan.spousePension.category === "kokumin" ? "self-employed" : "employee";
    const dcSelfY = plan.curAge < plan.saveDcEndAge ? plan.saveDcM * 12 : 0;
    const r = calcHouseholdTax({
      year,
      self: {
        age: plan.curAge,
        wageY: selfWageY,
        workStyle: selfStyle,
        penY: 0,
        otherShotokuY: 0,
        dcSelfContribY: dcSelfY,
        dependentOfSpouse: false,
      },
      spouse:
        spouseAge !== null
          ? {
              age: spouseAge,
              wageY: spouseWageY,
              workStyle: spouseStyle,
              penY: 0,
              otherShotokuY: 0,
              dcSelfContribY: 0,
              dependentOfSpouse:
                plan.spousePension.category === "dependent" &&
                spouseWageY < 1_300_000 &&
                selfStyle === "employee" &&
                selfWageY > 0,
            }
          : null,
      kidAges: kidAgesNow,
      hlDeductCredit: 0,
    });
    return { ...r, netAfterTax: selfWageY + spouseWageY - r.total };
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
              label="現金保有下限額"
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

        <CollapsibleSubGroup title="税金・社会保険" defaultOpen={false}>
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
                詳細モード
              </button>
            </div>

            {!detailed && (
              <div className="grid grid-cols-2 gap-2">
                <PercentField
                  label="給与・副業の税・社保率"
                  value={plan.taxRate}
                  onChange={(v) => setField("taxRate", v)}
                  step={1}
                  hint="年収500〜800万で20〜25%が目安"
                />
                <PercentField
                  label="年金の税・社保率"
                  value={plan.taxRatePen ?? 10}
                  onChange={(v) => setField("taxRatePen", v)}
                  step={1}
                  hint="公的年金等控除があるため8〜15%が目安"
                />
              </div>
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
                    <li>2026年分の基礎控除104万・給与所得控除74万（「178万円の壁」）、2028年以降は本則に戻して計算</li>
                    <li>配偶者控除・配偶者特別控除・扶養控除（16〜22歳）</li>
                    <li>所得税の累進5〜45%・復興特別所得税（2037年まで）・住民税10%</li>
                    <li>iDeCo・マッチング掛金の所得控除</li>
                    <li>厚生年金・健康保険・介護・子ども子育て支援金・雇用保険（2026年度料率）</li>
                    <li>自営業・退職後の国民年金・国民健康保険、75歳以上の後期高齢者医療</li>
                    <li>退職金・DC一時金は退職所得として分離課税（受取時期の重複調整つき）</li>
                    <li>住宅ローン控除・児童手当</li>
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
                    <span className="text-[#0a0a0a]/60">所得税・復興税（本人）</span>
                    <span className="text-right font-bold tabular-nums">{fmtMan(sample.shotokuzeiSelf)}</span>
                    <span className="text-[#0a0a0a]/60">住民税（本人）</span>
                    <span className="text-right font-bold tabular-nums">{fmtMan(sample.juminSelf)}</span>
                    <span className="text-[#0a0a0a]/60">社会保険料（本人）</span>
                    <span className="text-right font-bold tabular-nums">{fmtMan(sample.shahoSelf)}</span>
                    {sample.shotokuzeiSpouse + sample.juminSpouse + sample.shahoSpouse > 0 && (
                      <>
                        <span className="text-[#0a0a0a]/60">所得税・住民税（配偶者）</span>
                        <span className="text-right font-bold tabular-nums">
                          {fmtMan(sample.shotokuzeiSpouse + sample.juminSpouse)}
                        </span>
                        <span className="text-[#0a0a0a]/60">社会保険料（配偶者）</span>
                        <span className="text-right font-bold tabular-nums">{fmtMan(sample.shahoSpouse)}</span>
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
