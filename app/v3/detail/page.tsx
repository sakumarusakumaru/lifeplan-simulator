"use client";

import { useMemo, useRef } from "react";

import { HealthHeader } from "@/components/HealthHeader";
import { ResultsPanel } from "@/components/ResultsPanel";
import { StickyHeaderContext } from "@/components/Section";
import { AssetsMegaSection } from "@/components/sections/mega/AssetsMegaSection";
import { ExpenseMegaSection } from "@/components/sections/mega/ExpenseMegaSection";
import { IncomeMegaSection } from "@/components/sections/mega/IncomeMegaSection";
import { SettingsMegaSection } from "@/components/sections/mega/SettingsMegaSection";
import { simulate } from "@/lib/calc/simulate";
import type { PlanInput } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

export default function DetailPage() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const patch = usePlanStore((s) => s.patch);
  const result = useMemo(() => simulate(plan), [plan]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 入力データをJSONでDL
  const exportPlan = () => {
    const json = JSON.stringify(plan, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `lifeplan_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSONを読み込んで plan を上書き
  const importPlan = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (typeof data !== "object" || data === null) {
          throw new Error("JSONの形式が不正です");
        }
        if (!("curAge" in data) || !("endAge" in data)) {
          throw new Error("ライフプランデータではありません（curAge / endAge が必要）");
        }
        patch(data as Partial<PlanInput>);
        alert("データを読み込みました。");
      } catch (err) {
        alert(
          "読み込みに失敗しました：" +
            (err instanceof Error ? err.message : "不明なエラー"),
        );
      }
    };
    reader.readAsText(file);
  };

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
        {/* データ入出力バー */}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/55">
            データ ／ DATA I/O
          </span>
          <button
            type="button"
            onClick={exportPlan}
            className="px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
            style={{
              background: "#ffffff",
              color: "#0a0a0a",
              border: "2px solid #0a0a0a",
              borderRadius: 8,
            }}
            title="現在の入力データをJSONファイルとしてダウンロード"
          >
            ↓ JSONでDL
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
            style={{
              background: "#ffffff",
              color: "#0a0a0a",
              border: "2px solid #0a0a0a",
              borderRadius: 8,
            }}
            title="保存したJSONファイルを読み込んで入力欄に反映"
          >
            ↑ JSONを読み込み
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importPlan(f);
              // 同じファイルを連続で選んでも onChange が再発火するようにリセット
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[260px_1fr] md:grid-cols-[1fr_2fr]">
          <StickyHeaderContext.Provider value={{ enabled: true, topPx: 44 }}>
            <div className="flex flex-col gap-2">
              <SettingsMegaSection />
              <IncomeMegaSection />
              <AssetsMegaSection />
              <ExpenseMegaSection />
            </div>
          </StickyHeaderContext.Provider>

          <aside className="flex flex-col gap-4 sm:sticky sm:top-[64px] sm:max-h-[calc(100vh-72px)] sm:self-start sm:overflow-y-auto sm:pr-1">
            <HealthHeader result={result} plan={plan} />
            <ResultsPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}
