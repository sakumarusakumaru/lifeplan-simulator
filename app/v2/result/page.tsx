"use client";

import { useMemo } from "react";
import Link from "next/link";

import { AssetsChart } from "@/components/charts/AssetsChart";
import { CashflowChart } from "@/components/charts/CashflowChart";
import { simulate } from "@/lib/calc/simulate";
import { usePlanStore } from "@/store/plan-store";

const fmt = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
  return `${sign}${abs.toLocaleString()}万`;
};

function verdict(shortfallAge: number | null, nw: number, endAge: number) {
  if (shortfallAge) {
    return {
      headline: `${shortfallAge}歳で資金不足`,
      body: `このままでは${shortfallAge}歳時点で資産が底をつく見込みです。生活費の見直し・収入増・運用改善など早めの対策が必要です。`,
      alert: true,
    };
  }
  if (nw < 0) {
    return {
      headline: `${endAge}歳時点でマイナス`,
      body: `老後に資産がマイナスとなる見込みです。支出の削減と積立の強化が急務です。`,
      alert: true,
    };
  }
  if (nw < 10_000_000) {
    return {
      headline: `${endAge}歳まで完走（余裕わずか）`,
      body: `計画上は${endAge}歳まで資産が続きますが、余裕は少なめです。想定外の支出への備えを厚くしましょう。`,
      alert: false,
    };
  }
  if (nw < 50_000_000) {
    return {
      headline: `老後資金は概ね安定`,
      body: `資金計画は概ね良好です。インフレ・医療費リスクに備え、引き続き分散運用を続けましょう。`,
      alert: false,
    };
  }
  return {
    headline: `資産計画は非常に良好`,
    body: `余裕のある資産計画です。相続・贈与対策や資産の最適化を検討するタイミングです。`,
    alert: false,
  };
}

export default function ResultPage() {
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);

  const v = verdict(result.shortfallAge, result.finalNetWorth, plan.endAge);

  const lastJobEndAge =
    plan.jobs.length > 0
      ? Math.max(...plan.jobs.map((j) => j.end))
      : plan.penStartA;
  const retireRow = result.rows.find((r) => r.age === lastJobEndAge);
  const nwAt65 = result.rows.find((r) => r.age === 65)?.nw ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Verdict */}
      <div
        className="mb-6 rounded-2xl p-5"
        style={{
          background: v.alert ? "#fff0f0" : "#f0fff4",
          border: `2.5px solid ${v.alert ? "#c8383a" : "#22863a"}`,
        }}
      >
        <p
          className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: v.alert ? "#c8383a" : "#22863a" }}
        >
          診断結果
        </p>
        <p className="text-xl font-bold text-[#0a0a0a]">{v.headline}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[#0a0a0a]/70">{v.body}</p>
      </div>

      {/* KPI */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="最終純資産"
          value={fmt(result.finalNetWorth)}
          alert={result.finalNetWorth < 0}
        />
        <KpiCard
          label="資金ショート"
          value={result.shortfallAge ? `${result.shortfallAge}歳` : "なし"}
          alert={!!result.shortfallAge}
        />
        <KpiCard
          label="退職時の資産"
          value={retireRow ? fmt(retireRow.nw) : "-"}
        />
        <KpiCard
          label="65歳の純資産"
          value={fmt(nwAt65)}
          alert={nwAt65 < 0}
        />
      </div>

      {/* Assets chart */}
      <div className="mb-6">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">
          資産推移
        </p>
        <AssetsChart rows={result.rows} />
      </div>

      {/* Cashflow chart */}
      <div className="mb-8">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">
          年間キャッシュフロー
        </p>
        <CashflowChart rows={result.rows} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/v2/suggest"
          className="flex-1 py-3 text-center text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
          style={{
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
            color: "#0a0a0a",
          }}
        >
          改善提案を見る →
        </Link>
        <Link
          href="/v2/detail"
          className="flex-1 py-3 text-center text-xs font-bold text-white transition-colors hover:opacity-80"
          style={{
            background: "#0a0a0a",
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
          }}
        >
          詳細入力を修正する →
        </Link>
      </div>

      <p className="mt-4 text-[9px] leading-relaxed text-[#0a0a0a]/40">
        ※本結果は概算です。実際の年金額・税額・運用成果は異なります。投資・税務等の判断は必ず専門家にご相談ください。
      </p>
    </main>
  );
}

function KpiCard({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-3"
      style={{ border: "2px solid #0a0a0a22", background: "#fff" }}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide text-[#0a0a0a]/50">
        {label}
      </span>
      <span
        className="text-base font-bold tabular-nums"
        style={{ color: alert ? "#c8383a" : "#0a0a0a" }}
      >
        {value}
      </span>
    </div>
  );
}
