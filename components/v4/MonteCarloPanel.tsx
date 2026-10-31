"use client";

import Link from "next/link";
import { useMemo } from "react";
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

import { MC_RISK, MC_RUNS, runMonteCarlo, type McRisk, type MonteCarloResult } from "@/lib/v4/calc/montecarlo";
import { deflator } from "@/lib/v4/calc/realValue";
import type { PlanInput } from "@/lib/v4/calc/types";
import { useIsNarrow } from "@/components/v4/useIsNarrow";
import { useVBase } from "@/components/v4/useVBase";
import { usePlanStore } from "@/store/v4/plan-store";
import { useUiStore } from "@/store/v4/ui-store";

const INK = "#0a0a0a";
const BLUE = "#1a6fa8";
const RED = "#c8383a";
const GREEN = "#22863a";

const man = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億円`;
  return `${sign}${abs.toLocaleString()}万円`;
};
const axisFmt = (yen: number) =>
  Math.abs(yen) >= 100_000_000 ? `${(yen / 100_000_000).toFixed(1)}億` : `${Math.round(yen / 10000)}万`;

// 想定利回りの目安（リスク水準と大きくずれていれば知らせる）
const RETURN_GUIDE: Record<McRisk, [number, number]> = {
  stable: [1.5, 3.5],
  balanced: [3, 5],
  aggressive: [4.5, 7],
};

function useMonteCarlo(plan: PlanInput): MonteCarloResult {
  return useMemo(() => runMonteCarlo(plan, plan.mcRisk ?? "balanced"), [plan]);
}

function rateColor(rate: number) {
  if (rate >= 0.85) return GREEN;
  if (rate >= 0.6) return "#a07900";
  return RED;
}

// 入力画面の右側に出す小さな要約
export function MonteCarloBadge() {
  const plan = usePlanStore((s) => s.plan);
  const mc = useMonteCarlo(plan);
  const risk = MC_RISK[plan.mcRisk ?? "balanced"];
  const base = useVBase();
  return (
    <Link
      href={`${base}/result#montecarlo`}
      className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 transition-colors hover:bg-[#eef6fc]"
      style={{ border: `2px solid ${BLUE}60` }}
    >
      <span className="text-2xl font-bold tabular-nums" style={{ color: rateColor(mc.successRate) }}>
        {Math.round(mc.successRate * 100)}%
      </span>
      <span className="flex flex-col text-[11px] leading-snug">
        <span className="font-bold text-[#0a0a0a]">{base === "/v5" ? `${MC_RUNS.toLocaleString()}通りのうち、最後まで足りた割合` : "最後まで資金がもつ確率（振れ幅あり）"}</span>
        <span className="text-[#0a0a0a]/60">
          {risk.label}・{MC_RUNS.toLocaleString()}回試算
          {mc.worstDepletionAge !== null ? ` ／ 悪いケースで${mc.worstDepletionAge}歳に枯渇` : " ／ 悪いケースでも枯渇なし"}
          {" →"}
        </span>
      </span>
    </Link>
  );
}

