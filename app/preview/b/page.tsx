"use client";

import Link from "next/link";
import {
  Area,
  CartesianGrid,
  ComposedChart,
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
  if (abs >= 100_000_000) return `${(yen / 100_000_000).toFixed(1)}億`;
  if (abs >= 10_000) return `${Math.round(yen / 10_000)}万`;
  return String(Math.round(yen));
};

export default function VariantB() {
  const result = simulate(DEFAULT_PLAN);
  const data = result.rows.map((r) => ({
    age: r.age,
    純資産: Math.round(r.nw),
    現金: Math.round(r.ass.c),
  }));

  const targetYear = new Date().getFullYear() + (DEFAULT_PLAN.endAge - DEFAULT_PLAN.curAge);

  return (
    <main className="min-h-screen bg-white px-6 py-8 sm:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center justify-between border-b border-zinc-900 pb-3 text-xs uppercase tracking-[0.2em]">
          <Link href="/preview" className="text-zinc-500 hover:text-zinc-900">
            ← back
          </Link>
          <span className="font-mono text-zinc-900">VARIANT · B / EDITORIAL</span>
          <span className="text-zinc-400">No.001</span>
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-12">
          <div className="col-span-12 md:col-span-7">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-rose-600">
              Lifeplan Report — Issue 01
            </div>
            <h1 className="mt-6 font-serif text-[3.4rem] leading-[0.95] tracking-tight text-zinc-900 sm:text-[5rem]">
              {targetYear}年、
              <br />
              あなたの財布は
              <br />
              <span className="text-rose-600">
                {yenToOkuMan(result.finalNetWorth)}
              </span>
              。
            </h1>
            <p className="mt-8 max-w-md text-base leading-relaxed text-zinc-700">
              いま入力した数字が、これから先のあなたの暮らしを決める。
              希望と現実のあいだに、たしかな線を引きたい。
            </p>
          </div>

          <aside className="col-span-12 md:col-span-5 md:border-l md:border-zinc-200 md:pl-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
              Highlights
            </div>
            <div className="mt-4 divide-y divide-zinc-200">
              <Stat label="最終純資産" value={yenToOkuMan(result.finalNetWorth)} accent />
              <Stat label="最低現金残高" value={yenToOkuMan(result.minCash)} />
              <Stat label="最大教育費 / 年" value={yenToOkuMan(result.maxEdu)} />
              <Stat
                label="資金ショート"
                value={result.shortfallAge ? `${result.shortfallAge}歳` : "なし"}
                warn={!!result.shortfallAge}
              />
            </div>
          </aside>

          <section className="col-span-12">
            <div className="flex items-baseline justify-between border-b border-zinc-900 pb-3">
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                The arc of your wealth.
              </h2>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                {DEFAULT_PLAN.curAge} → {DEFAULT_PLAN.endAge}
              </div>
            </div>
            <div className="mt-6 h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="bNw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dc2626" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="age" tick={{ fill: "#52525b", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#000" }} />
                  <YAxis tickFormatter={axisFmt} tick={{ fill: "#52525b", fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip
                    formatter={(v) => yenToOkuMan(Number(v) || 0)}
                    labelFormatter={(age) => `${age}歳`}
                    contentStyle={{ borderRadius: 0, border: "1px solid #000", fontSize: 12, background: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="純資産"
                    stroke="none"
                    fill="url(#bNw)"
                  />
                  <Line type="monotone" dataKey="現金" stroke="#000" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="純資産" stroke="#dc2626" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
              <span><span className="mr-1 inline-block h-1 w-3 align-middle bg-rose-600" /> Net worth</span>
              <span><span className="mr-1 inline-block h-1 w-3 align-middle bg-zinc-900" style={{ borderTop: "1px dashed #000", height: 0 }} /> Cash on hand</span>
              <span>Source · Your inputs</span>
            </div>
          </section>

          <section className="col-span-12 grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2 md:grid-cols-4">
            {[
              { kicker: "01", title: "家族", body: "あなた・配偶者・お子さま" },
              { kicker: "02", title: "収入", body: "勤務先・副業・年金" },
              { kicker: "03", title: "資産", body: "現金・投信・株・暗号資産・DC" },
              { kicker: "04", title: "教育・住居・保険", body: "ライフイベントを盛り込む" },
            ].map((s) => (
              <div key={s.kicker} className="border-t border-zinc-900 pt-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-rose-600">
                  Chapter {s.kicker}
                </div>
                <div className="mt-2 font-serif text-xl font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-zinc-600">{s.body}</div>
              </div>
            ))}
          </section>

          <div className="col-span-12 mt-8 flex flex-col items-center gap-3 border-t border-zinc-900 pt-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Start your story
            </div>
            <button className="rounded-none border-2 border-zinc-900 bg-zinc-900 px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white hover:bg-rose-600 hover:border-rose-600">
              Begin →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </div>
      <div
        className={`font-serif text-2xl tabular-nums ${accent ? "text-rose-600" : warn ? "text-rose-600" : "text-zinc-900"}`}
      >
        {value}
      </div>
    </div>
  );
}
