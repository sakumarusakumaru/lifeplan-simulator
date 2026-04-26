"use client";

import { useMemo } from "react";
import Link from "next/link";

import { simulate } from "@/lib/calc/simulate";
import { usePlanStore } from "@/store/plan-store";

const fmt = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
  return `${sign}${abs.toLocaleString()}万`;
};

const fmtDelta = (delta: number) => {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${fmt(delta)}`;
};

export default function SuggestPage() {
  const plan = usePlanStore((s) => s.plan);

  const base = useMemo(() => simulate(plan), [plan]);

  // Scenario 1: 投信積立 +2万/月
  const sc0 = useMemo(
    () => simulate({ ...plan, saveFundM: plan.saveFundM + 20000 }),
    [plan],
  );

  // Scenario 2: 生活費 -1万/月
  const sc1 = useMemo(
    () => simulate({ ...plan, livingM: Math.max(0, plan.livingM - 10000) }),
    [plan],
  );

  // Scenario 3: 就労延長 +2年（最初の勤務先）
  const sc2plan = useMemo(() => {
    if (plan.jobs.length === 0) return plan;
    const jobs = plan.jobs.map((j, i) =>
      i === 0 ? { ...j, end: j.end + 2 } : j,
    );
    return { ...plan, jobs };
  }, [plan]);
  const sc2 = useMemo(() => simulate(sc2plan), [sc2plan]);

  // Scenario 4: 年金繰下げ +2年
  const newPenAge = Math.min(75, plan.penStartA + 2);
  const sc3 = useMemo(
    () => simulate({ ...plan, penStartA: newPenAge }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan],
  );

  // Scenario 5: 支出 特別費 -50万/年
  const sc4 = useMemo(
    () => simulate({ ...plan, specialY: Math.max(0, plan.specialY - 500000) }),
    [plan],
  );

  const scenarios = [
    {
      title: "投信の積立を月+2万増やす",
      detail: `毎月の投信積立を ${(plan.saveFundM / 10000).toFixed(0)}万円 → ${((plan.saveFundM + 20000) / 10000).toFixed(0)}万円 に増額`,
      result: sc0,
      applicable: true,
    },
    {
      title: "毎月の生活費を1万円削減する",
      detail: `基本支出を ${(plan.livingM / 10000).toFixed(0)}万円/月 → ${(Math.max(0, plan.livingM - 10000) / 10000).toFixed(0)}万円/月 に見直し`,
      result: sc1,
      applicable: plan.livingM > 10000,
    },
    {
      title: "就労を2年延長する",
      detail:
        plan.jobs.length > 0
          ? `${plan.jobs[0].name || "主勤務先"} の退職を ${plan.jobs[0].end}歳 → ${plan.jobs[0].end + 2}歳 に延長`
          : "勤務先の設定が必要です",
      result: sc2,
      applicable: plan.jobs.length > 0,
    },
    {
      title: `年金受給を${plan.penStartA}歳→${newPenAge}歳に繰り下げる`,
      detail: `受給開始を${newPenAge - plan.penStartA}年遅らせることで月額が増加`,
      result: sc3,
      applicable: plan.penStartA < 75,
    },
    {
      title: "年間特別費を50万円削減する",
      detail: `年間特別費を ${(plan.specialY / 10000).toFixed(0)}万円 → ${(Math.max(0, plan.specialY - 500000) / 10000).toFixed(0)}万円 に圧縮`,
      result: sc4,
      applicable: plan.specialY >= 500000,
    },
  ].filter((s) => s.applicable);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">
          Scenario Analysis
        </p>
        <h1 className="text-xl font-bold text-[#0a0a0a]">改善シナリオ分析</h1>
        <p className="mt-2 text-xs leading-relaxed text-[#0a0a0a]/60">
          各パラメータを変えた場合の影響を試算します。詳細入力の変更がリアルタイムで反映されます。
        </p>
      </div>

      {/* Base result */}
      <div
        className="mb-6 flex items-center justify-between rounded-xl p-4"
        style={{ background: "#0a0a0a", borderRadius: 12 }}
      >
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">
            現在のプラン
          </p>
          <p className="mt-0.5 text-sm font-bold text-white">最終純資産</p>
          {base.shortfallAge && (
            <p className="mt-0.5 text-[10px] text-[#f87171]">
              ⚠ {base.shortfallAge}歳で資金ショート
            </p>
          )}
        </div>
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: base.finalNetWorth < 0 ? "#f87171" : "#86efac" }}
        >
          {fmt(base.finalNetWorth)}
        </p>
      </div>

      {/* Scenario cards */}
      <div className="flex flex-col gap-3">
        {scenarios.map((sc) => {
          const delta = sc.result.finalNetWorth - base.finalNetWorth;
          const positive = delta >= 0;
          const shortfallChanged =
            sc.result.shortfallAge !== base.shortfallAge;
          const shortfallFixed =
            sc.result.shortfallAge === null && base.shortfallAge !== null;
          const shortfallWorsened =
            sc.result.shortfallAge !== null && base.shortfallAge === null;

          return (
            <div
              key={sc.title}
              className="rounded-xl p-4"
              style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#0a0a0a]">
                    {sc.title}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#0a0a0a]/50">
                    {sc.detail}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="text-lg font-bold tabular-nums"
                    style={{ color: positive ? "#22863a" : "#c8383a" }}
                  >
                    {fmtDelta(delta)}
                  </p>
                  <p className="text-[9px] text-[#0a0a0a]/40">
                    最終純資産の変化
                  </p>
                </div>
              </div>

              {shortfallChanged && (
                <div
                  className="mt-3 rounded-lg px-3 py-2 text-[10px] font-bold"
                  style={{
                    background: shortfallFixed ? "#f0fff4" : "#fff0f0",
                    color: shortfallFixed ? "#22863a" : "#c8383a",
                  }}
                >
                  {shortfallFixed
                    ? `✓ 資金ショート（${base.shortfallAge}歳）が解消されます`
                    : shortfallWorsened
                      ? `⚠ 資金ショートが${sc.result.shortfallAge}歳に発生します`
                      : `資金ショート ${base.shortfallAge}歳 → ${sc.result.shortfallAge}歳`}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[10px] text-[#0a0a0a]/40">
                <span>
                  最終純資産:{" "}
                  <span
                    className="font-bold"
                    style={{
                      color:
                        sc.result.finalNetWorth < 0 ? "#c8383a" : "#0a0a0a",
                    }}
                  >
                    {fmt(sc.result.finalNetWorth)}
                  </span>
                </span>
                <span>
                  {sc.result.shortfallAge
                    ? `ショート: ${sc.result.shortfallAge}歳`
                    : "ショートなし"}
                </span>
              </div>
            </div>
          );
        })}

        {scenarios.length === 0 && (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
          >
            <p className="text-sm text-[#0a0a0a]/50">
              詳細入力でデータを入力すると改善提案が表示されます。
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/v2/result"
          className="flex-1 py-3 text-center text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
          style={{
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
            color: "#0a0a0a",
          }}
        >
          ← 結果に戻る
        </Link>
        <Link
          href="/v2/detail"
          className="flex-1 py-3 text-center text-xs font-bold text-white transition-colors hover:opacity-80"
          style={{
            background: "#0a0a0a",
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
          }}
        >
          詳細入力を修正する →
        </Link>
      </div>

      <p className="mt-4 text-[9px] leading-relaxed text-[#0a0a0a]/40">
        ※本結果は概算です。実際の年金額・税額・運用成果は異なります。投資・税務等の判断は必ず専門家にご相談ください。
      </p>
    </main>
  );
}
