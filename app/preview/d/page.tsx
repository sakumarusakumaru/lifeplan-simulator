"use client";

import Link from "next/link";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DEFAULT_PLAN } from "@/lib/calc/defaults";
import { simulate } from "@/lib/calc/simulate";

const COLOR = {
  black: "#0a0a0a",
  cream: "#f0f0ee",
  bg: "#e8e8e6",
  red: "#c8383a",
  gray: "#66666a",
};

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

export default function VariantD() {
  const result = simulate(DEFAULT_PLAN);
  const data = result.rows.map((r) => ({
    age: r.age,
    現金: Math.round(r.ass.c),
    投信: Math.round(r.ass.f),
    株: Math.round(r.ass.s),
    DC: Math.round(r.ass.dc),
    純資産: Math.round(r.nw),
  }));

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-8"
      style={{
        background: COLOR.bg,
        color: COLOR.black,
        fontFamily: '"Inter", "Noto Sans JP", system-ui, sans-serif',
      }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/preview"
            className="text-xs"
            style={{ color: "rgba(10,10,10,0.5)" }}
          >
            ← BACK
          </Link>
          <Badge tone="action" label="VARIANT · D" />
        </div>

        {/* Hero card */}
        <Card className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Kicker>LIFEPLAN SIMULATOR</Kicker>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              人生の数字を、
              <br />
              一枚のカードに。
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: "rgba(10,10,10,0.7)" }}>
              入力するたび、{DEFAULT_PLAN.curAge}歳から{DEFAULT_PLAN.endAge}歳までの暮らしが
              数字とグラフで描き直される。シナリオは保存できる。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PrimaryButton>はじめる</PrimaryButton>
            <Button>ログイン</Button>
          </div>
        </Card>

        {/* KPI grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="最終純資産" value={yenToOkuMan(result.finalNetWorth)} accent />
          <Kpi label="最低現金残高" value={yenToOkuMan(result.minCash)} />
          <Kpi label="最大教育費 / 年" value={yenToOkuMan(result.maxEdu)} />
          <Kpi
            label="資金ショート"
            value={result.shortfallAge ? `${result.shortfallAge}歳` : "なし"}
            tone={result.shortfallAge ? "alert" : "ok"}
          />
        </div>

        {/* Chart card */}
        <Card className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <Kicker>ASSET TRAJECTORY</Kicker>
            <span className="text-xs" style={{ color: "rgba(10,10,10,0.5)" }}>
              {DEFAULT_PLAN.curAge} → {DEFAULT_PLAN.endAge}
            </span>
          </div>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="rgba(10,10,10,0.08)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="age"
                  tick={{ fill: COLOR.black, fontSize: 11, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: COLOR.black, strokeWidth: 2 }}
                />
                <YAxis
                  tickFormatter={axisFmt}
                  tick={{ fill: COLOR.black, fontSize: 11, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: COLOR.black, strokeWidth: 2 }}
                  width={56}
                />
                <Tooltip
                  formatter={(v) => yenToOkuMan(Number(v) || 0)}
                  labelFormatter={(age) => `${age}歳`}
                  contentStyle={{
                    background: COLOR.cream,
                    border: `2.5px solid ${COLOR.black}`,
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "8px 12px",
                  }}
                  labelStyle={{ color: COLOR.black, fontWeight: 700 }}
                  cursor={{ stroke: COLOR.black, strokeWidth: 1, strokeDasharray: "2 2" }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: COLOR.black,
                  }}
                  iconType="square"
                />
                <Area type="linear" dataKey="現金" stackId="d" stroke={COLOR.black} strokeWidth={2} fill={COLOR.black} fillOpacity={0.85} />
                <Area type="linear" dataKey="投信" stackId="d" stroke={COLOR.black} strokeWidth={2} fill="#404040" fillOpacity={0.85} />
                <Area type="linear" dataKey="株" stackId="d" stroke={COLOR.black} strokeWidth={2} fill={COLOR.gray} fillOpacity={0.85} />
                <Area type="linear" dataKey="DC" stackId="d" stroke={COLOR.black} strokeWidth={2} fill="#a3a3a3" fillOpacity={0.85} />
                <Line
                  type="linear"
                  dataKey="純資産"
                  stroke={COLOR.red}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, stroke: COLOR.black, strokeWidth: 2.5, fill: COLOR.red }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sections grid */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SectionTile no="01" title="家族" body="あなた・配偶者・お子さま" />
          <SectionTile no="02" title="収入" body="勤務先・副業・年金" />
          <SectionTile no="03" title="資産" body="現金・投信・株・暗号資産・DC" />
          <SectionTile no="04" title="支出" body="生活費・住居・教育・保険" />
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <PrimaryButton>無料ではじめる</PrimaryButton>
          <button
            type="button"
            className="text-xs"
            style={{ color: "rgba(10,10,10,0.5)" }}
          >
            ログインしてシナリオ保存（Google / メール）
          </button>
        </div>

        <div className="mt-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(10,10,10,0.45)" }}>
          <span>BLACK BORDER · DESIGN SYSTEM</span>
          <span>© SAKUMARU</span>
        </div>
      </div>
    </main>
  );
}

/* ───────── Primitives ───────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`p-5 sm:p-6 ${className}`}
      style={{
        background: COLOR.cream,
        border: `2.5px solid ${COLOR.black}`,
        borderRadius: 12,
      }}
    >
      {children}
    </section>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.2em]">
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "alert" | "ok";
}) {
  const isAlert = tone === "alert";
  const isAccent = !!accent;
  const bg = isAlert ? COLOR.red : isAccent ? COLOR.black : COLOR.cream;
  const fg = isAlert || isAccent ? "#fff" : COLOR.black;
  return (
    <div
      style={{
        background: bg,
        color: fg,
        border: `2.5px solid ${COLOR.black}`,
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ opacity: 0.75 }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}

function SectionTile({ no, title, body }: { no: string; title: string; body: string }) {
  return (
    <div
      style={{
        background: COLOR.cream,
        border: `2.5px solid ${COLOR.black}`,
        borderRadius: 12,
        padding: "16px 16px",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: COLOR.gray }}>
          CHAPTER {no}
        </span>
        <span className="text-[10px] font-bold" style={{ color: "rgba(10,10,10,0.4)" }}>→</span>
      </div>
      <div className="mt-2 text-lg font-bold">{title}</div>
      <div className="mt-1 text-xs" style={{ color: "rgba(10,10,10,0.65)" }}>
        {body}
      </div>
    </div>
  );
}

function Button({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="px-4 text-sm font-bold transition-colors"
      style={{
        height: 38,
        background: COLOR.cream,
        color: COLOR.black,
        border: `2.5px solid ${COLOR.black}`,
        borderRadius: 12,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = COLOR.black;
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = COLOR.cream;
        e.currentTarget.style.color = COLOR.black;
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="px-5 text-sm font-bold transition-colors"
      style={{
        height: 38,
        background: COLOR.red,
        color: "#fff",
        border: `2.5px solid ${COLOR.black}`,
        borderRadius: 12,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = COLOR.black;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = COLOR.red;
      }}
    >
      {children}
    </button>
  );
}

function Badge({ tone, label }: { tone: "action" | "calm"; label: string }) {
  const bg = tone === "action" ? COLOR.red : COLOR.gray;
  return (
    <span
      className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.1em]"
      style={{
        height: 24,
        padding: "0 12px",
        background: bg,
        color: "#fff",
        border: `2.5px solid ${COLOR.black}`,
        borderRadius: 12,
      }}
    >
      {label}
    </span>
  );
}
