"use client";

import { useState } from "react";

import { SECTION_ORDER } from "@/components/v4/Section";
import type { PlanInput, SimulationSummary } from "@/lib/v4/calc/types";
import { useUiStore } from "@/store/v4/ui-store";

// ver5: はじめての人が入力している間も、結果を横（スマホは下）に出しておく「いまの試算」

type SectionId = (typeof SECTION_ORDER)[number];

const LABELS: Record<SectionId, string> = {
  "ch-settings": "基本設定",
  "ch-income": "収入",
  "ch-assets": "資産・運用",
  "ch-expense": "支出",
};

// 次に入れると試算がどう良くなるか
const NEXT_HINT: Record<SectionId, string> = {
  "ch-settings": "基本設定をOKすると、収入の入力に進めます",
  "ch-income": "収入を入れると、老後までの貯まり方が見えてきます",
  "ch-assets": "資産・運用を入れると、結果のブレが大きく減ります",
  "ch-expense": "支出を入れると、結果が実際の暮らしに近づきます",
};

const RED = "#c8383a";
const INK = "#0a0a0a";

const man = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
  return `${sign}${abs.toLocaleString()}万`;
};

// 金融資産 = 預金と投資（現金・NISA・特定口座・暗号資産・金・DC）。家とローンは入れない（Lite の「お金」と同じ定義）
const finOf = (r: SimulationSummary["rows"][number]) => r.ass.c + r.ass.nisa + r.ass.toku + r.ass.k + r.ass.g + r.ass.dc;
const finalFin = (s: SimulationSummary) => (s.rows.length ? finOf(s.rows[s.rows.length - 1]) : 0);

// 直前の入力からの変化。前の結果を state に持ち、結果が変わったら1つずらす（React 推奨の「前の値」パターン）
function useDelta(result: SimulationSummary) {
  const [hist, setHist] = useState<{ cur: SimulationSummary; prev: SimulationSummary | null }>({
    cur: result,
    prev: null,
  });
  if (hist.cur !== result) setHist({ cur: result, prev: hist.cur });
  const prev = hist.prev;
  if (!prev) return null;
  if (prev.shortfallAge && result.shortfallAge) {
    const d = result.shortfallAge - prev.shortfallAge;
    if (d !== 0) return { text: `直前の入力で ${d > 0 ? "+" : ""}${d}歳`, good: d > 0 };
  }
  if (prev.shortfallAge && !result.shortfallAge) return { text: "直前の入力で、最後まで足りるようになりました", good: true };
  if (!prev.shortfallAge && result.shortfallAge) return { text: "直前の入力で、途中で足りなくなりました", good: false };
  const d = finalFin(result) - finalFin(prev);
  if (Math.abs(d) >= 10000) return { text: `直前の入力で ${d > 0 ? "+" : ""}${man(d)}円`, good: d > 0 };
  return null;
}

