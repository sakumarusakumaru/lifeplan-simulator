"use client";

import { useMemo } from "react";

import { ResultsPanel } from "@/components/ResultsPanel";
import { AssetsSection } from "@/components/sections/AssetsSection";
import { BasicSection } from "@/components/sections/BasicSection";
import { CareSection } from "@/components/sections/CareSection";
import { EducationSection } from "@/components/sections/EducationSection";
import { ExpenseSection } from "@/components/sections/ExpenseSection";
import { HousingSection } from "@/components/sections/HousingSection";
import { IncomeSection } from "@/components/sections/IncomeSection";
import { InheritanceSection } from "@/components/sections/InheritanceSection";
import { InsuranceSection } from "@/components/sections/InsuranceSection";
import { PensionSection } from "@/components/sections/PensionSection";
import { RealEstateSection } from "@/components/sections/RealEstateSection";
import { TaxDetailSection } from "@/components/sections/TaxDetailSection";
import { simulate } from "@/lib/calc/simulate";
import { usePlanStore } from "@/store/plan-store";

const fmt = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
  return `${sign}${abs.toLocaleString()}万`;
};

export default function DetailPage() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);

  if (!hydrated) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/60">
        loading...
      </main>
    );
  }

  const totalCare = result.rows.reduce((a, r) => a + r.care, 0);
  const totalInherit = result.rows.reduce((a, r) => a + r.inherit, 0);
  const totalSocialIns = result.rows.reduce((a, r) => a + r.socialIns, 0);

  return (
    <main className="px-4 py-6 pb-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header strip */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/60">
              VER 2 / DETAIL INPUT
            </p>
            <h1 className="mt-1 text-lg font-bold text-[#0a0a0a]">FP相談級 詳細入力</h1>
            <p className="mt-1 text-xs text-[#0a0a0a]/55">
              ver1の全項目 + 累進税計算・相続予定・介護費用を統合。すべての変更がリアルタイムで反映されます。
            </p>
          </div>
          <KpiStrip
            nw={fmt(result.finalNetWorth)}
            shortfall={result.shortfallAge ? `${result.shortfallAge}歳` : "なし"}
            care={fmt(totalCare)}
            inherit={fmt(totalInherit)}
            socialIns={plan.taxMode === "detailed" ? fmt(totalSocialIns) : "—"}
            alert={!!result.shortfallAge || result.finalNetWorth < 0}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[260px_1fr] md:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-2">
            {/* 既存ver1セクション */}
            <BasicSection />
            <IncomeSection />
            <PensionSection />
            <AssetsSection />
            <ExpenseSection />
            <HousingSection />
            <EducationSection />
            <RealEstateSection />
            <InsuranceSection />

            {/* ver2新セクション */}
            <div className="mt-3 flex items-center gap-2">
              <span className="h-px flex-1" style={{ background: "#0a0a0a30" }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                style={{
                  height: 22,
                  padding: "0 10px",
                  background: "#c8383a",
                  border: "2px solid #0a0a0a",
                  borderRadius: 8,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                VER 2 ONLY
              </span>
              <span className="h-px flex-1" style={{ background: "#0a0a0a30" }} />
            </div>
            <TaxDetailSection />
            <InheritanceSection />
            <CareSection />
          </div>

          <aside className="sm:sticky sm:top-[56px] sm:max-h-[calc(100vh-56px)] sm:self-start sm:overflow-y-auto sm:pr-1">
            <ResultsPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}

function KpiStrip({
  nw,
  shortfall,
  care,
  inherit,
  socialIns,
  alert,
}: {
  nw: string;
  shortfall: string;
  care: string;
  inherit: string;
  socialIns: string;
  alert: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10px]">
      <KpiInline label="最終純資産" value={nw} alert={alert} />
      <KpiInline label="資金ショート" value={shortfall} alert={shortfall !== "なし"} />
      <KpiInline label="生涯介護" value={care} />
      <KpiInline label="生涯相続" value={inherit} />
      <KpiInline label="生涯社保" value={socialIns} />
    </div>
  );
}

function KpiInline({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/50">{label}</span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: alert ? "#c8383a" : "#0a0a0a" }}
      >
        {value}
      </span>
    </div>
  );
}
