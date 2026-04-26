"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
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

const yenToOkuMan = (yen: number): string => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen));
  const oku = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  if (oku > 0) return `${sign}${oku}億${man.toLocaleString()}万`;
  return `${sign}${man.toLocaleString()}万`;
};

const axisFmt = (yen: number): string => {
  const abs = Math.abs(yen);
  if (abs >= 100_000_000) return `${(yen / 100_000_000).toFixed(1)}億`;
  if (abs >= 10_000) return `${Math.round(yen / 10_000)}万`;
  return String(Math.round(yen));
};

const FILLS = {
  income: "#475569",
  expense: "#94a3b8",
  invest: "#dde6ef",
  cf: "#c8383a",
};

export function CashflowChart({ rows, lifeEvents = [] }: CashflowChartProps) {
  const data = rows.map((r) => ({
    age: r.age,
    収入: Math.round(r.income),
    支出: -Math.round(r.exp),
    投資積立: -Math.round(r.inv),
    収支: Math.round(r.cf),
  }));

  return (
    <div
      className="p-5"
      style={{
        background: "#f0f0ee",
        border: "2.5px solid #0a0a0a",
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
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
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
            <Tooltip
              formatter={(v) => yenToOkuMan(Math.abs(Number(v) || 0))}
              labelFormatter={(age) => `${age}歳`}
              contentStyle={{
                background: "#f0f0ee",
                border: "2.5px solid #0a0a0a",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 12px",
              }}
              cursor={{ fill: "rgba(10,10,10,0.05)" }}
            />
            <Legend
              wrapperStyle={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#0a0a0a",
              }}
              iconType="square"
            />
            <Bar dataKey="収入" stackId="bb-cf" fill={FILLS.income} stroke={FILLS.income} strokeWidth={0.5} />
            <Bar dataKey="支出" stackId="bb-cf" fill={FILLS.expense} stroke={FILLS.expense} strokeWidth={0.5} />
            <Bar dataKey="投資積立" stackId="bb-cf" fill={FILLS.invest} stroke={FILLS.invest} strokeWidth={0.5} />
            <Line
              type="linear"
              dataKey="収支"
              stroke={FILLS.cf}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, stroke: "#0a0a0a", strokeWidth: 2 }}
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
    </div>
  );
}
