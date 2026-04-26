"use client";

import { useMemo } from "react";

import { MobileStickyBar } from "@/components/v1/MobileStickyBar";
import { ResultsPanel } from "@/components/v1/ResultsPanel";
import { AssetsSection } from "@/components/v1/sections/AssetsSection";
import { BasicSection } from "@/components/v1/sections/BasicSection";
import { EducationSection } from "@/components/v1/sections/EducationSection";
import { ExpenseSection } from "@/components/v1/sections/ExpenseSection";
import { HousingSection } from "@/components/v1/sections/HousingSection";
import { IncomeSection } from "@/components/v1/sections/IncomeSection";
import { InsuranceSection } from "@/components/v1/sections/InsuranceSection";
import { PensionSection } from "@/components/v1/sections/PensionSection";
import { RealEstateSection } from "@/components/v1/sections/RealEstateSection";
import { simulate } from "@/lib/v1/calc/simulate";
import { usePlanStore } from "@/store/v1/plan-store";

const fmt = (yen: number) => {
  const man = Math.round(yen / 10000);
  if (Math.abs(man) >= 10000) return `${(man / 10000).toFixed(1)}億`;
  return `${man.toLocaleString()}万`;
};

export default function Home() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const reset = usePlanStore((s) => s.reset);
  const result = useMemo(() => simulate(plan), [plan]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/60">
        loading...
      </main>
    );
  }

  const shortfall = result.shortfallAge;
  const nw = result.finalNetWorth;

  const insight = shortfall
    ? `⚠ ${shortfall}歳で資金不足の見込み`
    : nw >= 0
      ? `${plan.endAge}歳まで黒字の見込み`
      : `資産がマイナスになる見込み`;

  const insightAlert = !!shortfall || nw < 0;

  return (
    <>
      {/* ── STICKY HEADER ── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 sm:px-8"
        style={{
          background: "#f0f0ee",
          borderBottom: "2.5px solid #0a0a0a",
        }}
      >
        {/* LEFT: logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">
            LIFEPLAN SIMULATOR
          </span>
          <Badge label="VER 1" tone="calm" />
        </div>

        {/* CENTER: key KPIs + insight */}
        <div className="hidden flex-1 items-center justify-center gap-6 lg:flex">
          <KpiChip
            label="最終純資産"
            value={fmt(nw)}
            alert={nw < 0}
          />
          <KpiChip
            label="資金ショート"
            value={shortfall ? `${shortfall}歳` : "なし"}
            alert={!!shortfall}
          />
          <span
            className="text-[10px] font-bold tracking-wide"
            style={{ color: insightAlert ? "#c8383a" : "#0a0a0a99" }}
          >
            {insight}
          </span>
        </div>

        {/* RIGHT: actions */}
        <div className="flex shrink-0 items-center gap-2">
          <PrimaryButton>ログイン</PrimaryButton>
          <Button
            onClick={() => {
              if (confirm("入力内容を初期化しますか？")) reset();
            }}
          >
            初期化
          </Button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="px-4 py-4 pb-24 sm:px-8 sm:pb-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[220px_1fr] md:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-2">
              <BasicSection />
              <IncomeSection />
              <PensionSection />
              <AssetsSection />
              <ExpenseSection />
              <HousingSection />
              <EducationSection />
              <RealEstateSection />
              <InsuranceSection />
            </div>

            <aside className="sm:sticky sm:top-[56px] sm:max-h-[calc(100vh-56px)] sm:self-start sm:overflow-y-auto sm:pr-1">
              <ResultsPanel />
            </aside>
          </div>

          <MobileStickyBar />

          {/* ── FOOTER ── */}
          <footer
            className="mt-10 border-t pt-4"
            style={{ borderColor: "#0a0a0a30" }}
          >
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
              <p className="max-w-xl text-[9px] leading-relaxed text-[#0a0a0a]/45">
                免責事項：本ツールの計算結果はあくまで概算であり、投資・財務・税務アドバイスを目的とするものではありません。
                実際の資産運用・保険加入・税務申告等については、必ず専門家（FP・税理士・証券会社等）にご相談ください。
                計算上の誤差・損害について当サービスは一切の責任を負いません。
              </p>
              <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/40">
                <a href="/privacy" className="hover:text-[#0a0a0a]">プライバシーポリシー</a>
                <span>·</span>
                <a href="/terms" className="hover:text-[#0a0a0a]">利用規約</a>
                <span>·</span>
                <span>© 2026 SAKUMARU</span>
                <span>·</span>
                <span>v0.1.0-beta</span>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}

/* ── primitives ── */

function KpiChip({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/50">
        {label}
      </span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: alert ? "#c8383a" : "#0a0a0a" }}
      >
        {value}
      </span>
    </div>
  );
}

function Button({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 text-xs font-bold transition-colors duration-150 hover:bg-[#0a0a0a] hover:text-white"
      style={{
        height: 32,
        background: "#ffffff",
        color: "#0a0a0a",
        border: "2.5px solid #0a0a0a",
        borderRadius: 8,
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 text-xs font-bold text-white transition-colors duration-150 hover:bg-[#0a0a0a]"
      style={{
        height: 32,
        background: "#c8383a",
        border: "2.5px solid #0a0a0a",
        borderRadius: 8,
      }}
    >
      {children}
    </button>
  );
}

function Badge({ label, tone }: { label: string; tone: "action" | "calm" }) {
  const bg = tone === "action" ? "#c8383a" : "#66666a";
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-white"
      style={{
        height: 20,
        padding: "0 8px",
        background: bg,
        border: "2px solid #0a0a0a",
        borderRadius: 8,
      }}
    >
      {label}
    </span>
  );
}