// スマホの下のバーで開く小さなグラフ。縦軸（金額）と0の線に目盛りを付ける
function MiniChart({ result, height }: { result: SimulationSummary; height: number }) {
  const rows = result.rows;
  if (rows.length < 2) return null;
  const W = 300;
  const H = 120;
  const vals = rows.map(finOf);
  const max = Math.max(0, ...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const x = (i: number) => (i / (rows.length - 1)) * W;
  const y = (v: number) => H - 4 - ((v - min) / span) * (H - 8);
  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  // 0より下は赤く塗る
  const area = `${d} L${W} ${y(0).toFixed(1)} L0 ${y(0).toFixed(1)} Z`;
  const sIdx = result.shortfallAge ? rows.findIndex((r) => r.age === result.shortfallAge) : -1;
  const first = rows[0].age;
  const last = rows[rows.length - 1].age;
  const pct = (v: number) => `${(y(v) / H) * 100}%`;
  const ticks = [
    { v: max, show: max > 0 },
    { v: 0, show: true },
    { v: min, show: min < 0 },
  ].filter((t) => t.show);
  return (
    <figure className="m-0 flex flex-col gap-1">
      <p className="text-[10px] font-bold text-[#0a0a0a]/60">金融資産（預金と投資。家とローンは入れない）</p>
      <div className="relative pl-16" style={{ height }}>
        {ticks.map((t) => (
          <span
            key={t.v}
            className="absolute left-0 w-[60px] -translate-y-1/2 whitespace-nowrap text-right text-[10px] font-bold tabular-nums"
            style={{ top: pct(t.v), color: t.v < 0 ? RED : "#0a0a0a99" }}
          >
            {t.v === 0 ? "0円" : `${man(t.v)}円`}
          </span>
        ))}
        <svg
          role="img"
          aria-label={`金融資産の推移（${first}歳〜${last}歳）`}
          width="100%"
          height={height}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id="lp-mini-neg">
              <rect x={0} y={y(0)} width={W} height={H - y(0)} />
            </clipPath>
          </defs>
          <path d={area} fill={RED} fillOpacity={0.15} clipPath="url(#lp-mini-neg)" />
          <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke={INK} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          {sIdx >= 0 ? (
            <line
              x1={x(sIdx)}
              x2={x(sIdx)}
              y1={0}
              y2={H}
              stroke={RED}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <path d={d} fill="none" stroke={INK} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </div>
      <figcaption className="flex justify-between pl-16 text-[10px] font-bold tabular-nums text-[#0a0a0a]/60">
        <span>{first}歳</span>
        {sIdx >= 0 ? <span style={{ color: RED }}>{result.shortfallAge}歳でお金が足りなくなる</span> : null}
        <span>{last}歳</span>
      </figcaption>
    </figure>
  );
}

// 判定の見出し。大きな一語で言い切らず、「入力した条件での計算」であることと根拠の数字を一緒に出す
function Headline({ result, plan, compact }: { result: SimulationSummary; plan: PlanInput; compact?: boolean }) {
  const sa = result.shortfallAge;
  const size = compact ? "text-[15px]" : "text-2xl";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`${size} font-bold leading-snug`} style={{ color: sa ? RED : INK }}>
        {sa ? `${sa}歳で、お金が足りなくなる計算` : `${plan.endAge}歳まで、お金は足りる計算`}
      </span>
      {compact ? null : (
        <span className="text-[11px] font-bold tabular-nums text-[#0a0a0a]/65">
          {plan.endAge}歳時点の金融資産（預金と投資） {man(finalFin(result))}円
        </span>
      )}
    </div>
  );
}

function Accuracy() {
  const confirmed = useUiStore((s) => s.confirmed);
  const done = SECTION_ORDER.filter((id) => confirmed[id]).length;
  const next = SECTION_ORDER.find((id) => !confirmed[id]);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[11px] font-bold">
        <span>入力の進み具合</span>
        <span className="text-[#0a0a0a]/60">{done} / 4 ブロック入力済み</span>
      </div>
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {SECTION_ORDER.map((id) => (
          <span key={id} className="h-1.5 rounded-full" style={{ background: confirmed[id] ? INK : "#0a0a0a22" }} />
        ))}
      </div>
      {next ? (
        <p className="text-[11px] leading-relaxed text-[#0a0a0a]/65">
          次は「{LABELS[next]}」。{NEXT_HINT[next]}
        </p>
      ) : null}
    </div>
  );
}

