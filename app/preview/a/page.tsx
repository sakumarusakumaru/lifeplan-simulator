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
  if (abs >= 100_000_000) return `${(yen / 100_000_000).toFixed(1)}億`;
  if (abs >= 10_000) return `${Math.round(yen / 10_000)}万`;
  return String(Math.round(yen));
};

export default function VariantA() {
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
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between text-xs">
          <Link href="/preview" className="text-zinc-500 hover:text-zinc-800">
            ← デザイン候補に戻る
          </Link>
          <span className="rounded-full bg-white/70 px-3 py-1 font-medium text-rose-600 shadow-sm">
            variant A · pastel pop
          </span>
        </div>

        <header className="text-center">
          <div className="text-sm font-medium tracking-widest text-rose-500">
            YOUR LIFEPLAN
          </div>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            人生のお金、ちゃんと描こう。
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-600 sm:text-base">
            あなたの今と、これからの暮らしを数字で見える化。家族で一緒に話せる、やさしい資産シミュレーター。
          </p>
        </header>

        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile
            label="最終純資産"
            value={yenToOkuMan(result.finalNetWorth)}
            tone="violet"
            emoji="🪴"
          />
          <KpiTile
            label="最低現金残高"
            value={yenToOkuMan(result.minCash)}
            tone="sky"
            emoji="💧"
          />
          <KpiTile
            label="最大教育費(年)"
            value={yenToOkuMan(result.maxEdu)}
            tone="amber"
            emoji="📚"
          />
          <KpiTile
            label="資金ショート"
            value={result.shortfallAge ? `${result.shortfallAge}歳` : "なし"}
            tone={result.shortfallAge ? "rose" : "emerald"}
            emoji={result.shortfallAge ? "⚠️" : "✅"}
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-zinc-900">
              資産の旅路
            </h2>
            <span className="text-xs text-zinc-500">
              {DEFAULT_PLAN.curAge}歳 → {DEFAULT_PLAN.endAge}歳
            </span>
          </div>
          <div className="mt-3 h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="aCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="aFund" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c026d3" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#c026d3" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="aStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="aDc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#fde68a55" strokeDasharray="3 3" />
                <XAxis dataKey="age" tick={{ fill: "#a16207", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={axisFmt} tick={{ fill: "#a16207", fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
                <Tooltip
                  formatter={(v) => yenToOkuMan(Number(v) || 0)}
                  labelFormatter={(age) => `${age}歳`}
                  contentStyle={{ borderRadius: 12, border: "1px solid #fcd34d", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Area type="monotone" dataKey="現金" stackId="a" stroke="#0ea5e9" fill="url(#aCash)" strokeWidth={2} />
                <Area type="monotone" dataKey="投信" stackId="a" stroke="#c026d3" fill="url(#aFund)" strokeWidth={2} />
                <Area type="monotone" dataKey="株" stackId="a" stroke="#f59e0b" fill="url(#aStock)" strokeWidth={2} />
                <Area type="monotone" dataKey="DC" stackId="a" stroke="#10b981" fill="url(#aDc)" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="純資産"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SectionCard title="家族" emoji="👪" tone="bg-rose-100/70 border-rose-200">
            <div className="text-xs text-zinc-600">あなた・配偶者・お子さま</div>
          </SectionCard>
          <SectionCard title="収入" emoji="💼" tone="bg-emerald-100/70 border-emerald-200">
            <div className="text-xs text-zinc-600">勤務先・副業・年金</div>
          </SectionCard>
          <SectionCard title="資産" emoji="🪙" tone="bg-violet-100/70 border-violet-200">
            <div className="text-xs text-zinc-600">現金・投信・株・仮想通貨・DC</div>
          </SectionCard>
          <SectionCard title="教育費" emoji="🎒" tone="bg-amber-100/70 border-amber-200">
            <div className="text-xs text-zinc-600">学校・塾・大学・下宿</div>
          </SectionCard>
        </section>

        <div className="mt-10 flex items-center justify-center gap-3">
          <button className="rounded-full bg-rose-500 px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-rose-600">
            無料ではじめる
          </button>
          <button className="rounded-full border border-zinc-300 bg-white/70 px-6 py-3 text-sm text-zinc-700 hover:bg-white">
            ログインしてシナリオ保存
          </button>
        </div>
      </div>
    </main>
  );
}

function KpiTile({
  label,
  value,
  tone,
  emoji,
}: {
  label: string;
  value: string;
  tone: "violet" | "sky" | "amber" | "rose" | "emerald";
  emoji: string;
}) {
  const map: Record<string, string> = {
    violet: "from-violet-100 to-violet-50 text-violet-700 border-violet-200",
    sky: "from-sky-100 to-sky-50 text-sky-700 border-sky-200",
    amber: "from-amber-100 to-amber-50 text-amber-700 border-amber-200",
    rose: "from-rose-100 to-rose-50 text-rose-700 border-rose-200",
    emerald: "from-emerald-100 to-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${map[tone]}`}>
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-base">{emoji}</span>
      </div>
      <div className="font-serif text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SectionCard({ title, emoji, tone, children }: { title: string; emoji: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-center gap-2 text-base font-semibold text-zinc-900">
        <span>{emoji}</span>
        <span>{title}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
