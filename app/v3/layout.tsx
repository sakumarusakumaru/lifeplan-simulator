"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import { ConsentDialog } from "@/components/ConsentDialog";
import { Footer } from "@/components/Footer";
import type { PlanInput } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const TABS = [
  { href: "/v3/detail", label: "詳細入力" },
  { href: "/v3/result", label: "結果出力" },
  { href: "/v3/suggest", label: "シナリオ比較" },
];

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIdx = TABS.findIndex((t) => pathname.startsWith(t.href));

  const onDetail = pathname?.startsWith("/v3/detail") ?? false;
  const onResult = pathname?.startsWith("/v3/result") ?? false;
  const onSuggest = pathname?.startsWith("/v3/suggest") ?? false;
  const showPdf = onDetail || onResult || onSuggest;

  const plan = usePlanStore((s) => s.plan);
  const patch = usePlanStore((s) => s.patch);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 入力データをJSONでDL（detailタブ用）
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

  const importPlan = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (typeof data !== "object" || data === null) {
          throw new Error("JSONの形式が不正です");
        }
        if (!("curAge" in data) || !("endAge" in data)) {
          throw new Error("ライフプランデータではありません");
        }
        patch(data as Partial<PlanInput>);
        alert("データを読み込みました");
      } catch (err) {
        alert(
          "読み込みに失敗しました：" +
            (err instanceof Error ? err.message : "不明"),
        );
      }
    };
    reader.readAsText(file);
  };

  const headerBtnStyle = {
    background: "#ffffff",
    color: "#0a0a0a",
    border: "2px solid #0a0a0a",
    borderRadius: 8,
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f0ee" }}>
      <header
        className="sticky top-0 z-50 flex items-center gap-3 px-4 py-2.5 sm:px-8"
        style={{ background: "#f0f0ee", borderBottom: "2.5px solid #0a0a0a" }}
      >
        <Link
          href="/"
          className="shrink-0 text-sm font-bold uppercase tracking-[0.18em] text-[#0a0a0a] transition-colors hover:text-[#c8383a]"
        >
          LIFE PLAN SIMULATOR v3
        </Link>

        <span className="text-[#0a0a0a]/30">|</span>

        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {TABS.map((tab, i) => {
            const active = i === activeIdx;
            const passed = activeIdx >= 0 && i < activeIdx;
            const upcoming = activeIdx >= 0 && i > activeIdx;

            const stepBg = active
              ? "#0a0a0a"
              : passed
                ? "#0a0a0a25"
                : "#ffffff";
            const stepText = active
              ? "#ffffff"
              : passed
                ? "#0a0a0a55"
                : "#0a0a0a";
            const labelColor = active
              ? "#ffffff"
              : passed
                ? "#0a0a0a55"
                : upcoming
                  ? "#0a0a0a"
                  : "#0a0a0a";
            const tabBg = active ? "#0a0a0a" : "transparent";
            const tabBorder = active
              ? "2px solid #0a0a0a"
              : passed
                ? "2px solid #0a0a0a20"
                : "2px solid #0a0a0a";

            return (
              <span key={tab.href} className="flex items-center gap-0.5">
                <Link
                  href={tab.href}
                  className="flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-xs font-bold tracking-wide transition-all hover:opacity-80"
                  style={{
                    color: labelColor,
                    background: tabBg,
                    border: tabBorder,
                    borderRadius: 8,
                  }}
                >
                  <span
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[9px] font-bold tabular-nums"
                    style={{
                      background: stepBg,
                      color: stepText,
                      borderRadius: 4,
                      border: active ? "1px solid #ffffff40" : "none",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {tab.label}
                </Link>
                {i < TABS.length - 1 ? (
                  <span
                    className="shrink-0 text-sm font-bold"
                    style={{
                      color:
                        passed || (active && i + 1 <= activeIdx)
                          ? "#0a0a0a30"
                          : "#0a0a0a55",
                    }}
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
              </span>
            );
          })}
        </nav>

        {/* ページ別アクション（VER 3 バッジは廃止） */}
        <div className="no-print ml-auto flex shrink-0 items-center gap-1.5">
          {onDetail && (
            <>
              <button
                type="button"
                onClick={exportPlan}
                className="px-2.5 py-1 text-[10px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
                style={headerBtnStyle}
                title="現在の入力データをJSONとしてダウンロード"
              >
                ↓ JSONでDL
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-[10px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
                style={headerBtnStyle}
                title="保存したJSONを読み込んで反映"
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
                  e.target.value = "";
                }}
              />
            </>
          )}
          {showPdf && (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-2.5 py-1 text-[10px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
              style={headerBtnStyle}
              title="ブラウザの印刷からPDFとして保存"
            >
              ↓ PDFでDL
            </button>
          )}
        </div>
      </header>

      {children}
      <Footer />
      <ConsentDialog />
    </div>
  );
}
