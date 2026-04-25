"use client";

import { BasicSection } from "@/components/sections/BasicSection";
import { ResultsPanel } from "@/components/ResultsPanel";
import { usePlanStore } from "@/store/plan-store";

export default function Home() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const reset = usePlanStore((s) => s.reset);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        読み込み中...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            LifePlan Simulator
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            入力すると即座に再計算されます。データはお使いのブラウザにのみ保存されます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("入力内容を初期化しますか？")) reset();
          }}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
        >
          初期化
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <BasicSection />
          <PlaceholderSection title="収入（実装予定）" note="勤務先・副業・年金" />
          <PlaceholderSection title="資産（実装予定）" note="現金・投信・株・仮想通貨・DC" />
          <PlaceholderSection title="支出・住居（実装予定）" note="基本支出・家賃・住宅ローン" />
          <PlaceholderSection title="教育（実装予定）" note="子供ごとの学校・塾・大学" />
          <PlaceholderSection title="不動産投資（実装予定）" />
          <PlaceholderSection title="保険（実装予定）" />
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ResultsPanel />
        </aside>
      </div>
    </main>
  );
}

function PlaceholderSection({ title, note }: { title: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/40 px-5 py-4">
      <div className="text-sm font-medium text-zinc-500">{title}</div>
      {note ? <div className="mt-1 text-xs text-zinc-400">{note}</div> : null}
    </div>
  );
}
