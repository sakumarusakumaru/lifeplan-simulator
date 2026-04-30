"use client";

import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const isV3 = pathname?.startsWith("/v3") ?? false;
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
          border: isV3 ? "none" : "2.5px solid #0a0a0a",
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
  const H1 = { background: "#0a0a0a", color: "#ffffff" } as const;
  const H2_INC = { background: "#2a2a2a", color: "#ffffff" } as const;
  const H2_EXP = { background: "#444444", color: "#ffffff" } as const;
  const SEP = "1px solid rgba(10,10,10,0.10)";
  const SEP_GROUP = "1.5px solid rgba(10,10,10,0.22)";

  return (
    <div className="overflow-x-auto" style={{ borderTop: "2px solid #0a0a0a" }}>
      <table
        className="border-collapse"
        style={{ minWidth: 520, width: "100%", fontSize: 9 }}
      >
        <thead>
          {/* 1段目: グループラベル */}
          <tr>
            <th rowSpan={2} style={{ ...H1, borderRight: SEP_GROUP, padding: "4px 6px", textAlign: "center", fontWeight: 700, letterSpacing: "0.12em", fontSize: 8 }}>
              歳
            </th>
            <th colSpan={3} style={{ ...H1, borderRight: SEP_GROUP, padding: "3px 6px", textAlign: "center", fontWeight: 700, letterSpacing: "0.14em", fontSize: 7, textTransform: "uppercase" }}>
              収入 INCOME
            </th>
            <th colSpan={3} style={{ ...H1, borderRight: SEP_GROUP, padding: "3px 6px", textAlign: "center", fontWeight: 700, letterSpacing: "0.14em", fontSize: 7, textTransform: "uppercase" }}>
              支出 EXPENSE
            </th>
            <th rowSpan={2} style={{ ...H1, borderRight: SEP, padding: "4px 6px", textAlign: "center", fontWeight: 700, fontSize: 8 }}>
              CF
            </th>
            <th rowSpan={2} style={{ ...H1, padding: "4px 6px", textAlign: "center", fontWeight: 700, letterSpacing: "0.08em", fontSize: 8 }}>
              純資産
            </th>
          </tr>
          {/* 2段目: 詳細ラベル */}
          <tr>
            <th style={{ ...H2_INC, borderRight: SEP, padding: "3px 6px", textAlign: "right", fontWeight: 700, fontSize: 7 }}>合計</th>
            <th style={{ ...H2_INC, borderRight: SEP, padding: "3px 6px", textAlign: "right", fontWeight: 700, fontSize: 7 }}>給与</th>
            <th style={{ ...H2_INC, borderRight: SEP_GROUP, padding: "3px 6px", textAlign: "right", fontWeight: 700, fontSize: 7 }}>年金</th>
            <th style={{ ...H2_EXP, borderRight: SEP, padding: "3px 6px", textAlign: "right", fontWeight: 700, fontSize: 7 }}>合計</th>
            <th style={{ ...H2_EXP, borderRight: SEP, padding: "3px 6px", textAlign: "right", fontWeight: 700, fontSize: 7 }}>生活</th>
            <th style={{ ...H2_EXP, borderRight: SEP_GROUP, padding: "3px 6px", textAlign: "right", fontWeight: 700, fontSize: 7 }}>住居</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const cfColor = r.cf < 0 ? "#c8383a" : "#22863a";
            const cfSign = r.cf < 0 ? "−" : "+";
            const nwColor = r.nw < 0 ? "#c8383a" : "#0a0a0a";
            const rowBg = i % 2 === 0 ? "#f8f8f6" : "#ffffff";
            const cell = { padding: "3px 6px", textAlign: "right" as const, tabularNums: true, borderTop: i === 0 ? "none" : SEP };
            return (
              <tr key={r.age} style={{ background: rowBg, borderTop: i === 0 ? "none" : SEP }}>
                {/* 歳 */}
                <td style={{ ...cell, textAlign: "center", fontWeight: 700, color: "#0a0a0a", borderRight: SEP_GROUP, background: "#f0f0ee" }}>
                  {r.age}
                </td>
                {/* 収入合計 */}
                <td style={{ ...cell, fontWeight: 700, color: "#0a0a0a", borderRight: SEP }}>
                  {yenToOkuMan(r.income)}
                </td>
                {/* 給与 */}
                <td style={{ ...cell, color: "rgba(10,10,10,0.5)", borderRight: SEP }}>
                  {yenToOkuMan(r.jobNet)}
                </td>
                {/* 年金 */}
                <td style={{ ...cell, color: "rgba(10,10,10,0.5)", borderRight: SEP_GROUP }}>
                  {yenToOkuMan(r.penNet)}
                </td>
                {/* 支出合計 */}
                <td style={{ ...cell, fontWeight: 700, color: "#0a0a0a", borderRight: SEP }}>
                  {yenToOkuMan(r.exp)}
                </td>
                {/* 生活費 */}
                <td style={{ ...cell, color: "rgba(10,10,10,0.5)", borderRight: SEP }}>
                  {yenToOkuMan(r.basic)}
                </td>
                {/* 住居費 */}
                <td style={{ ...cell, color: "rgba(10,10,10,0.5)", borderRight: SEP_GROUP }}>
                  {yenToOkuMan(r.home)}
                </td>
                {/* CF */}
                <td style={{ ...cell, fontWeight: 700, color: cfColor, borderRight: SEP }}>
                  {cfSign}{yenToOkuMan(Math.abs(r.cf))}
                </td>
                {/* 純資産 */}
                <td style={{ ...cell, fontWeight: 700, color: nwColor }}>
                  {yenToOkuMan(r.nw)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