// 結果ページの章
export function MonteCarloPanel() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const real = useUiStore((s) => s.realValue);
  const mc = useMonteCarlo(plan);
  const jp = useVBase() === "/v5"; // ver5 は「確率」と言い切らず「〜通りのうち足りた割合」と書く
  const compact = useIsNarrow();
  const riskKey: McRisk = plan.mcRisk ?? "balanced";

  const data = mc.bands.map((b) => {
    const f = real ? deflator(plan, b.age) : 1;
    const p10 = b.p10 / f;
    const p90 = b.p90 / f;
    return {
      age: b.age,
      base: p10,
      band: Math.max(0, p90 - p10),
      悪いケース: Math.round(p10),
      中央値: Math.round(b.p50 / f),
      良いケース: Math.round(p90),
      固定利回り: Math.round(b.fixed / f),
    };
  });

  const [lo, hi] = RETURN_GUIDE[riskKey];
  const mismatch = plan.nisaR < lo || plan.nisaR > hi;
  const pct = Math.round(mc.successRate * 100);
  const last = data[data.length - 1];

  return (
    <div id="montecarlo" className="flex flex-col gap-3">
      {/* リスク水準の3択 */}
      <div className="rounded-xl bg-white p-3" style={{ border: `2px solid ${INK}18` }}>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]/60">
          運用のリスク（値動きの大きさ）
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(MC_RISK) as McRisk[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setField("mcRisk", k)}
              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-center"
              style={{
                background: riskKey === k ? BLUE : "#fff",
                color: riskKey === k ? "#fff" : INK,
                border: `2px solid ${riskKey === k ? BLUE : `${INK}30`}`,
              }}
            >
              <span className="text-[13px] font-bold">{MC_RISK[k].label}</span>
              <span className="hidden text-[9px] leading-tight opacity-80 sm:block">{MC_RISK[k].note}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-[#0a0a0a]/60 sm:hidden">{MC_RISK[riskKey].note}</p>
        {mismatch ? (
          <p className="mt-2 text-[10px] font-bold leading-relaxed" style={{ color: "#a07900" }}>
            ※ NISAの想定利回り {plan.nisaR.toFixed(1)}% は「{MC_RISK[riskKey].label}」の目安（{lo}〜{hi}%）から外れています。
            値動きの小さい運用ほど期待できる利回りも低いので、両方をそろえると現実に近くなります（{plan.nisaR > hi ? "想定利回りを下げる" : "想定利回りを上げる"}のが目安。入力画面の「資産・運用」で変更）。
          </p>
        ) : null}
      </div>

      {/* 成功確率 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl p-4 sm:col-span-1" style={{ background: "#eef6fc", border: `2.5px solid ${BLUE}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: BLUE }}>
            {jp ? "最後まで足りた割合" : "最後まで資金がもつ確率"}
          </p>
          <p className="text-4xl font-bold tabular-nums" style={{ color: rateColor(mc.successRate) }}>
            {pct}%
          </p>
          <p className="text-[10px] text-[#0a0a0a]/60">
            {mc.runs.toLocaleString()}通りのうち {Math.round(mc.successRate * mc.runs).toLocaleString()}通りで{plan.endAge}歳まで資金ショートなし
          </p>
        </div>
        <div className="rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}18` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]/55">悪いケース（下位10%）</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: mc.worstDepletionAge !== null ? RED : GREEN }}>
            {mc.worstDepletionAge !== null ? `${mc.worstDepletionAge}歳で枯渇` : "枯渇なし"}
          </p>
          <p className="text-[10px] text-[#0a0a0a]/60">{plan.endAge}歳の金融資産 {man(last?.悪いケース ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}18` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]/55">固定利回りの計算では</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: mc.fixedShortfallAge !== null ? RED : GREEN }}>
            {mc.fixedShortfallAge !== null ? `${mc.fixedShortfallAge}歳で枯渇` : "枯渇なし"}
          </p>
          <p className="text-[10px] text-[#0a0a0a]/60">
            中央値 {man(last?.中央値 ?? 0)} ／ 固定 {man(last?.固定利回り ?? 0)}（{plan.endAge}歳）
          </p>
        </div>
      </div>

      {/* 帯グラフ */}
      <div className="rounded-xl bg-white p-3" style={{ border: `2px solid ${INK}18` }}>
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-[#0a0a0a]/70">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: `${BLUE}30` }} />良いケース〜悪いケース（上位10%〜下位10%）</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: BLUE }} />中央値</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: INK }} />固定利回り</span>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="rgba(10,10,10,0.08)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="age" tick={{ fill: INK, fontSize: 11 }} tickLine={false} />
              <YAxis tickFormatter={axisFmt} tick={{ fill: INK, fontSize: 11 }} width={56} tickLine={false} />
              <Tooltip
                position={compact ? { y: 0 } : undefined}
                wrapperStyle={{ pointerEvents: "none", zIndex: 5 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="rounded-lg bg-white px-2 py-1 text-[10px] shadow sm:px-3 sm:py-2 sm:text-[11px]" style={{ border: `1.5px solid ${INK}30` }}>
                      <p className="mb-1 font-bold">{label}歳</p>
                      <p>良いケース: {man(d.良いケース)}</p>
                      <p style={{ color: BLUE }}>中央値: {man(d.中央値)}</p>
                      <p>悪いケース: {man(d.悪いケース)}</p>
                      <p className="text-[#0a0a0a]/60">固定利回り: {man(d.固定利回り)}</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke={INK} />
              <Area type="monotone" dataKey="base" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area type="monotone" dataKey="band" stackId="b" stroke="none" fill={`${BLUE}30`} isAnimationActive={false} />
              <Line type="monotone" dataKey="中央値" stroke={BLUE} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="固定利回り" stroke={INK} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-[#0a0a0a]/55">
          金融資産＝現金・NISA・特定口座・DC・金・暗号資産の合計（ローンは差し引かない）。マイナスは現金不足の累計。
        </p>
      </div>

      <ul className="flex flex-col gap-1 rounded-xl bg-white p-4 text-[11px] leading-relaxed text-[#0a0a0a]/70" style={{ border: `2px solid ${INK}18` }}>
        <li>毎年の利回りを「入力した想定利回り＋その年の値動き」にして{MC_RUNS.toLocaleString()}通り計算。値動きの大きさは「{MC_RISK[riskKey].label}」で年±{Math.round(MC_RISK[riskKey].sigma * 100)}%前後（対数正規分布）。乱数の種を固定しているので、同じ入力なら毎回同じ結果です。</li>
        <li>平均は入力した利回りどおりですが、値動きがあると複利が目減りするため、中央値は固定計算より少し下に出ます。</li>
        <li>NISA・特定口座・DCは同じ市場の値動き、金・暗号資産は別の値動きで計算。物価・金利・給与は固定のままです。</li>
        <li>割合はこのモデルの仮定（値動きの大きさ・分布・資産どうしの連動）にもとづく目安で、起こる確率そのものではなく、将来を保証するものでもありません。大暴落は現実の方が起こりやすい点に注意してください。</li>
      </ul>
    </div>
  );
}
