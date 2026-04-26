"use client";

import { useMemo } from "react";

import { PercentField } from "@/components/inputs/PercentField";
import { Section } from "@/components/Section";
import { ageOn } from "@/lib/calc/age";
import { calcDetailedTaxV2 } from "@/lib/calc/tax";
import { usePlanStore } from "@/store/plan-store";

const fmtMan = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  return `${sign}${abs.toLocaleString()}万`;
};

export function TaxDetailSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const sample = useMemo(() => {
    const job = plan.jobs.reduce((acc, j) => {
      const startAge = j.start ?? plan.curAge;
      const endAge = j.end ?? plan.curAge;
      return startAge <= plan.curAge && plan.curAge < endAge ? acc + j.inc : acc;
    }, 0);
    const side = plan.sideJobs.reduce((acc, j) => {
      return j.start <= plan.curAge && plan.curAge < j.end ? acc + j.inc : acc;
    }, 0);
    const spouseAge = ageOn(plan.spouseBirth, undefined);
    const spouseJob = plan.spouseWork === "work"
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
        selfWageY: job + side,
        spouseWageY: spouseJob,
        selfPenY: 0,
        spousePenY: 0,
        selfAge: plan.curAge,
        spouseAge: spouseAge ?? plan.curAge,
        hasSpouse: spouseAge !== null,
        numKidsForFuyo: 0,
        selfWorking: job + side > 0,
        spouseWorking: plan.spouseWork === "work" && spouseJob > 0,
      },
      kidAgesNow,
    );
  }, [plan]);

  const detailed = plan.taxMode === "detailed";

  return (
    <Section
      id="ch-tax"
      no="10"
      title="税金・社会保険"
      description="累進所得税 + 住民税 + 社会保険料の精密計算"
      status={detailed ? "entered" : "default"}
    >
      <div className="flex flex-col gap-3">
        {/* モード切替 */}
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
            簡易（一律 % で計算）
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

            {/* 試算プレビュー（現在年齢時点） */}
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
                <span className="text-sm font-bold text-[#0a0a0a]">税・社保 合計</span>
                <span className="text-right text-sm font-bold tabular-nums text-[#c8383a]">{fmtMan(sample.total)}</span>
                <span className="text-[#0a0a0a]/60">手取り合計</span>
                <span className="text-right font-bold tabular-nums">{fmtMan(sample.netAfterTax)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
