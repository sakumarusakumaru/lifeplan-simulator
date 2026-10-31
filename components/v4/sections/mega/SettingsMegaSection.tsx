"use client";

import { Fragment, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { DateField } from "@/components/v4/inputs/DateField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { CollapsibleSubGroup } from "@/components/v4/CollapsibleSubGroup";
import { DrawOrderEditor } from "@/components/v4/DrawOrderEditor";
import { AddButton, ListItemCard } from "@/components/v4/ListItemCard";
import { TextField } from "@/components/v4/inputs/TextField";
import { Section, TabModeContext } from "@/components/v4/Section";
import { NEW_KID } from "@/components/v4/sections/mega/ExpenseMegaSection";
import { ageOn, kidOffset } from "@/lib/v4/calc/age";
import type { Kid } from "@/lib/v4/calc/types";
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

function AgeDisplay({ birth }: { birth: string }) {
  const age = ageOn(birth, undefined);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">現在年齢</span>
      <div
        className="flex h-[34px] items-center justify-end px-2 text-xs font-bold tabular-nums text-[#0a0a0a]/50"
        style={{ border: "2px solid #0a0a0a25", borderRadius: 8, background: "#f0f0ee" }}
      >
        {age !== null ? (age < 0 ? "これから" : `${age} 歳`) : "—"}
      </div>
    </div>
  );
}

// ver5: 配偶者の「いる／いない」。いないときは配偶者の欄を出さない（計算は生年月日が空なら配偶者なし）
function SpouseToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden" style={{ border: "2px solid #0a0a0a", borderRadius: 10 }} role="radiogroup" aria-label="配偶者">
      {[
        { v: false, label: "いない" },
        { v: true, label: "いる" },
      ].map((o, i) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={on === o.v}
          onClick={() => onChange(o.v)}
          className="min-h-11 text-[13px] font-bold"
          style={{
            background: on === o.v ? "#0a0a0a" : "#ffffff",
            color: on === o.v ? "#ffffff" : "#0a0a0a",
            borderLeft: i === 0 ? "none" : "2px solid #0a0a0a",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ver5: シミュレーション設定と税金を「詳細設定」1つにまとめる（ver4 はそれぞれ別の開閉のまま）
function DetailWrap({ children }: { children: ReactNode }) {
  return (
    <CollapsibleSubGroup title="詳細設定（初期値のままでOK）" defaultOpen={false}>
      <div className="flex flex-col gap-5">{children}</div>
    </CollapsibleSubGroup>
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
  const tabMode = useContext(TabModeContext);
  const [spouseOn, setSpouseOn] = useState(!!plan.spouseBirth);
  const showSpouse = !tabMode || spouseOn || !!plan.spouseBirth;
  const Detail = tabMode ? DetailWrap : Fragment;
  const updateKid = (i: number, patch: Partial<Kid>) => {
    const kids = plan.kids.map((k, idx) => (idx === i ? { ...k, ...patch } : k));
    if (patch.birth !== undefined) kids[i] = { ...kids[i], offset: kidOffset(plan.selfBirth, plan.baseDate, patch.birth) };
    setField("kids", kids);
  };
  const pickSpouse = (v: boolean) => {
    setSpouseOn(v);
    if (!v && plan.spouseBirth) patch({ spouseBirth: "" });
  };

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
          {tabMode ? <SpouseToggle on={showSpouse} onChange={pickSpouse} /> : null}
          {showSpouse ? (
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
              <DateField
                label="生年月日"
                value={plan.spouseBirth}
                onChange={(v) => setField("spouseBirth", v)}
              />
              <AgeDisplay birth={plan.spouseBirth} />
            </div>
            {/* ver5 は配偶者の働き方・年収を「収入」ブロックで聞く */}
            {tabMode ? null : (
            <>
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
            </>
            )}
          </div>
          ) : null}
          {tabMode && showSpouse && !plan.spouseBirth ? (
            <p className="text-[11px] text-[#0a0a0a]/60">生年月日を入れると、配偶者の収入・年金も計算に入ります</p>
          ) : null}
          {tabMode && plan.spouseBirth ? (
            <p className="text-[11px] text-[#0a0a0a]/60">配偶者の働き方と年収は「2 収入」で入れます</p>
          ) : null}
        </CollapsibleSubGroup>

        {/* ver5: 子どもも家族の欄で聞く（ver4 は「支出 ＞ 教育費」の中だけ） */}
        {tabMode ? (
          <CollapsibleSubGroup title="子ども">
            {plan.kids.map((k, i) => (
              <ListItemCard key={i} kicker={`KID ${String(i + 1).padStart(2, "0")}`} onRemove={() => setField("kids", plan.kids.filter((_, idx) => idx !== i))}>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <TextField label="名前（呼び名）" value={k.name} onChange={(v) => updateKid(i, { name: v })} />
                  <DateField label="生年月日（予定日でも可）" value={k.birth} onChange={(v) => updateKid(i, { birth: v })} />
                  <AgeDisplay birth={k.birth} />
                </div>
              </ListItemCard>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <AddButton label="子どもを追加" onClick={() => setField("kids", [...plan.kids, { ...NEW_KID(), name: `子${plan.kids.length + 1}` }])} />
              <span className="text-[11px] text-[#0a0a0a]/60">
                {plan.kids.length ? "進学（公立・私立）や塾代は「4 支出 ＞ 教育費」で。はじめは全部公立で計算します" : "いなければ、そのままで大丈夫です"}
              </span>
            </div>
          </CollapsibleSubGroup>
        ) : null}

        <Detail>
        <CollapsibleSubGroup title="シミュレーション設定" defaultOpen={tabMode}>
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
              label="手元に残す預金の最低額（現金保有下限額）"
              value={plan.cashFloor}
              onChange={(v) => setField("cashFloor", v)}
              unit="円"
              hint={`手元に最低限残しておく預金。これを下回る年に運用資産を売る。${
                plan.livingM > 0 ? `いまの生活費の約${Math.round((plan.cashFloor / plan.livingM) * 10) / 10}か月分（目安は退職後で1〜2年分）` : ""
              }`}
            />
            <DrawOrderEditor />
            <CheckboxField
              label="現金不足時に借金を許容（資産売却しない）"
              value={plan.allowNegCash}
              onChange={(v) => setField("allowNegCash", v)}
            />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="税金・社会保険" defaultOpen={tabMode}>
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
        </Detail>
      </div>
    </Section>
  );
}
