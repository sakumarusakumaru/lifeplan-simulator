"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { HealthHeader } from "@/components/v4/HealthHeader";
import { ResultsPanel } from "@/components/v4/ResultsPanel";
import { MonteCarloBadge } from "@/components/v4/MonteCarloPanel";
import { WarningsPanel } from "@/components/v4/WarningsPanel";
import { InputProgress } from "@/components/v4/InputProgress";
import { useUiStore } from "@/store/v4/ui-store";
import { SECTION_ORDER, StepFlowContext, StickyHeaderContext } from "@/components/v4/Section";
import { AssetsMegaSection } from "@/components/v4/sections/mega/AssetsMegaSection";
import { ExpenseMegaSection } from "@/components/v4/sections/mega/ExpenseMegaSection";
import { IncomeMegaSection } from "@/components/v4/sections/mega/IncomeMegaSection";
import { SettingsMegaSection } from "@/components/v4/sections/mega/SettingsMegaSection";
import { usePlanStore } from "@/store/v4/plan-store";
import { useSimResult } from "@/store/v4/useSimResult";

export default function DetailPage() {
  const router = useRouter();
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const result = useSimResult(plan);
  const mcOn = useUiStore((s) => s.mcOn);
  const unlocked = useUiStore((s) => s.unlocked);
  const confirmed = useUiStore((s) => s.confirmed);
  const open = useUiStore((s) => s.open);
  const confirm = useUiStore((s) => s.confirm);
  const setOpen = useUiStore((s) => s.setOpen);
  const setUnlocked = useUiStore((s) => s.setUnlocked);

  const stepping = hydrated && unlocked === false;

  // ステップ入力中: どのブロックも開いていなければ、まだOKしていない最初のブロックを開く
  useEffect(() => {
    if (!stepping) return;
    if (SECTION_ORDER.some((id) => open[id])) return;
    const first = SECTION_ORDER.find((id) => !confirmed[id]) ?? SECTION_ORDER[0];
    setOpen(first, true);
  }, [stepping, open, confirmed, setOpen]);

  const onDone = useCallback(
    (id: string) => {
      confirm(id);
      setOpen(id, false);
      const i = SECTION_ORDER.indexOf(id as (typeof SECTION_ORDER)[number]);
      const next = SECTION_ORDER.slice(i + 1).find((x) => !confirmed[x]) ?? SECTION_ORDER[i + 1];
      if (next) {
        setOpen(next, true);
        window.setTimeout(() => {
          document.getElementById(next)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
      } else {
        setUnlocked(true);
        router.push("/v4/result");
      }
    },
    [confirm, setOpen, confirmed, setUnlocked, router],
  );

  const flow = useMemo(
    () => ({
      enabled: stepping,
      onDone,
      canProceed: (id: string) =>
        id === "ch-settings" && !plan.selfBirth ? "本人の生年月日を入れると次へ進めます" : null,
      note: (id: string) => {
        if (id === "ch-income" && plan.jobs.every((j) => !j.inc) && plan.sideJobs.every((j) => !j.inc))
          return "年収が0円のままです。働いている方は「年収（額面）」を入れてください（収入がない場合はこのままでOK）";
        if (id === "ch-expense" && !plan.livingM)
          return "毎月の生活費が0円のままです。だいたいの金額を入れると結果が現実に近くなります";
        return null;
      },
    }),
    [stepping, onDone, plan.selfBirth, plan.jobs, plan.sideJobs, plan.livingM],
  );

  if (!hydrated || unlocked === null) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/60">
        loading...
      </main>
    );
  }

  const sections = (
    <StepFlowContext.Provider value={flow}>
      <StickyHeaderContext.Provider value={{ enabled: true, topPx: 56 }}>
        <div className="flex flex-col gap-2">
          <SettingsMegaSection />
          <IncomeMegaSection />
          <AssetsMegaSection />
          <ExpenseMegaSection />
        </div>
      </StickyHeaderContext.Provider>
    </StepFlowContext.Provider>
  );

  // はじめての人: 入力だけの画面（グラフは入力が終わってから）
  if (stepping) {
    return (
      <main className="px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <InputProgress />
          {sections}
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-6 pb-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[260px_1fr] md:grid-cols-[1fr_2fr]">
          {sections}

          <aside className="flex flex-col gap-4 sm:sticky sm:top-[calc(var(--lp-header-h,56px)+12px)] sm:max-h-[calc(100vh-var(--lp-header-h,56px)-20px)] sm:self-start sm:overflow-y-auto sm:pr-1">
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
