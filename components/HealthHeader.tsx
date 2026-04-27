"use client";

import type { PlanInput, SimulationSummary } from "@/lib/calc/types";

type AlertLevel = "good" | "warn" | "bad";

interface Health {
  score: number;
  alert: AlertLevel;
  headline: string;
  sub: string;
}

const fmt = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
  return `${sign}${abs.toLocaleString()}万`;
};

function computeHealth(result: SimulationSummary, plan: PlanInput): Health {
  const nw = result.finalNetWorth;

  if (result.shortfallAge) {
    const yearsToShortfall = result.shortfallAge - plan.curAge;
    if (yearsToShortfall < 10) {
      return {
        score: 15,
        alert: "bad",
        headline: `${result.shortfallAge}歳で資金ショート`,
        sub: "早急な対策が必要です。改善提案で具体策を確認してください。",
      };
    }
    if (yearsToShortfall < 25) {
      return {
        score: 30,
        alert: "bad",
        headline: `${result.shortfallAge}歳で資金ショート`,
        sub: "対策が必要です。生活費・収入・運用を見直しましょう。",
      };
    }
    return {
      score: 45,
      alert: "warn",
      headline: `${result.shortfallAge}歳で資金ショート`,
      sub: "中長期対策で改善可能です。積立増・支出見直しを検討。",
    };
  }

  if (nw < 0) {
    return {
      score: 35,
      alert: "bad",
      headline: `${plan.endAge}歳時点で純資産マイナス`,
      sub: "支出の削減と積立の強化が急務です。",
    };
  }
  if (nw < 5_000_000) {
    return {
      score: 55,
      alert: "warn",
      headline: `${plan.endAge}歳まで完走するも余裕わずか`,
      sub: "想定外の支出への備えを厚くしましょう。",
    };
  }
  if (nw < 20_000_000) {
    return {
      score: 65,
      alert: "warn",
      headline: "老後資金は最低限確保",
      sub: "医療費・介護費の備蓄を厚めにしておくと安心です。",
    };
  }
  if (nw < 50_000_000) {
    return {
      score: 75,
      alert: "good",
      headline: "老後資金は概ね安定",
      sub: "インフレ・医療費リスクに備え、引き続き分散運用を継続。",
    };
  }
  if (nw < 100_000_000) {
    return {
      score: 85,
      alert: "good",
      headline: "余裕ある資産形成",
      sub: "相続・贈与対策や資産の最適化を検討するタイミングです。",
    };
  }
  if (nw < 300_000_000) {
    return {
      score: 92,
      alert: "good",
      headline: "資産計画は非常に良好",
      sub: "余剰資金を活用した最適化や次世代への移転戦略を検討。",
    };
  }
  return {
    score: 98,
    alert: "good",
    headline: "富裕層レベルの資産計画",
    sub: "FPへの個別相談で更なる資産効率の向上を図りましょう。",
  };
}

const ALERT_COLORS: Record<AlertLevel, { main: string; light: string; text: string }> = {
  good: { main: "#22863a", light: "#f0fff4", text: "#22863a" },
  warn: { main: "#d4a017", light: "#fff8e7", text: "#a07900" },
  bad: { main: "#c8383a", light: "#fff0f0", text: "#c8383a" },
};

