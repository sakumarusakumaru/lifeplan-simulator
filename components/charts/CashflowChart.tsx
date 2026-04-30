"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LifeEvent, YearlyResult } from "@/lib/calc/types";

interface CashflowChartProps {
  rows: YearlyResult[];
  lifeEvents?: LifeEvent[];
}

const fmtAbs = (yen: number): string => {
  const abs = Math.abs(Math.round(yen));
  const oku = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  if (oku > 0) return `${oku}億${man > 0 ? man.toLocaleString() + "万" : ""}`;
  return `${man.toLocaleString()}万`;
};

const axisFmt = (yen: number): string => {
  const abs = Math.abs(yen);
  if (abs >= 100_000_000) return `${(yen / 100_000_000).toFixed(1)}億`;
  if (abs >= 10_000) return `${Math.round(yen / 10_000)}万`;
  return String(Math.round(yen));
};

// 通常色
const FILLS = {
  income: "#334155",
  expense: "#9ca3af",
  invest: "#93c5fd",
  cf: "#c8383a",
};

// ホバー時のハイライト色（色相を明確に分離して取り違えを防止）
const FILLS_HOVER = {
  income: "#0f172a",  // 収入: 極暗スレート（冷たい青灰）
  expense: "#9a3412", // 支出: 暖色オレンジ赤（収入の冷色と明確に区別）
  invest: "#1d6fa8",  // 投資積立: 青
  cf: "#c8383a",
};

const KEYS: ("収入" | "支出" | "投資積立")[] = ["収入", "支出", "投資積立"];
const KEY_TO_FILL: Record<string, "income" | "expense" | "invest"> = {
  収入: "income",
  支出: "expense",
  投資積立: "invest",
};

