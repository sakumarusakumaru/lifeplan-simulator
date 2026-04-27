"use client";

import { useMemo } from "react";

import { HealthHeader } from "@/components/HealthHeader";
import { ResultsPanel } from "@/components/ResultsPanel";
import { AssetsMegaSection } from "@/components/sections/mega/AssetsMegaSection";
import { ExpenseMegaSection } from "@/components/sections/mega/ExpenseMegaSection";
import { IncomeMegaSection } from "@/components/sections/mega/IncomeMegaSection";
import { SettingsMegaSection } from "@/components/sections/mega/SettingsMegaSection";
import { simulate } from "@/lib/calc/simulate";
import { usePlanStore } from "@/store/plan-store";

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

  return (
    <main className="pb-24">
      {/* Hero - scrolls away */}
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-6 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/60">
          VER 2 / DETAIL INPUT
        </p>
        <h1 className="mt-1 text-lg font-bold text-[#0a0a0a]">FP相談級 詳細入力</h1>
        <p className="mt-1 text-xs text-[#0a0a0a]/55">
          収入・資産・支出の全項目 + 累進税計算・相続・介護費用を統合。すべての変更がリアルタイムで反映されます。
        </p>
      </div>

      {/* Sticky health header (compacts on scroll) */}
      <HealthHeader
        result={result}
        plan={plan}
        taxModeDetailed={plan.taxMode === "detailed"}
      />

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[260px_1fr] md:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-2">
            <SettingsMegaSection />
            <IncomeMegaSection />
            <AssetsMegaSection />
            <ExpenseMegaSection />
          </div>

          <aside className="sm:sticky sm:top-[112px] sm:max-h-[calc(100vh-112px)] sm:self-start sm:overflow-y-auto sm:pr-1">
            <ResultsPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}