export function LivePreview({
  result,
  plan,
  variant,
  onShowNow,
  actionLabel = "この時点の結果を見る →",
  showAccuracy = true,
  requireBirth = true,
  chart = true,
}: {
  result: SimulationSummary;
  plan: PlanInput;
  variant: "side" | "bar";
  onShowNow: () => void;
  actionLabel?: string; // 入力を終えた人には「詳しいレポートを見る」
  showAccuracy?: boolean; // 入力を終えた人には精度メーターを出さない
  requireBirth?: boolean; // はじめての人は生年月日が入るまで試算を出さない（サンプル等は生年月日なしでも出す）
  chart?: boolean; // PCの右側は下に詳しいグラフを並べるので、小さなグラフは出さない
}) {
  const real = useUiStore((s) => s.realValue);
  const delta = useDelta(result);
  const [barOpen, setBarOpen] = useState(false);
  const hasBirth = !requireBirth || !!plan.selfBirth;
  // 生活費が0円のままだと、収入がそのまま貯まる計算になり「足りる」と出てしまう。生活費が入るまで判定を出さない
  const hasLiving = plan.livingM > 0;
  const ready = hasBirth && hasLiving;
  const waitText = !hasBirth ? "本人の生年月日を入れると、ここに試算が出ます" : "毎月の生活費（4 支出）を入れると、判定が出ます";

  const deltaEl = delta ? (
    <span className="text-[11px] font-bold" style={{ color: delta.good ? "#22863a" : RED }} aria-live="polite">
      {delta.text}
    </span>
  ) : null;

  if (variant === "side") {
    return (
      <aside
        aria-label="いまの試算"
        className="no-print flex flex-col gap-4 rounded-xl bg-white p-5"
        style={{ border: "1.5px solid #0a0a0a" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">いまの試算</h2>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ border: "1.5px solid #0a0a0a" }}>
            {real ? "今の価値" : "名目"}
          </span>
        </div>
        {ready ? (
          <>
            <Headline result={result} plan={plan} />
            {deltaEl}
            {chart ? <MiniChart result={result} height={140} /> : null}
          </>
        ) : (
          <p className="rounded-lg px-3 py-6 text-center text-[12px] font-bold leading-relaxed text-[#0a0a0a]/65" style={{ background: "#f0f0ee" }}>
            {waitText}
            {hasBirth ? (
              <span className="mt-1 block text-[11px] font-normal">生活費が0円のままだと、収入がそのまま貯まる計算になるためです</span>
            ) : null}
          </p>
        )}
        {showAccuracy ? (
          <div className="border-t pt-4" style={{ borderColor: "#0a0a0a20" }}>
            <Accuracy />
          </div>
        ) : null}
        <button
          type="button"
          onClick={onShowNow}
          disabled={!ready}
          className="rounded-lg px-3 py-2.5 text-[12px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          style={{ border: "2px solid #0a0a0a" }}
        >
          {actionLabel}
        </button>
        <p className="text-[10px] leading-relaxed text-[#0a0a0a]/55">
          空欄の金額は0円として計算します（物価・利回り・年金の改定率などは初期値）。概算で、将来を保証するものではありません。
        </p>
      </aside>
    );
  }

  // スマホ: 画面の下に固定。タップでグラフを開く
  return (
    <div
      className="no-print fixed inset-x-0 bottom-0 z-40 bg-white px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] lg:hidden"
      style={{ borderTop: "1.5px solid #0a0a0a" }}
    >
      {barOpen && ready ? (
        <div className="flex flex-col gap-3 pb-3">
          <MiniChart result={result} height={110} />
          {showAccuracy ? <Accuracy /> : null}
          <button
            type="button"
            onClick={onShowNow}
            className="rounded-lg px-3 py-2.5 text-[12px] font-bold"
            style={{ border: "2px solid #0a0a0a" }}
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={barOpen}
        onClick={() => setBarOpen((v) => !v)}
        disabled={!ready}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left"
        style={{ background: "#f0f0ee" }}
      >
        {ready ? (
          <>
            <Headline result={result} plan={plan} compact />
            <span className="flex flex-col items-end gap-0.5">
              {deltaEl}
              <span className="text-[11px] font-bold text-[#0a0a0a]/65">{barOpen ? "閉じる ▾" : "グラフ ▴"}</span>
            </span>
          </>
        ) : (
          <span className="text-[12px] font-bold text-[#0a0a0a]/65">{waitText}</span>
        )}
      </button>
    </div>
  );
}
