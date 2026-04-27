"use client";

import type { PlanInput, SimulationSummary } from "@/lib/calc/types";

type AlertLevel = "good" | "warn" | "bad";

interface Health {
  score: number;
  alert: AlertLevel;
  headline: string;
  shortInsight: string;
}

const fmt = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
  return `${sign}${abs.toLocaleString()}万`;
};

function computeHealth(result: SimulationSummary, plan: PlanInput): Health {
  const nw = result.finalNetWorth;
  const endAge = plan.endAge;
  const curAge = plan.curAge;

  if (result.shortfallAge) {
    const sa = result.shortfallAge;
    const yearsLeft = sa - curAge;
    if (yearsLeft < 10) {
      return {
        score: 15,
        alert: "bad",
        headline: `${sa}歳で資金ショート（極めて深刻）`,
        shortInsight: "資金ショート対策が急務。固定費見直し・収入多角化を即時着手。",
      };
    }
    if (yearsLeft < 25) {
      return {
        score: 30,
        alert: "bad",
        headline: `${sa}歳で資金ショート`,
        shortInsight: "支出見直し・積立強化・退職延長を組み合わせて改善可能。",
      };
    }
    return {
      score: 45,
      alert: "warn",
      headline: `${sa}歳で資金ショート（中長期で修正可能）`,
      shortInsight: "中長期積立とリスク許容度に応じた配分で十分修正可能。",
    };
  }

  if (nw < 0) {
    return {
      score: 35,
      alert: "bad",
      headline: `${endAge}歳時点で純資産マイナス`,
      shortInsight: "繰上返済・不動産見直しによる抜本的な家計再構築を推奨。",
    };
  }
  if (nw < 5_000_000) {
    return {
      score: 55,
      alert: "warn",
      headline: `${endAge}歳まで完走するも余裕わずか`,
      shortInsight: "生活防衛資金（年収1〜2年分）の確保を優先。",
    };
  }
  if (nw < 20_000_000) {
    return {
      score: 65,
      alert: "warn",
      headline: "老後資金は最低限確保",
      shortInsight: "NISA・iDeCo最大活用で老後余裕度を改善。",
    };
  }
  if (nw < 50_000_000) {
    return {
      score: 75,
      alert: "good",
      headline: "老後資金は概ね安定",
      shortInsight: "インフレ耐性強化のため株式・投信での分散運用を継続。",
    };
  }
  if (nw < 100_000_000) {
    return {
      score: 85,
      alert: "good",
      headline: "余裕ある資産形成",
      shortInsight: "相続税対策の検討時期。生前贈与・保険活用が有効。",
    };
  }
  if (nw < 300_000_000) {
    return {
      score: 92,
      alert: "good",
      headline: "資産計画は非常に良好",
      shortInsight: "暦年贈与・教育資金贈与等の制度活用で資産移転戦略を。",
    };
  }
  return {
    score: 98,
    alert: "good",
    headline: "富裕層レベルの資産計画",
    shortInsight: "法人化・家族信託等を含む包括的な相続戦略の構築が必須。",
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
}: {
  result: SimulationSummary;
  plan: PlanInput;
}) {
  const health = computeHealth(result, plan);
  const c = ALERT_COLORS[health.alert];
  const nwSeries = result.rows.map((r) => r.nw);

  const lastJobEndAge =
    plan.jobs.length > 0
      ? Math.max(...plan.jobs.map((j) => j.end))
      : plan.penStartA;
  const retireRow = result.rows.find((r) => r.age === lastJobEndAge);
  const nwAtRetire = retireRow ? retireRow.nw : null;
  const nwAt65 = result.rows.find((r) => r.age === 65)?.nw ?? null;
  const shortfallText = result.shortfallAge ? `${result.shortfallAge}歳` : "なし";

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ background: "#ffffff", border: "2.5px solid #0a0a0a" }}
    >
      {/* 上段: 左右2カラム */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* 左上: 診断スコア */}
        <div
          className="flex items-center gap-3 px-4 py-3 sm:border-r"
          style={{
            background: c.light,
            borderColor: `${c.main}30`,
            borderRight: undefined,
            borderBottom: `2px solid ${c.main}`,
          }}
        >
          <div className="flex shrink-0 flex-col items-center">
            <div
              className="flex items-center justify-center"
              style={{
                background: c.main,
                borderRadius: "50%",
                width: 56,
                height: 56,
              }}
            >
              <span className="text-lg font-bold text-white tabular-nums">
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
          </div>
        </div>

        {/* 右上: 主要指標 KEY INDICATORS */}
        <div
          className="flex flex-col gap-2 px-4 py-3"
          style={{ borderBottom: "1.5px solid #0a0a0a18" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/60">
              主要指標 ／ KEY INDICATORS
            </span>
            <span
              aria-hidden
              className="inline-block h-px flex-1"
              style={{ background: "#0a0a0a18" }}
            />
          </div>

          {/* 最終純資産 + sparkline (最も大きく) */}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/55">
                最終純資産（{plan.endAge}歳）
              </p>
              <p
                className="text-base font-bold tabular-nums leading-tight"
                style={{ color: result.finalNetWorth < 0 ? "#c8383a" : "#0a0a0a" }}
              >
                {fmt(result.finalNetWorth)}
              </p>
            </div>
            <Sparkline
              values={nwSeries}
              positive={result.finalNetWorth >= 0}
              width={90}
              height={32}
            />
          </div>

          {/* 3 KPI 小 */}
          <div className="grid grid-cols-3 gap-x-2 gap-y-1">
            <KpiInline
              label="ショート"
              value={shortfallText}
              status={result.shortfallAge ? "alert" : "ok"}
            />
            <KpiInline
              label={`退職時(${lastJobEndAge}歳)`}
              value={nwAtRetire !== null ? fmt(nwAtRetire) : "—"}
              status={nwAtRetire !== null && nwAtRetire < 0 ? "alert" : "neutral"}
            />
            <KpiInline
              label="65歳純資産"
              value={nwAt65 !== null ? fmt(nwAt65) : "—"}
              status={nwAt65 !== null && nwAt65 < 0 ? "alert" : "neutral"}
            />
          </div>
        </div>
      </div>

      {/* 下段: FP INSIGHT 1行 */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: c.light }}
      >
        <span
          className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{ color: c.text }}
        >
          FP INSIGHT
        </span>
        <span className="text-[11px] leading-snug text-[#0a0a0a]/80">
          {health.shortInsight}
        </span>
      </div>
    </div>
  );
}

function Sparkline({
  values,
  width = 90,
  height = 32,
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
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r={2.2} fill={lastColor} />
      )}
    </svg>
  );
}

type BadgeStatus = "ok" | "warn" | "alert" | "neutral";

function KpiInline({
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
  const icon = status === "ok" ? "✓" : status === "alert" ? "⚠" : "";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span
          className="inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center text-[7px] font-bold leading-none text-white"
          style={{ background: dotColor, borderRadius: "50%", lineHeight: "10px" }}
        >
          {icon}
        </span>
        <span className="truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#0a0a0a]/55">
          {label}
        </span>
      </div>
      <span
        className="text-xs font-bold tabular-nums leading-tight"
        style={{ color: valueColor }}
      >
        {value}
      </span>
    </div>
  );
}
