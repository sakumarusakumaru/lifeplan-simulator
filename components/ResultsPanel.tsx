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
          border: "2px solid #0a0a0a",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#0a0a0a]"
          style={{ background: showTable ? "#0a0a0a" : "#ffffff" }}
        >
          {/* 左: アイコン + ラベル */}
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
              style={{
                background: showTable ? "#ffffff18" : "#0a0a0a",
                border: showTable ? "1.5px solid #ffffff40" : "none",
              }}
            >
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                className={`transition-transform duration-200 ${showTable ? "rotate-180" : ""}`}
              >
                <rect x="1" y="2" width="10" height="1.5" rx="0.75"
                  fill={showTable ? "#ffffff" : "#f0f0ee"} />
                <rect x="1" y="5.25" width="7" height="1.5" rx="0.75"
                  fill={showTable ? "#ffffff" : "#f0f0ee"} />
                <rect x="1" y="8.5" width="4.5" height="1.5" rx="0.75"
                  fill={showTable ? "#ffffff" : "#f0f0ee"} />
              </svg>
            </span>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: showTable ? "#ffffff" : "#0a0a0a" }}
              >
                年次サマリー
              </p>
              <p
                className="text-[8px] font-bold uppercase tracking-[0.12em]"
                style={{ color: showTable ? "#ffffff80" : "#0a0a0a55" }}
              >
                {result.rows.length}年分の収支・資産推移
              </p>
            </div>
          </div>

          {/* 右: 開閉バッジ */}
          <span
            className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] transition-colors"
            style={{
              background: showTable ? "#ffffff18" : "#0a0a0a",
              color: showTable ? "#ffffff" : "#f0f0ee",
              border: showTable ? "1px solid #ffffff30" : "none",
            }}
          >
            {showTable ? "閉じる" : "開く"}
            <span
              className={`inline-block transition-transform duration-200 ${showTable ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </span>
        </button>
        {showTable ? <YearlyTable rows={result.rows} /> : null}
      </div>
    </div>
  );
}

function YearlyTable({ rows }: { rows: YearlyResult[] }) {
  // デザイントークン（サイト統一）
  const BG_H1  = "#0a0a0a";
  const BG_INC = "#2a2a2a";
  const BG_EXP = "#3d3d3d";
  const FG     = "#ffffff";
  const SEP    = "1px solid rgba(10,10,10,0.09)";
  const SEP_G  = "1.5px solid rgba(10,10,10,0.20)";

  // ヘッダーセル共通スタイル
  const hBase: React.CSSProperties = { color: FG, fontWeight: 700, fontSize: 7, fontFamily: "inherit" };
  const hTop  = (bg: string, extra?: React.CSSProperties): React.CSSProperties =>
    ({ ...hBase, background: bg, padding: "3px 3px", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.12em", ...extra });
  const hSub  = (bg: string, extra?: React.CSSProperties): React.CSSProperties =>
    ({ ...hBase, background: bg, padding: "2px 3px", textAlign: "right", ...extra });

  // ボディセル共通スタイル
  const cBase: React.CSSProperties = { fontSize: 8, padding: "2px 4px", textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const cTotal = (extra?: React.CSSProperties): React.CSSProperties =>
    ({ ...cBase, fontWeight: 700, color: "#0a0a0a", ...extra });
  const cSub   = (extra?: React.CSSProperties): React.CSSProperties =>
    ({ ...cBase, color: "rgba(10,10,10,0.68)", ...extra });

  return (
    <div className="overflow-x-auto" style={{ borderTop: "2px solid #0a0a0a" }}>
      <table className="border-collapse" style={{ minWidth: 680, width: "100%" }}>
        <thead>
          {/* 1段目: グループヘッダー */}
          <tr>
            <th rowSpan={2} style={hTop(BG_H1, { borderRight: SEP_G, padding: "4px 4px", fontSize: 8, letterSpacing: "0.08em" })}>歳</th>
            <th colSpan={5} style={hTop(BG_H1, { borderRight: SEP_G })}>収入 INCOME</th>
            <th colSpan={7} style={hTop(BG_H1, { borderRight: SEP_G })}>支出 EXPENSE</th>
            <th rowSpan={2} style={hTop(BG_H1, { borderRight: SEP_G, padding: "4px 3px", fontSize: 8 })}>積立</th>
            <th rowSpan={2} style={hTop(BG_H1, { borderRight: SEP_G, padding: "4px 3px", fontSize: 8 })}>CF</th>
            <th rowSpan={2} style={hTop(BG_H1, { borderRight: SEP_G, padding: "4px 3px", fontSize: 8 })}>取崩</th>
            <th rowSpan={2} style={hTop(BG_H1, { padding: "4px 3px", fontSize: 8 })}>純資産</th>
          </tr>
          {/* 2段目: 詳細ヘッダー */}
          <tr>
            <th style={hSub(BG_INC)}>合計</th>
            <th style={hSub(BG_INC)}>給与</th>
            <th style={hSub(BG_INC)}>年金</th>
            <th style={hSub(BG_INC)}>不動産</th>
            <th style={hSub(BG_INC, { borderRight: SEP_G })}>相続他</th>
            <th style={hSub(BG_EXP)}>合計</th>
            <th style={hSub(BG_EXP)}>生活</th>
            <th style={hSub(BG_EXP)}>住居</th>
            <th style={hSub(BG_EXP)}>教育</th>
            <th style={hSub(BG_EXP)}>保険</th>
            <th style={hSub(BG_EXP)}>介護</th>
            <th style={hSub(BG_EXP, { borderRight: SEP_G })}>他</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const otherInc = r.inherit;
            const otherExp = r.lifeExp + r.otherLoanPay;
            const cfColor  = r.cf < 0 ? "#c8383a" : "#22863a";
            const cfSign   = r.cf < 0 ? "−" : "+";
            const nwColor  = r.nw < 0 ? "#c8383a" : "#0a0a0a";
            const rowBg    = i % 2 === 0 ? "#f8f8f6" : "#ffffff";
            const bt       = i === 0 ? "none" : SEP;
            return (
              <tr key={r.age} style={{ background: rowBg, borderTop: bt }}>
                {/* 歳 */}
                <td style={{ ...cBase, textAlign: "center", fontWeight: 700, color: "#0a0a0a", background: "#f0f0ee", borderRight: SEP_G }}>
                  {r.age}
                </td>
                {/* 収入 */}
                <td style={cTotal()}>{yenToOkuMan(r.income)}</td>
                <td style={cSub()}>{yenToOkuMan(r.jobNet)}</td>
                <td style={cSub()}>{yenToOkuMan(r.penNet)}</td>
                <td style={cSub()}>{yenToOkuMan(r.reInc)}</td>
                <td style={cSub({ borderRight: SEP_G })}>{yenToOkuMan(otherInc)}</td>
                {/* 支出 */}
                <td style={cTotal()}>{yenToOkuMan(r.exp)}</td>
                <td style={cSub()}>{yenToOkuMan(r.basic)}</td>
                <td style={cSub()}>{yenToOkuMan(r.home)}</td>
                <td style={cSub()}>{yenToOkuMan(r.edu)}</td>
                <td style={cSub()}>{yenToOkuMan(r.ins)}</td>
                <td style={cSub()}>{yenToOkuMan(r.care)}</td>
                <td style={cSub({ borderRight: SEP_G })}>{yenToOkuMan(otherExp)}</td>
                {/* 積立 */}
                <td style={{ ...cBase, fontWeight: 700, color: "#0a0a0a", borderRight: SEP_G }}>{yenToOkuMan(r.inv)}</td>
                {/* CF */}
                <td style={{ ...cBase, fontWeight: 700, color: cfColor, borderRight: SEP_G }}>
                  {cfSign}{yenToOkuMan(Math.abs(r.cf))}
                </td>
                {/* 取崩 */}
                <td style={cSub({ borderRight: SEP_G })}>{yenToOkuMan(r.draw)}</td>
                {/* 純資産 */}
                <td style={{ ...cBase, fontWeight: 700, color: nwColor }}>{yenToOkuMan(r.nw)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

