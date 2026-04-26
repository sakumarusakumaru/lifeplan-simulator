"use client";

import { useMemo, useState } from "react";

import { AssetsChart } from "@/components/v1/charts/AssetsChart";
import { CashflowChart } from "@/components/v1/charts/CashflowChart";
import { generateLifeEvents } from "@/lib/v1/calc/generateLifeEvents";
import { simulate } from "@/lib/v1/calc/simulate";
import type { SimulationSummary, YearlyResult } from "@/lib/v1/calc/types";
import { usePlanStore } from "@/store/v1/plan-store";

const yenToOkuMan = (yen: number): string => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen));
  const oku = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  if (oku > 0) return `${sign}${oku}億${man.toLocaleString()}万`;
  return `${sign}${man.toLocaleString()}万`;
};

function makeFpComment(result: SimulationSummary, endAge: number): string {
  const nw = result.finalNetWorth;
  const sa = result.shortfallAge;

  if (sa) {
    return `${sa}歳時点で資産が底をつく見込みです。現在の支出水準では老後資金が不足します。生活費の見直し・副業収入の確保・投資リターンの改善など、複数の対策を早めに検討してください。`;
  }
  if (nw < 0) {
    return `${endAge}歳時点で資産はマイナスとなる見込みです。支出の削減と積立額の増加が急務です。収支バランスの改善に向け、固定費の見直しから始めることをお勧めします。`;
  }
  if (nw < 10_000_000) {
    return `${endAge}歳まで完走できる見込みですが、余裕は少なめです。想定外の支出に備え、生活防衛資金の積み増しと支出管理の徹底をお勧めします。`;
  }
  if (nw < 50_000_000) {
    return `老後の資金計画は概ね安定しています。インフレや医療費増加のリスクに備え、資産の一部を株式・投信で分散運用し、実質的な購買力を維持することをご検討ください。`;
  }
  return `資産計画は非常に良好です。余剰資金を活用した資産の最適化や相続・贈与対策を検討するタイミングです。FPへの個別相談で更なる資産効率の向上を図りましょう。`;
}

export function ResultsPanel() {
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);
  const [showTable, setShowTable] = useState(false);

  const lifeEvents = useMemo(() => generateLifeEvents(plan), [plan]);
  const fpComment = makeFpComment(result, plan.endAge);
  const isAlert = !!result.shortfallAge || result.finalNetWorth < 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="p-4"
        style={{
          background: isAlert ? "#fff5f5" : "#f0f0ee",
          border: `2.5px solid ${isAlert ? "#c8383a" : "#0a0a0a"}`,
          borderRadius: 12,
        }}
      >
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: isAlert ? "#c8383a" : "#66666a" }}>
          FP INSIGHT
        </div>
        <p className="text-xs font-bold leading-relaxed" style={{ color: "#0a0a0a" }}>
          {fpComment}
        </p>
      </div>

      <AssetsChart rows={result.rows} lifeEvents={lifeEvents} />
      <CashflowChart rows={result.rows} lifeEvents={lifeEvents} />

      <div
        style={{
          background: "#f0f0ee",
          border: "2.5px solid #0a0a0a",
          borderRadius: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">
            年次サマリー · {result.rows.length}年
          </span>
          <span
            aria-hidden
            className={`text-base font-bold text-[#0a0a0a] transition-transform duration-200 ${showTable ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>
        {showTable ? <YearlyTable rows={result.rows} /> : null}
      </div>
    </div>
  );
}

function YearlyTable({ rows }: { rows: YearlyResult[] }) {
  return (
    <div className="overflow-x-auto" style={{ borderTop: "2.5px solid #0a0a0a" }}>
      <table className="w-full border-collapse text-xs">
        <thead className="bg-[#0a0a0a] text-left uppercase tracking-[0.12em] text-white">
          <tr>
            <th className="px-3 py-2 font-bold">AGE</th>
            <th className="px-3 py-2 text-right font-bold">純資産</th>
            <th className="px-3 py-2 text-right font-bold">現金</th>
            <th className="px-3 py-2 text-right font-bold">投信</th>
            <th className="px-3 py-2 text-right font-bold">株</th>
            <th className="px-3 py-2 text-right font-bold">DC</th>
            <th className="px-3 py-2 text-right font-bold">CF</th>
            <th className="px-3 py-2 text-right font-bold">取崩</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.age}
              style={{
                borderTop: i === 0 ? "none" : "1px solid rgba(10,10,10,0.08)",
                background: i % 2 === 0 ? "#f0f0ee" : "#e8e8e6",
              }}
            >
              <td className="px-3 py-1.5 font-bold">{r.age}</td>
              <td className="px-3 py-1.5 text-right font-bold tabular-nums">{yenToOkuMan(r.nw)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{yenToOkuMan(r.ass.c)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{yenToOkuMan(r.ass.f)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{yenToOkuMan(r.ass.s)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{yenToOkuMan(r.ass.dc)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{yenToOkuMan(r.cf)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{yenToOkuMan(r.draw)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

