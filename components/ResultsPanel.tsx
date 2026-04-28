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
  // 縦罫線（グループ境界）
  const VBORDER = "1px solid rgba(255,255,255,0.22)";
  const VBORDER_BODY = "1px solid rgba(10,10,10,0.12)";

  return (
    <div className="overflow-x-auto" style={{ borderTop: "2.5px solid #0a0a0a" }}>
      <table
        className="border-collapse text-[10px]"
        style={{ minWidth: 1100, width: "100%" }}
      >
        <thead>
          {/* 1段目: グループヘッダ */}
          <tr className="text-white">
            <th
              rowSpan={2}
              className="px-2 py-1.5 text-center font-bold tracking-wider"
              style={{ background: "#0a0a0a", borderRight: VBORDER }}
            >
              AGE
            </th>
            <th
              colSpan={5}
              className="px-2 py-1 text-center text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ background: "#1e293b", borderRight: VBORDER }}
            >
              収入 INCOME
            </th>
            <th
              colSpan={7}
              className="px-2 py-1 text-center text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ background: "#525252", borderRight: VBORDER }}
            >
              支出 EXPENSE
            </th>
            <th
              rowSpan={2}
              className="px-2 py-1.5 text-center text-[10px] font-bold leading-tight"
              style={{ background: "#1e3a8a", borderRight: VBORDER }}
            >
              投資<br />積立
            </th>
            <th
              rowSpan={2}
              className="px-2 py-1.5 text-center text-[10px] font-bold leading-tight"
              style={{ background: "#0a0a0a", borderRight: VBORDER }}
            >
              収支<br />CF
            </th>
            <th
              rowSpan={2}
              className="px-2 py-1.5 text-center text-[10px] font-bold"
              style={{ background: "#0a0a0a", borderRight: VBORDER }}
            >
              取崩
            </th>
            <th
              rowSpan={2}
              className="px-2 py-1.5 text-center text-[10px] font-bold"
              style={{ background: "#0a0a0a" }}
            >
              純資産
            </th>
          </tr>
          {/* 2段目: 詳細ヘッダ */}
          <tr className="text-white">
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#1e293b" }}
            >
              合計
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#334155" }}
            >
              給与
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#334155" }}
            >
              年金
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#334155" }}
            >
              不動産
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#334155", borderRight: VBORDER }}
            >
              相続他
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#525252" }}
            >
              合計
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#6b7280" }}
            >
              生活
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#6b7280" }}
            >
              住居
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#6b7280" }}
            >
              教育
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#6b7280" }}
            >
              保険
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#6b7280" }}
            >
              介護
            </th>
            <th
              className="px-2 py-1 text-right text-[9px] font-bold"
              style={{ background: "#6b7280", borderRight: VBORDER }}
            >
              他
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const otherInc = r.inherit;
            const otherExp = r.lifeExp + r.otherLoanPay;
            const cfColor = r.cf < 0 ? "#c8383a" : "#22863a";
            const cfSign = r.cf < 0 ? "−" : "+";
            const nwColor = r.nw < 0 ? "#c8383a" : "#0a0a0a";
            const sub = "tabular-nums text-[#0a0a0a]/55";
            const total = "tabular-nums font-bold text-[#0a0a0a]";
            return (
              <tr
                key={r.age}
                style={{
                  borderTop: i === 0 ? "none" : "1px solid rgba(10,10,10,0.08)",
                  background: i % 2 === 0 ? "#f0f0ee" : "#e8e8e6",
                }}
              >
                <td
                  className="px-2 py-1 text-center font-bold tabular-nums"
                  style={{ borderRight: VBORDER_BODY }}
                >
                  {r.age}
                </td>
                {/* 収入 */}
                <td className={`px-2 py-1 text-right ${total}`}>{yenToOkuMan(r.income)}</td>
                <td className={`px-2 py-1 text-right ${sub}`}>{yenToOkuMan(r.jobNet)}</td>
                <td className={`px-2 py-1 text-right ${sub}`}>{yenToOkuMan(r.penNet)}</td>
                <td className={`px-2 py-1 text-right ${sub}`}>{yenToOkuMan(r.reInc)}</td>
                <td
                  className={`px-2 py-1 text-right ${sub}`}
                  style={{ borderRight: VBORDER_BODY }}
                >
                  {yenToOkuMan(otherInc)}
                </td>
                {/* 支出 */}
                <td className={`px-2 py-1 text-right ${total}`}>{yenToOkuMan(r.exp)}</td>
                <td className={`px-2 py-1 text-right ${sub}`}>{yenToOkuMan(r.basic)}</td>
                <td className={`px-2 py-1 text-right ${sub}`}>{yenToOkuMan(r.home)}</td>
                <td className={`px-2 py-1 text-right ${sub}`}>{yenToOkuMan(r.edu)}</td>
                <td className={`px-2 py-1 text-right ${sub}`}>{yenToOkuMan(r.ins)}</td>
                <td className={`px-2 py-1 text-right ${sub}`}>{yenToOkuMan(r.care)}</td>
                <td
                  className={`px-2 py-1 text-right ${sub}`}
                  style={{ borderRight: VBORDER_BODY }}
                >
                  {yenToOkuMan(otherExp)}
                </td>
                {/* 投資積立 */}
                <td
                  className="px-2 py-1 text-right tabular-nums font-bold"
                  style={{ color: "#1e3a8a", borderRight: VBORDER_BODY }}
                >
                  {yenToOkuMan(r.inv)}
                </td>
                {/* 収支 CF */}
                <td
                  className="px-2 py-1 text-right tabular-nums font-bold"
                  style={{ color: cfColor, borderRight: VBORDER_BODY }}
                >
                  {cfSign}
                  {yenToOkuMan(Math.abs(r.cf))}
                </td>
                {/* 取崩 */}
                <td
                  className={`px-2 py-1 text-right ${sub}`}
                  style={{ borderRight: VBORDER_BODY }}
                >
                  {yenToOkuMan(r.draw)}
                </td>
                {/* 純資産 */}
                <td
                  className="px-2 py-1 text-right tabular-nums font-bold"
                  style={{ color: nwColor }}
                >
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

