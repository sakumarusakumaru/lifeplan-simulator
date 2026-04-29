"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Area,
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

interface AssetsChartProps {
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
  cash: "#64748b",
  fund: "#94a3b8",
  stock: "#b8c6d4",
  crypto: "#a78bfa",
  gold: "#c9aa7c",
  dc: "#dde6ef",
  nw: "#c8383a",
};

const FILLS_HOVER = {
  cash: "#334155",
  fund: "#64748b",
  stock: "#7d92a8",
  crypto: "#7c3aed",
  gold: "#a47f4d",
  dc: "#a8b8c8",
  nw: "#c8383a",
};

const ITEMS: { key: keyof typeof FILLS; label: string; desc: string }[] = [
  { key: "cash", label: "現金", desc: "預貯金など即現金化できる資産" },
  { key: "fund", label: "投信", desc: "NISA・特定口座の投資信託など" },
  { key: "stock", label: "株", desc: "個別株式・ETF" },
  { key: "crypto", label: "仮想通貨", desc: "ビットコイン・イーサリアム等のクリプト資産" },
  { key: "gold", label: "金", desc: "金ETF・現物金・コモディティ" },
  { key: "dc", label: "DC", desc: "確定拠出年金・iDeCo（60歳から受給可、原則として60歳まで取崩不可）" },
];

const KEY_TO_FILL: Record<string, keyof typeof FILLS> = {
  現金: "cash",
  投信: "fund",
  株: "stock",
  仮想通貨: "crypto",
  金: "gold",
  DC: "dc",
};

