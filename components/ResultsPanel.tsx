"use client";

import { useMemo } from "react";

import { simulate } from "@/lib/calc/simulate";
import type { YearlyResult } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const yenToOkuMan = (yen: number): string => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen));
  const oku = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  if (oku > 0) return `${sign}${oku}億${man.toLocaleString()}万`;
  return `${sign}${man.toLocaleString()}万`;
};

const SAMPLE_OFFSETS = [0, 5, 10, 15, 20, 30, 40, 50, 60];

export function ResultsPanel() {
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);

  const sample: YearlyResult[] = SAMPLE_OFFSETS.map((i) => result.rows[i]).filter(
    (r): r is YearlyResult => Boolean(r),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="最終純資産" value={yenToOkuMan(result.finalNetWorth)} />
        <Kpi label="最低現金残高" value={yenToOkuMan(result.minCash)} />
        <Kpi label="最大教育費(年)" value={yenToOkuMan(result.maxEdu)} />
        <Kpi
          label="資金ショート"
          value={result.shortfallAge ? `${result.shortfallAge}歳で発生` : "なし"}
          tone={result.shortfallAge ? "warn" : "ok"}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">年齢</th>
              <th className="px-3 py-2 text-right">純資産</th>
              <th className="px-3 py-2 text-right">現金</th>
              <th className="px-3 py-2 text-right">投信</th>
              <th className="px-3 py-2 text-right">株</th>
              <th className="px-3 py-2 text-right">DC</th>
              <th className="px-3 py-2 text-right">CF</th>
              <th className="px-3 py-2 text-right">取崩</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((r) => (
              <tr key={r.age} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-medium">{r.age}</td>
                <td className="px-3 py-2 text-right tabular-nums">{yenToOkuMan(r.nw)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{yenToOkuMan(r.ass.c)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{yenToOkuMan(r.ass.f)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{yenToOkuMan(r.ass.s)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{yenToOkuMan(r.ass.dc)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{yenToOkuMan(r.cf)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{yenToOkuMan(r.draw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-400">
        計算行数: {result.rows.length} 年（{plan.curAge}〜{plan.endAge}歳）
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const toneClass =
    tone === "warn"
      ? "text-rose-600"
      : tone === "ok"
        ? "text-emerald-600"
        : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
