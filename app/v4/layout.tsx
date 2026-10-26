"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ConsentDialog } from "@/components/v4/ConsentDialog";
import { Footer } from "@/components/v4/Footer";
import { GuideFlow } from "@/components/v4/GuideFlow";
import { HeaderMenu } from "@/components/v4/HeaderMenu";
import type { PlanInput } from "@/lib/v4/calc/types";
import { migrateV3Plan, usePlanStore } from "@/store/v4/plan-store";
import { useUiStore } from "@/store/v4/ui-store";

const TABS = [
  { href: "/v4/detail", label: "詳細入力" },
  { href: "/v4/result", label: "結果出力" },
  { href: "/v4/suggest", label: "シナリオ比較" },
  { href: "/v4/risk", label: "もしもの備え" },
];

export default function V4Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIdx = TABS.findIndex((t) => pathname.startsWith(t.href));

  const plan = usePlanStore((s) => s.plan);
  const patch = usePlanStore((s) => s.patch);
  const reset = usePlanStore((s) => s.reset);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  // ヘッダーの実際の高さを CSS 変数に入れ、詳細入力のスティッキー見出し・右カラムの位置を合わせる
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty(
        "--lp-header-h",
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const realValue = useUiStore((s) => s.realValue);
  const setRealValue = useUiStore((s) => s.setRealValue);
  const mcOn = useUiStore((s) => s.mcOn);
  const setMcOn = useUiStore((s) => s.setMcOn);
  // 30年後の1,000万円が今の価値でいくらか（バナーの例示用）
  const example30 = Math.round(1000 / Math.pow(1 + plan.infl / 100, 30));

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
        // ver3 で保存したJSONも読めるように変換する
        const isV3 = "fundBal" in data || "fundNisaBal" in data;
        patch(isV3 ? migrateV3Plan(data) : (data as Partial<PlanInput>));
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

  // ステップのタブ。PCではヘッダー1段目に、スマホでは独立した行に出す
  const renderTabs = (className: string) => (
    <nav className={className}>
      {TABS.map((tab, i) => {
        const active = i === activeIdx;
        const passed = activeIdx >= 0 && i < activeIdx;
        const upcoming = activeIdx >= 0 && i > activeIdx;

        const stepBg = active ? "#0a0a0a" : passed ? "#0a0a0a25" : "#ffffff";
        const stepText = active ? "#ffffff" : passed ? "#0a0a0a55" : "#0a0a0a";
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
          <span key={tab.href} className="flex shrink-0 items-center gap-0.5">
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
  );

  return (
    <div className="min-h-screen" style={{ background: "#f0f0ee" }}>
      <header
        ref={headerRef}
        className="sticky top-0 z-50"
        style={{ background: "#f0f0ee", borderBottom: "2.5px solid #0a0a0a" }}
      >
        <div className="flex items-center gap-3 px-4 py-2 sm:px-8">
          <Link
            href="/"
            className="shrink-0 text-sm font-bold uppercase tracking-[0.18em] text-[#0a0a0a] transition-colors hover:text-[#c8383a]"
          >
            LIFE PLAN<span className="hidden lg:inline"> SIMULATOR</span>{" "}
            <span
              style={{
                fontSize: "0.75em",
                fontWeight: 400,
                color: "#0a0a0a66",
                letterSpacing: "0.08em",
              }}
            >
              ver4
            </span>
          </Link>

          <span className="hidden text-[#0a0a0a]/30 sm:inline">|</span>

          {renderTabs(
            "hidden min-w-0 items-center gap-0.5 overflow-x-auto sm:flex",
          )}

          {/* ページ別アクション（VER 3 バッジは廃止） */}
          <div className="no-print ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex shrink-0 items-center gap-1 px-2.5 py-1 text-[10px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
              style={headerBtnStyle}
              title="使い方ガイドを開く（閉じると今の画面に戻ります）"
            >
              <span
                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px]"
                style={{ border: "1.5px solid currentColor" }}
                aria-hidden
              >
                ?
              </span>
              使い方
            </button>
            <HeaderMenu
              onExport={exportPlan}
              onImport={() => fileInputRef.current?.click()}
              onPdf={() => window.print()}
              onReset={() => {
                if (
                  confirm(
                    "入力内容をすべて初期値に戻しますか？\nこの操作は取り消せません。\n（念のため、先に「入力データを保存」でバックアップできます）",
                  )
                ) {
                  reset();
                }
              }}
            />
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
          </div>
        </div>

        {/* スマホ: タブを独立した行に */}
        <div className="no-print px-4 pb-1.5 sm:hidden">
          {renderTabs("flex items-center gap-0.5 overflow-x-auto")}
        </div>

        {/* 2段目: 計算・表示の切替 */}
        <div
          className="no-print flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 pt-1.5 pb-2 sm:px-8"
          style={{ borderTop: "1px solid #0a0a0a15" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#0a0a0a]/55">
              運用利回り
            </span>
            <div
              className="flex shrink-0 overflow-hidden text-[10px] font-bold"
              style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
              role="group"
              aria-label="運用利回りの計算方法"
              title="運用利回りを毎年一定（固定）で見るか、毎年の値動き（振れ幅）を1,000通り試すか"
            >
              {[
                { v: false, label: "固定" },
                { v: true, label: "振れ幅" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setMcOn(o.v)}
                  aria-pressed={mcOn === o.v}
                  className="px-2 py-1 transition-colors"
                  style={{
                    background: mcOn === o.v ? "#1a6fa8" : "#ffffff",
                    color: mcOn === o.v ? "#ffffff" : "#0a0a0a",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#0a0a0a]/55">
              金額の表示
            </span>
            <div
              className="flex shrink-0 overflow-hidden text-[10px] font-bold"
              style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
              role="group"
              aria-label="金額の表示方法"
              title="将来の金額を、そのときの金額（名目）で見るか、物価上昇を割り戻した今の価値で見るか"
            >
              {[
                { v: false, label: "名目" },
                { v: true, label: "今の価値" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setRealValue(o.v)}
                  aria-pressed={realValue === o.v}
                  className="px-2 py-1 transition-colors"
                  style={{
                    background: realValue === o.v ? "#0a0a0a" : "#ffffff",
                    color: realValue === o.v ? "#ffffff" : "#0a0a0a",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <span className="hidden text-[10px] text-[#0a0a0a]/45 md:inline">
            {mcOn
              ? "値動きを1,000通り試算中（結果出力に「運用の振れ幅」の章）"
              : "毎年一定の利回りで計算"}
            {" ／ "}
            {realValue
              ? "将来の金額を今の価値に割り戻して表示"
              : "将来の金額はその年の金額で表示"}
          </span>
        </div>
      </header>

      {realValue ? (
        <div
          className="px-4 py-1.5 text-[11px] leading-relaxed sm:px-8"
          style={{
            background: "#eef6fc",
            borderBottom: "1.5px solid #1a6fa840",
            color: "#0a0a0a",
          }}
        >
          <span className="font-bold" style={{ color: "#1a6fa8" }}>
            今のお金の価値で表示中
          </span>
          ：将来の金額を物価上昇率（年{plan.infl.toFixed(1)}
          %）で割り戻しています。例：30年後の1,000万円 → 今の約
          {example30.toLocaleString()}万円。入力欄の金額はそのままです。
        </div>
      ) : null}
      {children}
      <Footer />
      <ConsentDialog />
      {guideOpen ? (
        <GuideFlow mode="modal" onClose={() => setGuideOpen(false)} />
      ) : null}
    </div>
  );
}
