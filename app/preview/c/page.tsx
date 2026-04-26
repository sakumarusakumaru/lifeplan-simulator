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
  if (abs >= 100_000_000) return `${(yen / 100_000_000).toFixed(1)}B`;
  if (abs >= 10_000) return `${Math.round(yen / 10_000)}M`;
  return String(Math.round(yen));
};

export default function VariantC() {
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
    <main className="min-h-screen bg-zinc-950 px-4 py-6 font-mono text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between border-b border-emerald-400/30 pb-3 text-[10px] uppercase tracking-[0.25em]">
          <Link href="/preview" className="text-zinc-500 hover:text-emerald-300">
            ← back
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-emerald-300">VARIANT · C / TERMINAL</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              LIVE
            </span>
          </div>
          <span className="text-zinc-500">{new Date().toISOString().slice(0, 10)}</span>
        </div>

        <header className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7">
            <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">
              forecast / final-net-worth
            </div>
            <div className="mt-2 text-5xl font-bold tabular-nums tracking-tight text-emerald-300 sm:text-6xl">
              {yenToOkuMan(result.finalNetWorth)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              age {DEFAULT_PLAN.curAge} → {DEFAULT_PLAN.endAge} · simulated · jpy
            </div>
          </div>
          <div className="col-span-12 grid grid-cols-3 gap-2 lg:col-span-5">
            <Tile label="MIN CASH" value={yenToOkuMan(result.minCash)} />
            <Tile label="MAX EDU/Y" value={yenToOkuMan(result.maxEdu)} />
            <Tile
              label="SHORTFALL"
              value={result.shortfallAge ? `${result.shortfallAge}Y` : "—"}
              warn={!!result.shortfallAge}
            />
          </div>
        </header>

        <section className="mt-6 rounded-lg border border-emerald-400/20 bg-zinc-900/60 p-4">
          <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            <span>asset_composition · stacked</span>
            <span className="text-emerald-300">net_worth · solid</span>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="cCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cFund" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cDc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#10b98122" strokeDasharray="2 4" />
                <XAxis dataKey="age" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#27272a" }} />
                <YAxis tickFormatter={axisFmt} tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  formatter={(v) => yenToOkuMan(Number(v) || 0)}
                  labelFormatter={(age) => `AGE ${age}`}
                  contentStyle={{ borderRadius: 6, border: "1px solid #10b981", fontSize: 11, background: "#0a0a0a", color: "#f4f4f5" }}
                  itemStyle={{ color: "#f4f4f5" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} iconType="circle" />
                <Area type="monotone" dataKey="現金" stackId="c" stroke="#0ea5e9" fill="url(#cCash)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="投信" stackId="c" stroke="#a855f7" fill="url(#cFund)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="株" stackId="c" stroke="#fbbf24" fill="url(#cStock)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="DC" stackId="c" stroke="#34d399" fill="url(#cDc)" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="純資産"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#fff", strokeWidth: 1 }}
                  style={{ filter: "drop-shadow(0 0 6px #34d39988)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <DataPanel title="MILESTONES" rows={[
            { k: "AGE 40", v: yenToOkuMan(result.rows[5]?.nw ?? 0) },
            { k: "AGE 60", v: yenToOkuMan(result.rows[25]?.nw ?? 0) },
            { k: "AGE 80", v: yenToOkuMan(result.rows[45]?.nw ?? 0) },
            { k: "AGE 95", v: yenToOkuMan(result.finalNetWorth) },
          ]} />
          <DataPanel title="MODULES" rows={[
            { k: "INCOME", v: "configured" },
            { k: "ASSETS", v: "configured" },
            { k: "EXPENSE", v: "configured" },
            { k: "INSURANCE", v: "—" },
          ]} />
          <DataPanel title="ACTIONS" rows={[
            { k: "save scenario", v: "→" },
            { k: "export csv", v: "→" },
            { k: "share read-only", v: "→" },
            { k: "compare scenarios", v: "→" },
          ]} interactive />
        </section>

        <div className="mt-6 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          <span>cpu · client</span>
          <span>build · {process.env.NODE_ENV ?? "preview"}</span>
          <span>© sakuma_co</span>
        </div>
      </div>
    </main>
  );
}

function Tile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</div>
      <div className={`mt-1 text-base tabular-nums ${warn ? "text-rose-400" : "text-emerald-300"}`}>
        {value}
      </div>
    </div>
  );
}

function DataPanel({
  title,
  rows,
  interactive,
}: {
  title: string;
  rows: { k: string; v: string }[];
  interactive?: boolean;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/60">
      <div className="border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-emerald-400">
        {title}
      </div>
      <div className="divide-y divide-zinc-800">
        {rows.map((r) => (
          <div
            key={r.k}
            className={`flex items-center justify-between px-3 py-2 text-xs ${interactive ? "cursor-pointer hover:bg-emerald-400/5 hover:text-emerald-300" : ""}`}
          >
            <span className="text-zinc-500">{r.k}</span>
            <span className="tabular-nums text-zinc-100">{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
