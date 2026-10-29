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
  const d = result.finalNetWorth - prev.finalNetWorth;
  if (Math.abs(d) >= 10000) return { text: `直前の入力で ${d > 0 ? "+" : ""}${man(d)}円`, good: d > 0 };
  return null;
}

function MiniChart({ result, height }: { result: SimulationSummary; height: number }) {
  const rows = result.rows;
  if (rows.length < 2) return null;
  const W = 300;
  const H = 120;
  const vals = rows.map((r) => r.nw);
  const max = Math.max(0, ...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const x = (i: number) => (i / (rows.length - 1)) * W;
  const y = (v: number) => H - 4 - ((v - min) / span) * (H - 8);
  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const sIdx = result.shortfallAge ? rows.findIndex((r) => r.age === result.shortfallAge) : -1;
  const first = rows[0].age;
  const last = rows[rows.length - 1].age;
  return (
    <figure className="m-0 flex flex-col gap-1">
      <svg
        role="img"
        aria-label={`純資産の推移（${first}歳〜${last}歳）`}
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#0a0a0a40" strokeWidth={1} vectorEffect="non-scaling-stroke" />
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
      <figcaption className="flex justify-between text-[10px] font-bold tabular-nums text-[#0a0a0a]/60">
        <span>{first}歳</span>
        <span>純資産の推移</span>
        <span>{last}歳</span>
      </figcaption>
    </figure>
  );
}

function Headline({ result, plan, compact }: { result: SimulationSummary; plan: PlanInput; compact?: boolean }) {
  const sa = result.shortfallAge;
  const big = compact ? "text-2xl" : "text-5xl";
  if (sa) {
    return (
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-[#0a0a0a]/65">お金が足りなくなる年齢</span>
        <span className={`${big} font-bold leading-tight tabular-nums`} style={{ color: RED }}>
          {sa}
          <span className="ml-1 text-sm">歳</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-bold text-[#0a0a0a]/65">{plan.endAge}歳まで</span>
      <span className={`${big} font-bold leading-tight`}>足ります</span>
      {compact ? null : (
        <span className="text-[11px] font-bold tabular-nums text-[#0a0a0a]/65">
          {plan.endAge}歳時点の純資産 {man(result.finalNetWorth)}円
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
        <span>試算の精度</span>
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
}: {
  result: SimulationSummary;
  plan: PlanInput;
  variant: "side" | "bar";
  onShowNow: () => void;
}) {
  const real = useUiStore((s) => s.realValue);
  const delta = useDelta(result);
  const [barOpen, setBarOpen] = useState(false);
  const ready = !!plan.selfBirth;

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
        style={{ border: "2.5px solid #0a0a0a" }}
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
            <MiniChart result={result} height={140} />
          </>
        ) : (
          <p className="rounded-lg px-3 py-6 text-center text-[12px] font-bold leading-relaxed text-[#0a0a0a]/65" style={{ background: "#f0f0ee" }}>
            本人の生年月日を入れると、
            <br />
            ここに試算が出ます
          </p>
        )}
        <div className="border-t pt-4" style={{ borderColor: "#0a0a0a20" }}>
          <Accuracy />
        </div>
        <button
          type="button"
          onClick={onShowNow}
          disabled={!ready}
          className="rounded-lg px-3 py-2.5 text-[12px] font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          style={{ border: "2px solid #0a0a0a" }}
        >
          この時点の結果を見る →
        </button>
        <p className="text-[10px] leading-relaxed text-[#0a0a0a]/55">
          空欄は平均的な値で計算した概算です。将来を保証するものではありません。
        </p>
      </aside>
    );
  }

  // スマホ: 画面の下に固定。タップでグラフを開く
  return (
    <div
      className="no-print fixed inset-x-0 bottom-0 z-40 bg-white px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] lg:hidden"
      style={{ borderTop: "2.5px solid #0a0a0a" }}
    >
      {barOpen && ready ? (
        <div className="flex flex-col gap-3 pb-3">
          <MiniChart result={result} height={110} />
          <Accuracy />
          <button
            type="button"
            onClick={onShowNow}
            className="rounded-lg px-3 py-2.5 text-[12px] font-bold"
            style={{ border: "2px solid #0a0a0a" }}
          >
            この時点の結果を見る →
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
          <span className="text-[12px] font-bold text-[#0a0a0a]/65">本人の生年月日を入れると、ここに試算が出ます</span>
        )}
      </button>
    </div>
  );
}
