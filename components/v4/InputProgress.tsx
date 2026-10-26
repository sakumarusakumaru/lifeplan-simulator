"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { SECTION_ORDER } from "@/components/v4/Section";
import { usePlanStore } from "@/store/v4/plan-store";
import { useUiStore } from "@/store/v4/ui-store";

const LABELS: Record<(typeof SECTION_ORDER)[number], string> = {
  "ch-settings": "基本設定",
  "ch-income": "収入",
  "ch-assets": "資産・運用",
  "ch-expense": "支出",
};

// はじめての人の入力ステップの進み具合。
// mode="input": 詳細入力の上に出す / mode="gate": 入力が終わる前に結果タブを開いたときに出す
export function InputProgress({ mode = "input" }: { mode?: "input" | "gate" }) {
  const router = useRouter();
  const confirmed = useUiStore((s) => s.confirmed);
  const setOpen = useUiStore((s) => s.setOpen);
  const closeAll = useUiStore((s) => s.closeAll);
  const setUnlocked = useUiStore((s) => s.setUnlocked);
  const loadSample = usePlanStore((s) => s.loadSample);
  const hasBirth = usePlanStore((s) => !!s.plan.selfBirth);

  const done = SECTION_ORDER.filter((id) => confirmed[id]).length;
  const current = SECTION_ORDER.find((id) => !confirmed[id]);

  const jump = (id: string) => {
    closeAll();
    setOpen(id, true);
    if (mode === "gate") router.push("/v4/detail");
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const showNow = () => {
    setUnlocked(true);
    if (mode === "input") router.push("/v4/result");
  };

  const trySample = () => {
    if (hasBirth && !confirm("サンプル（35歳・会社員・持ち家）を読み込みます。\n今の入力内容は上書きされます。よろしいですか？")) return;
    loadSample();
    setUnlocked(true);
    router.push("/v4/result");
  };

  return (
    <div className="rounded-xl bg-white p-4 sm:p-5" style={{ border: "2.5px solid #0a0a0a" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/50">
        {mode === "gate" ? "まだ結果は出ていません" : `STEP ${Math.min(done + 1, 4)} / 4`}
      </p>
      <h1 className="mt-0.5 text-lg font-bold leading-snug text-[#0a0a0a] sm:text-xl">
        {mode === "gate"
          ? "入力が終わると、ここにあなたの結果が出ます"
          : done === 0
            ? "まずは、あなたのことを教えてください"
            : "その調子です。続きを入力しましょう"}
      </h1>
      <p className="mt-1 text-[12px] leading-relaxed text-[#0a0a0a]/65">
        4つのブロックを上から順に入れて「OK・次へ」を押すと、最後に資産の推移グラフや診断が表示されます。
        わからない所は空欄のままで大丈夫です。
      </p>

      <ol className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {SECTION_ORDER.map((id, i) => {
          const ok = !!confirmed[id];
          const isCur = id === current;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => jump(id)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left"
                style={{
                  background: ok ? "#f0fff4" : isCur ? "#0a0a0a" : "#f0f0ee",
                  color: isCur && !ok ? "#ffffff" : "#0a0a0a",
                  border: `2px solid ${ok ? "#22863a" : "#0a0a0a"}`,
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    background: ok ? "#22863a" : isCur ? "#ffffff" : "#0a0a0a",
                    color: ok ? "#ffffff" : isCur ? "#0a0a0a" : "#ffffff",
                  }}
                >
                  {ok ? "✓" : i + 1}
                </span>
                <span className="text-[12px] font-bold">{LABELS[id]}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        {mode === "gate" ? (
          <Link
            href="/v4/detail"
            className="rounded-lg px-3 py-2 font-bold text-white"
            style={{ background: "#0a0a0a" }}
          >
            入力を続ける →
          </Link>
        ) : null}
        <button type="button" onClick={showNow} className="font-bold text-[#0a0a0a]/70 underline hover:text-[#c8383a]">
          途中でも、今の内容で結果を見る
        </button>
        <button type="button" onClick={trySample} className="font-bold text-[#0a0a0a]/50 underline hover:text-[#c8383a]">
          サンプルの人で試してみる
        </button>
      </div>
    </div>
  );
}