export function CashflowChart({ rows, lifeEvents = [] }: CashflowChartProps) {
  const pathname = usePathname();
  const isV3 = pathname?.startsWith("/v3") ?? false;

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const data = rows.map((r) => ({
    age: r.age,
    収入: Math.round(r.income),
    支出: -Math.round(r.exp),
    投資積立: -Math.round(r.inv),
    収支: Math.round(r.cf),
  }));

  const getFill = (key: "収入" | "支出" | "投資積立"): string => {
    const k = KEY_TO_FILL[key];
    return hoveredKey === key ? FILLS_HOVER[k] : FILLS[k];
  };

  return (
    <div
      className="p-5"
      style={{
        background: "#f0f0ee",
        border: isV3 ? "none" : "2.5px solid #0a0a0a",
        borderRadius: 12,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">
          ANNUAL CASHFLOW
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
          INCOME · EXPENSE · NET
        </span>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            stackOffset="sign"
            margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
          >
            <CartesianGrid stroke="rgba(10,10,10,0.08)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="age"
              tick={{ fill: "#0a0a0a", fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: "#0a0a0a", strokeWidth: 2 }}
            />
            <YAxis
              tickFormatter={axisFmt}
              tick={{ fill: "#0a0a0a", fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: "#0a0a0a", strokeWidth: 2 }}
              width={48}
            />

            {/* 0円ライン */}
            <ReferenceLine y={0} stroke="#0a0a0a" strokeWidth={2} />

            <Tooltip
              content={({ payload, label }) => {
                if (!payload?.length) return null;
                const ORDER = ["収入", "支出", "投資積立", "収支"];
                const sorted = ORDER.map((k) =>
                  payload.find((p) => p.dataKey === k),
                ).filter(Boolean) as typeof payload;
                const cfEntry = sorted.find((e) => e.dataKey === "収支");
                const cf = Number(cfEntry?.value ?? 0);

                return (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "2.5px solid #0a0a0a",
                      borderRadius: 12,
                      padding: "14px 18px",
                      minWidth: 240,
                    }}
                  >
                    <p style={{ color: "#0a0a0a", fontWeight: 800, margin: "0 0 12px", fontSize: 17 }}>
                      {label}歳
                    </p>
                    {sorted.map((entry) => {
                      const key = entry.dataKey as string;
                      const val = Number(entry.value ?? 0);
                      const absVal = Math.abs(val);
                      const isCF = key === "収支";
                      const isIncome = key === "収入";
                      const sign = isCF ? (val >= 0 ? "+" : "−") : isIncome ? "+" : "−";
                      const isHovered = hoveredKey === key;
                      const valueColor = isCF
                        ? cf < 0
                          ? "#c8383a"
                          : "#22863a"
                        : "#0a0a0a";
                      return (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 7,
                            transform: isHovered ? "scale(1.08)" : "scale(1)",
                            transformOrigin: "left center",
                            transition: "transform 0.12s",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: 13,
                              height: 13,
                              flexShrink: 0,
                              background: isCF ? "transparent" : (entry.color as string),
                              border: isCF
                                ? `3px solid ${FILLS.cf}`
                                : "1px solid #0a0a0a20",
                              borderRadius: isCF ? 2 : 0,
                            }}
                          />
                          <span
                            style={{
                              color: "#0a0a0a",
                              flex: 1,
                              fontSize: isHovered ? 15 : 13,
                              fontWeight: isHovered ? 800 : 700,
                              transition: "all 0.12s",
                            }}
                          >
                            {entry.name}
                          </span>
                          <span
                            style={{
                              color: valueColor,
                              fontWeight: 800,
                              fontSize: isHovered ? 18 : 16,
                              transition: "all 0.12s",
                            }}
                          >
                            {sign}{fmtAbs(absVal)}
                          </span>
                        </div>
                      );
                    })}
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: "1.5px dashed #0a0a0a20",
                        fontSize: 12,
                        fontWeight: 700,
                        color: cf < 0 ? "#c8383a" : "#22863a",
                      }}
                    >
                      {cf < 0
                        ? "⚠ 収支マイナス → 資産を取り崩す年"
                        : "✓ 収支プラス → 現金が積み上がる年"}
                    </div>
                  </div>
                );
              }}
              cursor={{ fill: "rgba(10,10,10,0.05)" }}
              offset={28}
              wrapperStyle={{ pointerEvents: "none" }}
            />

            {KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="bb-cf"
                fill={getFill(key)}
                stroke="none"
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
              />
            ))}

            <Line
              type="linear"
              dataKey="収支"
              stroke={FILLS.cf}
              strokeWidth={hoveredKey === "収支" ? 3.5 : 2.5}
              dot={false}
              activeDot={{ r: 5, stroke: "#0a0a0a", strokeWidth: 2 }}
            />

            {lifeEvents.map((ev, idx) => (
              <ReferenceLine
                key={`${ev.age}-${ev.label}`}
                x={ev.age}
                stroke="#c8383a"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={(props: { viewBox?: { x: number; y: number } }) => {
                  const x = props.viewBox?.x ?? 0;
                  const y = props.viewBox?.y ?? 0;
                  const staggerY = (idx % 3) * 18;
                  return (
                    <g>
                      <circle cx={x} cy={y + staggerY + 9} r={7} fill="#c8383a" />
                      <text
                        x={x}
                        y={y + staggerY + 9}
                        fontSize={7}
                        fontWeight="bold"
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {lifeEvents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {lifeEvents.map((ev, idx) => (
            <div key={`leg-${ev.age}-${idx}`} className="flex items-center gap-1.5">
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: "#c8383a" }}
              >
                {idx + 1}
              </span>
              <span className="text-[10px] font-bold text-[#0a0a0a]">{ev.label}</span>
              <span className="text-[9px] text-[#66666a]">{ev.age}歳</span>
            </div>
          ))}
        </div>
      )}

      {/* グラフの読み方 */}
      <div
        className="mt-4 overflow-hidden rounded-xl"
        style={{ border: "1.5px solid #0a0a0a20" }}
      >
        {/* ゾーン構造図 */}
        <div style={{ background: "#ffffff", padding: "10px 14px", borderBottom: "1px solid #0a0a0a10" }}>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/55">
            グラフの構造 ／ CHART STRUCTURE
          </p>
          <div className="overflow-hidden rounded-lg" style={{ border: "1.5px solid #0a0a0a20" }}>
            {/* 収入ゾーン（上） */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ background: "#f8f9fb", borderBottom: "2px solid #0a0a0a" }}
            >
              <span
                style={{ background: FILLS.income, width: 12, height: 12, display: "inline-block", flexShrink: 0 }}
              />
              <span className="text-[11px] font-bold text-[#0a0a0a]">↑ 0より上 = 収入</span>
              <span className="text-[10px] text-[#0a0a0a]/50">給与・年金・副業の年間手取り</span>
            </div>
            {/* 0ラインバー */}
            <div className="flex items-center justify-center py-1" style={{ background: "#e0e0dd" }}>
              <span className="text-[9px] font-bold tracking-widest text-[#0a0a0a]/50">── 0円ライン ──</span>
            </div>
            {/* 支出ゾーン（下） */}
            <div className="px-3 py-2" style={{ background: "#f0f0ee" }}>
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  style={{ background: FILLS.expense, width: 12, height: 12, display: "inline-block", flexShrink: 0 }}
                />
                <span className="text-[11px] font-bold text-[#0a0a0a]">↓ 0より下 = 支出</span>
                <span className="text-[10px] text-[#0a0a0a]/50">生活費・住居費・教育費等</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{ background: FILLS.invest, width: 12, height: 12, display: "inline-block", flexShrink: 0 }}
                />
                <span className="text-[11px] font-bold text-[#0a0a0a]">↓↓ さらに下 = 投資積立</span>
                <span className="text-[10px] text-[#0a0a0a]/50">NISA・DC・株への積立額</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[9px] text-[#0a0a0a]/45">
            ※ 棒の上にマウスをかざすと、その項目が拡大表示されます。
          </p>
        </div>

        {/* 収支ライン説明 */}
        <div style={{ background: "#ffffff", padding: "10px 14px" }}>
          <div className="mb-1 flex items-center gap-2">
            <span
              style={{ display: "inline-block", width: 18, height: 3, background: FILLS.cf, flexShrink: 0 }}
            />
            <span className="text-[11px] font-bold text-[#0a0a0a]">赤い線 = 年間収支</span>
          </div>
          <p className="text-[10px] leading-relaxed text-[#0a0a0a]/55">
            収入 − 支出 − 投資積立 の結果。線がマイナスの年は不足分を資産（貯蓄・投資）から取り崩します。
          </p>
        </div>
      </div>
    </div>
  );
}