export function AssetsChart({ rows, lifeEvents = [] }: AssetsChartProps) {
  const pathname = usePathname();
  const isV3 = pathname?.startsWith("/v3") ?? false;

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const data = rows.map((r) => ({
    age: r.age,
    現金: Math.round(r.ass.c),
    投信: Math.round(r.ass.f + r.ass.fNisa),
    株: Math.round(r.ass.s + r.ass.sNisa),
    仮想通貨: Math.round(r.ass.k || 0),
    金: Math.round(r.ass.g || 0),
    DC: Math.round(r.ass.dc),
    純資産: Math.round(r.nw),
  }));

  const getFill = (label: string): string => {
    const k = KEY_TO_FILL[label];
    if (!k) return "#000";
    return hoveredKey === label ? FILLS_HOVER[k] : FILLS[k];
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
          ASSET TRAJECTORY
        </span>
        {rows.length ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
            {rows[0].age} → {rows[rows.length - 1].age}
          </span>
        ) : null}
      </div>
      <div className="h-[320px] w-full">
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
              content={({ payload, label }) => {
                if (!payload?.length) return null;
                const ORDER = ["現金", "投信", "株", "仮想通貨", "金", "DC", "純資産"];
                const sorted = ORDER.map((k) =>
                  payload.find((p) => p.dataKey === k),
                ).filter(Boolean) as typeof payload;
                const nwEntry = sorted.find((e) => e.dataKey === "純資産");
                const nw = Number(nwEntry?.value ?? 0);
                return (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "2.5px solid #0a0a0a",
                      borderRadius: 12,
                      padding: "14px 18px",
                      minWidth: 230,
                    }}
                  >
                    <p style={{ color: "#0a0a0a", fontWeight: 800, margin: "0 0 12px", fontSize: 17 }}>
                      {label}歳
                    </p>
                    {sorted.map((entry) => {
                      const key = entry.dataKey as string;
                      const isNW = key === "純資産";
                      const isHovered = hoveredKey === key;
                      const valueColor = isNW
                        ? Number(entry.value) < 0
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
                            marginBottom: 6,
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
                              background: isNW ? "transparent" : (entry.color as string),
                              border: isNW
                                ? `3px solid ${FILLS.nw}`
                                : "1px solid #0a0a0a20",
                              borderRadius: isNW ? 2 : 0,
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
                            {yenToOkuMan(Number(entry.value) || 0)}
                          </span>
                        </div>
                      );
                    })}
                    <p
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1.5px dashed #0a0a0a20",
                        fontSize: 12,
                        fontWeight: 700,
                        color: nw < 0 ? "#c8383a" : "#22863a",
                      }}
                    >
                      {nw < 0
                        ? "⚠ 負債が資産を上回っています"
                        : "全資産 − 全負債 = 純資産（赤線）"}
                    </p>
                  </div>
                );
              }}
              cursor={{ stroke: "#0a0a0a", strokeWidth: 1, strokeDasharray: "2 2" }}
              offset={28}
              wrapperStyle={{ pointerEvents: "none" }}
            />

            <Area
              type="linear"
              dataKey="DC"
              stackId="bb"
              stroke={getFill("DC")}
              strokeWidth={0.5}
              fill={getFill("DC")}
              fillOpacity={1}
              onMouseEnter={() => setHoveredKey("DC")}
              onMouseLeave={() => setHoveredKey(null)}
            />
            <Area
              type="linear"
              dataKey="金"
              stackId="bb"
              stroke={getFill("金")}
              strokeWidth={0.5}
              fill={getFill("金")}
              fillOpacity={1}
              onMouseEnter={() => setHoveredKey("金")}
              onMouseLeave={() => setHoveredKey(null)}
            />
            <Area
              type="linear"
              dataKey="仮想通貨"
              stackId="bb"
              stroke={getFill("仮想通貨")}
              strokeWidth={0.5}
              fill={getFill("仮想通貨")}
              fillOpacity={1}
              onMouseEnter={() => setHoveredKey("仮想通貨")}
              onMouseLeave={() => setHoveredKey(null)}
            />
            <Area
              type="linear"
              dataKey="株"
              stackId="bb"
              stroke={getFill("株")}
              strokeWidth={0.5}
              fill={getFill("株")}
              fillOpacity={1}
              onMouseEnter={() => setHoveredKey("株")}
              onMouseLeave={() => setHoveredKey(null)}
            />
            <Area
              type="linear"
              dataKey="投信"
              stackId="bb"
              stroke={getFill("投信")}
              strokeWidth={0.5}
              fill={getFill("投信")}
              fillOpacity={1}
              onMouseEnter={() => setHoveredKey("投信")}
              onMouseLeave={() => setHoveredKey(null)}
            />
            <Area
              type="linear"
              dataKey="現金"
              stackId="bb"
              stroke={getFill("現金")}
              strokeWidth={0.5}
              fill={getFill("現金")}
              fillOpacity={1}
              onMouseEnter={() => setHoveredKey("現金")}
              onMouseLeave={() => setHoveredKey(null)}
            />
            <Line
              type="linear"
              dataKey="純資産"
              stroke={FILLS.nw}
              strokeWidth={hoveredKey === "純資産" ? 4 : 3}
              dot={false}
              activeDot={{ r: 5, stroke: "#0a0a0a", strokeWidth: 2.5, fill: FILLS.nw }}
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

      {/* このグラフの読み方 */}
      <div
        className="mt-4 rounded-xl p-3"
        style={{ background: "#ffffff", border: "1.5px solid #0a0a0a30" }}
      >
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/60">
          このグラフの読み方 ／ HOW TO READ
        </p>

        <p className="mb-1.5 text-[10px] font-bold text-[#0a0a0a]">■ 積み上げ面 ＝ その年の資産内訳</p>
        <ul className="mb-3 flex flex-col gap-1 pl-1">
          {ITEMS.map((it) => (
            <li
              key={it.key}
              onMouseEnter={() => {
                const labelMap: Record<string, string> = {
                  cash: "現金",
                  fund: "投信",
                  stock: "株",
                  crypto: "仮想通貨",
                  gold: "金",
                  dc: "DC",
                };
                setHoveredKey(labelMap[it.key] ?? null);
              }}
              onMouseLeave={() => setHoveredKey(null)}
              className="flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed"
            >
              <span
                className="mt-0.5 inline-block h-3 w-3 shrink-0"
                style={{ background: FILLS[it.key], border: "1px solid #0a0a0a40" }}
              />
              <span className="text-[#0a0a0a]">
                <span className="font-bold">{it.label}</span>
                <span className="text-[#0a0a0a]/60"> ／ {it.desc}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mb-1.5 text-[10px] font-bold text-[#0a0a0a]">━━ 線 ＝ 純資産</p>
        <p className="pl-1 text-[10px] leading-relaxed text-[#0a0a0a]/60">
          <span
            className="mr-1.5 inline-block h-[3px] w-4 align-middle"
            style={{ background: FILLS.nw }}
          />
          全資産から住宅ローン・その他ローン・不動産ローンの負債を差し引いた金額。
          マイナス = 負債超過の状態。マウスオーバーで該当項目が拡大表示されます。
        </p>
      </div>
    </div>
  );
}
