"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { GREEN, INK, RED, man } from "./controls";

// 年齢ごとの「お金（預金＋投資）」。0を下回ったところが足りなくなる年齢
export function LiteChart({
  data,
  retireAge,
  events = [],
}: {
  data: { age: number; fin: number }[];
  retireAge: number;
  events?: { age: number; label: string }[]; // その人のできごと（番号の印をつけ、下に一覧）
}) {
  const min = Math.min(0, ...data.map((d) => d.fin));
  const max = Math.max(0, ...data.map((d) => d.fin));
  // 0の位置でグラデーションの色を切り替える（プラスは緑、マイナスは赤）
  const zero = max - min > 0 ? max / (max - min) : 1;
  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="liteFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor={GREEN} stopOpacity={0.55} />
              <stop offset={zero} stopColor={GREEN} stopOpacity={0.12} />
              <stop offset={zero} stopColor={RED} stopOpacity={0.12} />
              <stop offset={1} stopColor={RED} stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="liteStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={zero} stopColor={GREEN} />
              <stop offset={zero} stopColor={RED} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#0a0a0a10" vertical={false} />
          <XAxis dataKey="age" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}歳`} interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            tick={{ fontSize: 10 }}
            width={52}
            tickFormatter={(v: number) => (Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(1)}億` : `${Math.round(v / 1e4).toLocaleString()}万`)}
          />
          <Tooltip
            formatter={(v) => [man(Number(v)), "お金（預金＋投資）"]}
            labelFormatter={(l) => `${l}歳`}
            offset={48}
            wrapperStyle={{ pointerEvents: "none" }}
            contentStyle={{ fontSize: 10, borderRadius: 8, border: `2px solid ${INK}`, padding: "4px 8px" }}
          />
          <ReferenceLine y={0} stroke={INK} strokeWidth={1.5} />
          {events.length ? (
            events.map((e, i) => (
              <ReferenceLine
                key={e.age}
                x={e.age}
                stroke={INK}
                strokeOpacity={0.35}
                strokeDasharray="3 3"
                label={{ value: `${i + 1}`, fontSize: 10, fontWeight: 700, fill: INK, position: "top" }}
              />
            ))
          ) : (
            <ReferenceLine x={retireAge} stroke={INK} strokeDasharray="4 3" label={{ value: "働き終わる", fontSize: 10, position: "insideTopRight" }} />
          )}
          <Area type="monotone" dataKey="fin" stroke="url(#liteStroke)" strokeWidth={2.5} fill="url(#liteFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
