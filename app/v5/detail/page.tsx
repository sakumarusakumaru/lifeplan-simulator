"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HealthHeader } from "@/components/v4/HealthHeader";
import { ResultsPanel } from "@/components/v4/ResultsPanel";
import { MonteCarloBadge } from "@/components/v4/MonteCarloPanel";
import { WarningsPanel } from "@/components/v4/WarningsPanel";
import { InputProgress } from "@/components/v4/InputProgress";
import { LivePreview } from "@/components/v5/LivePreview";
import { useUiStore } from "@/store/v4/ui-store";
import { SECTION_ORDER, StepFlowContext, StickyHeaderContext } from "@/components/v4/Section";
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
  const unlocked = useUiStore((s) => s.unlocked);
  const confirmed = useUiStore((s) => s.confirmed);
  const open = useUiStore((s) => s.open);
  const confirm = useUiStore((s) => s.confirm);
  const setOpen = useUiStore((s) => s.setOpen);
  const setUnlocked = useUiStore((s) => s.setUnlocked);
  const closeAll = useUiStore((s) => s.closeAll);
  // 入力ステップを終えた直後だけ出す案内
  const [justDone, setJustDone] = useState(false);

  // 入力が終わったら、その場（入力）で結果を見せる。入力を直すと右のグラフがすぐ変わることを体験してもらう
  const finish = useCallback(() => {
    setUnlocked(true);
    closeAll();
    setJustDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setUnlocked, closeAll]);

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
        finish();
      }
    },
    [confirm, setOpen, confirmed, finish],
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

  // はじめての人（ver5）: 入力しながら、横（スマホは下）に「いまの試算」を出す
  if (stepping) {
    return (
      <main className="px-4 py-6 pb-36 sm:px-8 lg:pb-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            <InputProgress onShowNow={finish} />
            {sections}
          </div>
          <div className="hidden lg:sticky lg:top-[calc(var(--lp-header-h,56px)+12px)] lg:block lg:self-start">
            <LivePreview result={result} plan={plan} variant="side" onShowNow={finish} />
          </div>
        </div>
        <LivePreview result={result} plan={plan} variant="bar" onShowNow={finish} />
      </main>
    );
  }

  return (
    <main className="px-4 py-6 pb-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {justDone ? (
          <div
            className="mb-4 flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center"
            style={{ background: "#f0fff4", border: "2.5px solid #22863a" }}
            role="status"
          >
            <div className="flex-1">
              <p className="text-sm font-bold text-[#22863a]">あなたの結果が出ました</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[#0a0a0a]/75">
                <span className="hidden sm:inline">右側</span>
                <span className="sm:hidden">下</span>
                のグラフと診断が、いま入力した内容の結果です。
                <span className="hidden sm:inline">左</span>
                <span className="sm:hidden">上</span>
                の入力を直すと、すぐに結果も変わります。
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/v5/result"
                className="rounded-lg px-3 py-2 text-[12px] font-bold text-white"
                style={{ background: "#0a0a0a" }}
              >
                詳しいレポートを見る →
              </Link>
              <button
                type="button"
                onClick={() => setJustDone(false)}
                className="rounded-lg px-2 py-2 text-[12px] font-bold text-[#0a0a0a]/60 hover:text-[#0a0a0a]"
                aria-label="案内を閉じる"
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}
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
