"use client";

import { HealthHeader } from "@/components/v4/HealthHeader";
import { ResultsPanel } from "@/components/v4/ResultsPanel";
import { MonteCarloBadge } from "@/components/v4/MonteCarloPanel";
import { WarningsPanel } from "@/components/v4/WarningsPanel";
import { useUiStore } from "@/store/v4/ui-store";
import { StickyHeaderContext } from "@/components/v4/Section";
import { AssetsMegaSection } from "@/components/v4/sections/mega/AssetsMegaSection";
import { ExpenseMegaSection } from "@/components/v4/sections/mega/ExpenseMegaSection";
import { IncomeMegaSection } from "@/components/v4/sections/mega/IncomeMegaSection";
import { SettingsMegaSection } from "@/components/v4/sections/mega/SettingsMegaSection";
import { usePlanStore } from "@/store/v4/plan-store";
import { useSimResult } from "@/store/v4/useSimResult";

export default function DetailPage() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const result = useSimResult(plan);
  const mcOn = useUiStore((s) => s.mcOn);

  if (!hydrated) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/60">
        loading...
      </main>
    );
  }

  return (
    <main className="px-4 py-6 pb-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[260px_1fr] md:grid-cols-[1fr_2fr]">
          <StickyHeaderContext.Provider value={{ enabled: true, topPx: 88 }}>
            <div className="flex flex-col gap-2">
              <SettingsMegaSection />
              <IncomeMegaSection />
              <AssetsMegaSection />
              <ExpenseMegaSection />
            </div>
          </StickyHeaderContext.Provider>

          <aside className="flex flex-col gap-4 sm:sticky sm:top-[calc(var(--lp-header-h,88px)+12px)] sm:max-h-[calc(100vh-var(--lp-header-h,88px)-20px)] sm:self-start sm:overflow-y-auto sm:pr-1">
            <HealthHeader result={result} plan={plan} />
            {mcOn ? <MonteCarloBadge /> : null}
            <WarningsPanel warnings={result.warnings} />
            <ResultsPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}
