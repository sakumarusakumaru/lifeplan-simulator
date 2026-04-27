"use client";

import { useMemo, useState } from "react";

import { AssetsChart } from "@/components/charts/AssetsChart";
import { CashflowChart } from "@/components/charts/CashflowChart";
import { generateLifeEvents } from "@/lib/calc/generateLifeEvents";
import { simulate } from "@/lib/calc/simulate";
import type { YearlyResult } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const yenToOkuMan = (yen: number): string => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen));
  const oku = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  if (oku > 0) return `${sign}${oku}億${man.toLocaleString()}万`;
  return `${sign}${man.toLocaleString()}万`;
};

export function ResultsPanel() {
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);
  const [showTable, setShowTable] = useState(false);

  const lifeEvents = useMemo(() => generateLifeEvents(plan), [plan]);

  return (
    <div className="flex flex-col gap-4">
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

