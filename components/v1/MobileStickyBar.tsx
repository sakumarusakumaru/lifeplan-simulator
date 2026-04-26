"use client";

import { useMemo } from "react";

import { simulate } from "@/lib/v1/calc/simulate";
import { usePlanStore } from "@/store/v1/plan-store";

const yenToOkuMan = (yen: number): string => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen));
  const oku = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  if (oku > 0) return `${sign}${oku}億${man.toLocaleString()}万`;
  return `${sign}${man.toLocaleString()}万`;
};

interface MiniLineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}

function MiniLine({ values, width = 110, height = 36, stroke = "#c8383a" }: MiniLineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  // Zero baseline if min < 0 < max
  const zeroY =
    min < 0 && max > 0 ? height - ((0 - min) / range) * height : null;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {zeroY !== null ? (
        <line
          x1={0}
          x2={width}
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(10,10,10,0.2)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      ) : null}
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function MobileStickyBar() {
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);
  const nwSeries = result.rows.map((r) => r.nw);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 sm:hidden"
      style={{
        background: "#f0f0ee",
        borderTop: "2.5px solid #0a0a0a",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex-1">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
            FINAL NET WORTH
          </div>
          <div className="text-base font-bold tabular-nums text-[#0a0a0a]">
            {yenToOkuMan(result.finalNetWorth)}
          </div>
        </div>

        <div
          className="flex items-center justify-center"
          style={{
            border: "2.5px solid #0a0a0a",
            borderRadius: 12,
            padding: "4px 6px",
            background: "#ffffff",
          }}
        >
          <MiniLine values={nwSeries} />
        </div>

        {result.shortfallAge ? (
          <span
            className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-white"
            style={{
              height: 28,
              padding: "0 10px",
              background: "#c8383a",
              border: "2.5px solid #0a0a0a",
              borderRadius: 12,
            }}
          >
            SHORT {result.shortfallAge}歳
          </span>
        ) : (
          <span
            className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-white"
            style={{
              height: 28,
              padding: "0 10px",
              background: "#0a0a0a",
              border: "2.5px solid #0a0a0a",
              borderRadius: 12,
            }}
          >
            OK
          </span>
        )}
      </div>
    </div>
  );
}
