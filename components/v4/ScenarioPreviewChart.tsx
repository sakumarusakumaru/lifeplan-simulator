"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { SimulationSummary } from "@/lib/v4/calc/types";

const INK = "#0a0a0a";
const GREEN = "#22863a";
const RED = "#c8383a";

const axisFmt = (yen: number) =>
  Math.abs(yen) >= 100_000_000 ? `${(yen / 100_000_000).toFixed(1)}億` : `${Math.round(yen / 10000)}万`;
const fmtDelta = (yen: number) => {
  const sign = yen >= 0 ? "+" : "-";
  const abs = Math.abs(Math.round(yen / 10000));
  return abs >= 10000 ? `${sign}${(abs / 10000).toFixed(1)}億` : `${sign}${abs.toLocaleString()}万`;
};

// シナリオ比較の上に固定するグラフ。
// 打ち手のカードを押している間（PCはマウスを乗せている間）だけ、線がその打ち手の結果に変わる。
// 線は常に1本を描き、データだけ差し替えるので「元の線から変化する」アニメーションになる。
export function ScenarioPreviewChart({
  base,
  preview,
  previewTitle,
}: {
  base: SimulationSummary;
  preview: SimulationSummary | null;
  previewTitle: string | null;
}) {
  const shown = preview ?? base;
  const delta = preview ? preview.finalNetWorth - base.finalNetWorth : 0;
  const color = !preview ? INK : delta >= 0 ? GREEN : RED;
  const data = base.rows.map((r, i) => ({
    age: r.age,
    いま: Math.round(r.nw),
    試算: Math.round(shown.rows[i]?.nw ?? r.nw),
  }));

  return (
    <div
      className="sticky z-20 -mx-4 mb-4 px-4 pt-2 pb-3 sm:-mx-8 sm:px-8"
      style={{ top: "var(--lp-header-h, 56px)", background: "#f0f0ee", borderBottom: "2px solid #0a0a0a15" }}
    >
      <div className="mb-1 flex min-h-[34px] items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/50">
            {preview ? "この打ち手を試すと" : "いまのプランの純資産"}
          </p>
          <p className="truncate text-[12px] font-bold" style={{ color: preview ? color : INK }}>
            {preview ? previewTitle : "下のカードを長押しすると、グラフがその打ち手に変わります"}
          </p>
        </div>
        {preview ? (
          <span className="shrink-0 text-lg font-bold tabular-nums" style={{ color }}>
            {fmtDelta(delta)}
          </span>
        ) : null}
      </div>
      <div className="h-[150px] w-full sm:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(10,10,10,0.08)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" tick={{ fill: INK, fontSize: 10 }} tickLine={false} minTickGap={16} />
            <YAxis tickFormatter={axisFmt} tick={{ fill: INK, fontSize: 10 }} width={52} tickLine={false} />
            <ReferenceLine y={0} stroke={INK} />
            <Line type="monotone" dataKey="いま" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="試算"
              stroke={color}
              strokeWidth={3}
              dot={false}
              isAnimationActive
              animationDuration={350}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex gap-3 text-[10px] text-[#0a0a0a]/60">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: "#94a3b8" }} />
          いまのプラン
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4" style={{ background: preview ? color : INK }} />
          {preview ? "打ち手を試した場合" : "（押すとここが変わる）"}
        </span>
      </div>
    </div>
  );
}
