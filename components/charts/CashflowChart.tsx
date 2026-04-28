"use client";

import { usePathname } from "next/navigation";
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

const ITEMS: { key: keyof typeof FILLS; label: string; desc: string }[] = [
  { key: "income", label: "収入", desc: "給与・副業・年金・配偶者収入の合計（手取り換算）" },
  { key: "expense", label: "支出", desc: "生活費・住居・教育・保険・介護・ライフイベント等" },
  { key: "invest", label: "投資積立", desc: "投信・株・金・DCへの月々の積立額（資産側に蓄積）" },
];

export function CashflowChart({ rows, lifeEvents = [] }: CashflowChartProps) {
  const pathname = usePathname();
  const isV3 = pathname?.startsWith("/v3") ?? false;
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
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "10px 14px",
                      minWidth: 200,
                    }}
                  >
                    <p style={{ color: "#0a0a0a", fontWeight: 700, margin: "0 0 6px", fontSize: 13 }}>
                      {label}歳 時点
                    </p>
                    {sorted.map((entry) => (
                      <div
                        key={entry.dataKey as string}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          margin: "3px 0",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            background: entry.color as string,
                            border: entry.dataKey === "収支" ? "none" : "1px solid #0a0a0a30",
                          }}
                        />
                        <span style={{ color: "#0a0a0a", flex: 1 }}>{entry.name}</span>
                        <span
                          style={{
                            color: entry.dataKey === "収支" ? "#c8383a" : "#0a0a0a",
                            fontWeight: 800,
                          }}
                        >
                          {yenToOkuMan(Math.abs(Number(entry.value) || 0))}
                        </span>
                      </div>
                    ))}
                    <p
                      style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: "1px dashed #0a0a0a30",
                        fontSize: 10,
                        fontWeight: 600,
                        color: cf < 0 ? "#c8383a" : "#0a0a0a",
                      }}
                    >
                      {cf < 0
                        ? "⚠ 当年の収支がマイナス（資産取り崩し or 借入）"
                        : "収支プラス（現金が積み上がる年）"}
                    </p>
                  </div>
                );
              }}
              cursor={{ fill: "rgba(10,10,10,0.05)" }}
            />
            <Legend
              wrapperStyle={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
              iconType="square"
              formatter={(value) => (
                <span style={{ color: "#0a0a0a" }}>{value}</span>
              )}
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

      {/* このグラフの読み方 */}
      <div
        className="mt-4 rounded-xl p-3"
        style={{ background: "#ffffff", border: "1.5px solid #0a0a0a30" }}
      >
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/60">
          このグラフの読み方 ／ HOW TO READ
        </p>

        <p className="mb-1.5 text-[10px] font-bold text-[#0a0a0a]">■ 棒グラフ ＝ その年の現金フロー</p>
        <ul className="mb-3 flex flex-col gap-1 pl-1">
          {ITEMS.map((it) => (
            <li key={it.key} className="flex items-start gap-2 text-[10px] leading-relaxed">
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

        <p className="mb-1.5 text-[10px] font-bold text-[#0a0a0a]">━━ 線 ＝ 年間収支</p>
        <p className="pl-1 text-[10px] leading-relaxed text-[#0a0a0a]/60">
          <span
            className="mr-1.5 inline-block h-[3px] w-4 align-middle"
            style={{ background: FILLS.cf }}
          />
          収入から支出と積立を差し引いた金額。マイナスの年は資産を取り崩して補填します。
        </p>
      </div>
    </div>
  );
}