export function HealthHeader({
  result,
  plan,
  taxModeDetailed,
}: {
  result: SimulationSummary;
  plan: PlanInput;
  taxModeDetailed: boolean;
}) {
  const health = computeHealth(result, plan);
  const c = ALERT_COLORS[health.alert];
  const nwSeries = result.rows.map((r) => r.nw);

  const totalCare = result.rows.reduce((a, r) => a + r.care, 0);
  const totalInherit = result.rows.reduce((a, r) => a + r.inherit, 0);
  const totalSocialIns = result.rows.reduce((a, r) => a + r.socialIns, 0);
  const shortfallText = result.shortfallAge ? `${result.shortfallAge}歳` : "なし";

  return (
    <div
      className="rounded-xl"
      style={{ background: "#ffffff", border: "2.5px solid #0a0a0a" }}
    >
      {/* スコア + 診断 */}
      <div
        className="flex items-center gap-3 rounded-t-[10px] px-4 py-3"
        style={{ background: c.light, borderBottom: `2px solid ${c.main}` }}
      >
        <div className="flex shrink-0 flex-col items-center">
          <div
            className="flex items-center justify-center"
            style={{
              background: c.main,
              borderRadius: "50%",
              width: 48,
              height: 48,
            }}
          >
            <span className="text-base font-bold text-white tabular-nums">
              {health.score}
            </span>
          </div>
          <span
            className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em]"
            style={{ color: c.text }}
          >
            /100
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: c.text }}
          >
            診断スコア
          </p>
          <p className="mt-0.5 text-sm font-bold leading-tight text-[#0a0a0a]">
            {health.headline}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-[#0a0a0a]/65">
            {health.sub}
          </p>
        </div>
      </div>

      {/* 主要KPI */}
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/55">
              最終純資産（{plan.endAge}歳）
            </p>
            <p
              className="text-lg font-bold tabular-nums"
              style={{ color: result.finalNetWorth < 0 ? "#c8383a" : "#0a0a0a" }}
            >
              {fmt(result.finalNetWorth)}
            </p>
          </div>
          <Sparkline
            values={nwSeries}
            positive={result.finalNetWorth >= 0}
            width={110}
            height={36}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <KpiBadge
            label="資金ショート"
            value={shortfallText}
            status={result.shortfallAge ? "alert" : "ok"}
          />
          <KpiBadge
            label="生涯介護"
            value={totalCare > 0 ? fmt(totalCare) : "0万"}
            status={totalCare > 0 ? "warn" : "neutral"}
          />
          <KpiBadge
            label="生涯相続"
            value={totalInherit > 0 ? fmt(totalInherit) : "0万"}
            status={totalInherit > 0 ? "ok" : "neutral"}
          />
          <KpiBadge
            label="生涯社保"
            value={taxModeDetailed ? fmt(totalSocialIns) : "—"}
            status="neutral"
          />
        </div>
      </div>
    </div>
  );
}

function Sparkline({
  values,
  width = 110,
  height = 36,
  positive = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y] as const;
  });

  const path = points.reduce(
    (acc, [x, y], i) => `${acc}${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `,
    "",
  );

  // ゼロ線
  const zeroY =
    min < 0 && max > 0 ? height - 2 - ((0 - min) / range) * (height - 4) : null;

  const lastPoint = points[points.length - 1];
  const lineColor = positive ? "#0a0a0a" : "#c8383a";
  const lastValue = values[values.length - 1];
  const lastColor = lastValue >= 0 ? "#22863a" : "#c8383a";

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", flexShrink: 0 }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {zeroY !== null && (
        <line
          x1={0}
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="#0a0a0a40"
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {lastPoint && (
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r={2.5} fill={lastColor} />
      )}
    </svg>
  );
}

type BadgeStatus = "ok" | "warn" | "alert" | "neutral";

function KpiBadge({
  label,
  value,
  status = "neutral",
}: {
  label: string;
  value: string;
  status?: BadgeStatus;
}) {
  const dotColor =
    status === "ok"
      ? "#22863a"
      : status === "warn"
        ? "#d4a017"
        : status === "alert"
          ? "#c8383a"
          : "#9ca3af";
  const valueColor = status === "alert" ? "#c8383a" : "#0a0a0a";
  const icon =
    status === "ok"
      ? "✓"
      : status === "alert"
        ? "⚠"
        : "";
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="inline-flex h-3 w-3 shrink-0 items-center justify-center text-[8px] font-bold leading-none text-white"
        style={{ background: dotColor, borderRadius: "50%", lineHeight: "12px" }}
      >
        {icon}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/55">
        {label}
      </span>
      <span
        className="ml-auto text-sm font-bold tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </span>
    </div>
  );
}
