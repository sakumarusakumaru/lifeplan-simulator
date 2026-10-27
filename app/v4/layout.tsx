"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ConsentDialog } from "@/components/v4/ConsentDialog";
import { Footer } from "@/components/v4/Footer";
import { GuideFlow } from "@/components/v4/GuideFlow";
import { HeaderMenu } from "@/components/v4/HeaderMenu";
import { InputProgress } from "@/components/v4/InputProgress";
import type { PlanInput } from "@/lib/v4/calc/types";
import { anonymizePlan } from "@/lib/v4/calc/anonymize";
import { DEFAULT_PLAN, EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import { migrateV3Plan, normalizePlan, usePlanStore } from "@/store/v4/plan-store";
import { useUiStore } from "@/store/v4/ui-store";

const TABS = [
  { href: "/v4/detail", label: "入力" },
  { href: "/v4/result", label: "レポート" },
  { href: "/v4/suggest", label: "比較" },
  { href: "/v4/risk", label: "もしも" },
];

export default function V4Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIdx = TABS.findIndex((t) => pathname.startsWith(t.href));

  const plan = usePlanStore((s) => s.plan);
  const replacePlan = usePlanStore((s) => s.replace);
  const reset = usePlanStore((s) => s.reset);
  const loadSample = usePlanStore((s) => s.loadSample);
  const planHydrated = usePlanStore((s) => s.hydrated);
  const uiHydrated = useUiStore((s) => s.hydrated);
  const unlocked = useUiStore((s) => s.unlocked);
  const setUnlocked = useUiStore((s) => s.setUnlocked);
  const resetProgress = useUiStore((s) => s.resetProgress);
  const closeAll = useUiStore((s) => s.closeAll);
  const router = useRouter();

  // 結果を出してよいかの初回判定: 生年月日まで入っている保存データがある人（既存ユーザー）はそのまま表示
  useEffect(() => {
    if (planHydrated && uiHydrated && unlocked === null)
      setUnlocked(!!plan.selfBirth);
  }, [planHydrated, uiHydrated, unlocked, plan.selfBirth, setUnlocked]);
  const gated =
    planHydrated &&
    uiHydrated &&
    unlocked === false &&
    !(pathname?.startsWith("/v4/detail") ?? false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  // スマホ: 下にスクロールするとタブの行を閉じ、上に戻すと開く
  const [tabsHidden, setTabsHidden] = useState(false);
  const tabsHiddenRef = useRef(false);
  // ヘッダーは fixed。開いているときの高さを下の余白にして、タブを閉じても本文が動かないようにする
  const [headerFullH, setHeaderFullH] = useState(88);

  // ヘッダーの実際の高さを CSS 変数に入れ、入力画面のスティッキー見出し・右カラムの位置を合わせる
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--lp-header-h", `${h}px`);
      if (!tabsHiddenRef.current) setHeaderFullH(h);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (window.innerWidth >= 640) {
        if (tabsHiddenRef.current) {
          tabsHiddenRef.current = false;
          setTabsHidden(false);
        }
        lastY = y;
        return;
      }
      const hide = y > 120 && y > lastY + 6 ? true : y < lastY - 6 || y <= 120 ? false : null;
      if (hide !== null && hide !== tabsHiddenRef.current) {
        tabsHiddenRef.current = hide;
        setTabsHidden(hide);
      }
      if (Math.abs(y - lastY) > 6) lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const realValue = useUiStore((s) => s.realValue);
  const setRealValue = useUiStore((s) => s.setRealValue);
  const mcOn = useUiStore((s) => s.mcOn);
  const setMcOn = useUiStore((s) => s.setMcOn);
  // 30年後の1,000万円が今の価値でいくらか（バナーの例示用）
  const example30 = Math.round(1000 / Math.pow(1 + plan.infl / 100, 30));

  // 入力データをJSONでDL（detailタブ用）
  const exportPlan = (forReview = false) => {
    // 検証用は、名前・連絡先・メッセージなどを消し、ほかのAIや専門家に渡しやすい形にする
    const json = JSON.stringify(
      forReview
        ? {
            _note: "ライフプランシミュレーター ver4 の入力データ（検証用・個人情報を除いたもの）。計算の仕組みは同梱の検証用資料を参照",
            _exportedAt: new Date().toISOString(),
            plan: anonymizePlan(plan),
          }
        : plan,
      null,
      2,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = forReview ? `lifeplan_検証用_${ts}.json` : `lifeplan_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importPlan = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data = JSON.parse(e.target?.result as string);
        if (typeof data !== "object" || data === null) {
          throw new Error("JSONの形式が不正です");
        }
        // 検証用に書き出した形式（{ plan: {...} }）も読めるようにする
        const isReview = "plan" in data && !("curAge" in data);
        if (isReview) data = data.plan;
        if (!("curAge" in data) || !("endAge" in data)) {
          throw new Error("ライフプランデータではありません");
        }
        // ver3 で保存したJSONも読めるように変換する
        const isV3 = "fundBal" in data || "fundNisaBal" in data;
        if (isReview && !confirm("検証用のファイルには、名前・引き継ぎ書の中身が入っていません。読み込むと、今の入力と引き継ぎ書はこのファイルの内容に置き換わります。続けますか？")) return;
        // 読み込んだ内容に足りない項目は、今の入力ではなく空の値で埋める（前の人の入力が混ざらないように）
        replacePlan(normalizePlan(isV3 ? migrateV3Plan(data) : (data as Partial<PlanInput>), { ...DEFAULT_PLAN, ...EMPTY_PLAN }));
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
  // スマホ用のタブ: 4等分のセグメント。短い名前でスクロールせずに全部見える
  const SHORT = ["入力", "レポート", "比較", "もしも"];
  const renderMobileTabs = () => (
    <nav className="grid grid-cols-4 gap-1 rounded-xl bg-white p-1" style={{ border: "2px solid #0a0a0a" }}>
      {TABS.map((tab, i) => {
        const active = i === activeIdx;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center justify-center rounded-lg py-1 transition-colors"
            style={{ background: active ? "#0a0a0a" : "transparent", color: active ? "#ffffff" : "#0a0a0a" }}
          >
            <span className="text-[9px] font-bold tabular-nums leading-none" style={{ opacity: active ? 0.6 : 0.45 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mt-0.5 whitespace-nowrap text-[11px] font-bold leading-none">{SHORT[i]}</span>
          </Link>
        );
      })}
    </nav>
  );

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
    <div className="lp-root min-h-screen" style={{ background: "#f0f0ee" }}>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-50 print:static"
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
              realValue={realValue}
              setRealValue={setRealValue}
              mcOn={mcOn}
              setMcOn={setMcOn}
              onSample={() => {
                if (
                  !plan.selfBirth ||
                  confirm(
                    "サンプル（35歳・会社員・持ち家）を読み込みます。\n今の入力内容は上書きされます。よろしいですか？",
                  )
                ) {
                  loadSample();
                  setUnlocked(true);
                }
              }}
              onExport={() => exportPlan(false)}
              onExportReview={() => exportPlan(true)}
              onImport={() => fileInputRef.current?.click()}
              onPdf={() => window.print()}
              onReset={() => {
                if (
                  confirm(
                    "入力内容をすべて消して、はじめの状態に戻しますか？\nこの操作は取り消せません。\n（念のため、先に「入力データを保存」でバックアップできます）",
                  )
                ) {
                  reset();
                  resetProgress();
                  closeAll();
                  router.push("/v4/detail");
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

        {/* スマホ: 4つのタブを1行に（スクロールで閉じる） */}
        <div
          className="no-print grid transition-[grid-template-rows] duration-200 ease-out sm:hidden"
          style={{ gridTemplateRows: tabsHidden ? "0fr" : "1fr" }}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-2">{renderMobileTabs()}</div>
          </div>
        </div>
      </header>
      <div aria-hidden className="print:hidden" style={{ height: headerFullH }} />

      {realValue ? (
        <div
          className="lp-banner px-4 py-1.5 text-[11px] leading-relaxed sm:px-8"
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
      {gated ? (
        <main className="px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <InputProgress mode="gate" />
          </div>
        </main>
      ) : (
        children
      )}
      <Footer />
      <ConsentDialog />
      {guideOpen ? (
        <GuideFlow mode="modal" onClose={() => setGuideOpen(false)} />
      ) : null}
    </div>
  );
}
