"use client";

import type { PlanInput, SimulationSummary } from "@/lib/calc/types";

type AlertLevel = "good" | "warn" | "bad";

interface Health {
  score: number;
  alert: AlertLevel;
  headline: string;
  fpComment: string;
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
        fpComment: `現在の収支水準では、わずか${yearsLeft}年後の${sa}歳時点で運用資産・現金がともに枯渇する見込みです。これは老後資金として極めて深刻な状況であり、即効性のある対策が必要です。\n\n固定費の見直し（住居費・通信費・保険料の最適化）、副業や配偶者の就労強化による収入源の多角化、退職時期の延長を中心に複数施策を組み合わせることが重要です。「改善提案」タブで複数シナリオの効果を比較し、優先順位の高い施策から着手することをお勧めします。\n\n短期的にはキャッシュフロー改善、中期的にはNISA・iDeCo等の非課税枠を活用した積立投資の強化、長期的には不動産・保険の見直しを段階的に進めましょう。`,
      };
    }
    if (yearsLeft < 25) {
      return {
        score: 30,
        alert: "bad",
        headline: `${sa}歳で資金ショート`,
        fpComment: `${sa}歳（あと${yearsLeft}年）で資金ショートが発生する見込みです。現役期の収支構造に課題があり、根本的な見直しが必要なタイミングです。\n\n推奨アクションは、(1) 月々の支出見直しによる固定費削減（特に住居費・通信費・保険料）、(2) NISA・iDeCo等の非課税枠を活用した積立投資の強化、(3) 退職時期の延長や年金繰下げによる公的年金受給額の上乗せ、(4) 不動産・有価証券の運用効率改善、を組み合わせることです。\n\n${yearsLeft}年あれば改善余地は十分にあります。「改善提案」で各施策の効果を試算し、ご自身の生活設計と照らし合わせて実行可能なプランを策定してください。`,
      };
    }
    return {
      score: 45,
      alert: "warn",
      headline: `${sa}歳で資金ショート（中長期で修正可能）`,
      fpComment: `${sa}歳での資金ショートが見込まれますが、現在から${yearsLeft}年の準備期間があるため、中長期的な資産形成戦略で十分に修正可能です。\n\n毎月の積立額の段階的な引き上げ、リスク許容度に応じた資産配分の最適化（株式・投信比率の適正化）、企業型DC・iDeCoの最大活用を計画的に進めることで、老後資金は十分に確保できる水準です。\n\n若いうちは複利効果が大きく働くため、「無理のない範囲で早く・長く」が鉄則です。「改善提案」で具体的な数値目標を確認し、年単位での段階的な実行計画を立てましょう。`,
    };
  }

  if (nw < 0) {
    return {
      score: 35,
      alert: "bad",
      headline: `${endAge}歳時点で純資産マイナス`,
      fpComment: `${endAge}歳時点で純資産がマイナス領域に入る見通しです。住宅ローン・不動産ローン・その他借入の残債が老後の資産を圧迫している可能性が高い状態です。\n\n推奨対応として、(1) 繰上返済の優先度評価（金利の高いローンから順に整理）、(2) 不動産の見直し（売却・賃貸転換・住み替えダウンサイズ）、(3) 生活費水準の調整、(4) 必要に応じた個人型確定拠出年金の活用、を含めた抜本的な家計設計の再構築が必要です。\n\nFP個別相談で残債推移と資産形成のバランスを定量的に分析することをお勧めします。`,
    };
  }
  if (nw < 5_000_000) {
    return {
      score: 55,
      alert: "warn",
      headline: `${endAge}歳まで完走するも余裕わずか`,
      fpComment: `${endAge}歳まで完走できる計画ですが、最終純資産は500万円未満と余裕は限定的です。想定外の支出リスク（医療費・介護費・物価高騰・住宅修繕）に対する備えが手薄な状態です。\n\n生活防衛資金として手取り年収の1〜2年分（300〜600万円目安）を流動性の高い預金や短期国債で確保しつつ、残りの資産を長期分散投資に振り向けることで耐性を高められます。\n\n特に65歳以降の医療費・介護費は想定以上に膨らむ傾向があるため、民間医療保険・介護保険の補完も合わせて検討してください。`,
    };
  }
  if (nw < 20_000_000) {
    return {
      score: 65,
      alert: "warn",
      headline: "老後資金は最低限確保",
      fpComment: `老後資金は最低限確保できる計画です。ただし長寿リスク（90歳以上まで生存する確率）や高齢期の医療・介護費を踏まえると、もう少し厚みが欲しいラインです。\n\n推奨アクションは、NISA・iDeCoの非課税枠を最大活用し、現役期の月々の積立を5〜10万円増やすことです。これだけで80歳以降の生活余裕度を大幅に改善できます。\n\n住居費の見直し（賃貸 vs 持ち家、住み替えダウンサイズ）、保険の重複整理、ふるさと納税・iDeCoによる節税を組み合わせて可処分所得を増やし、増えた分を投資に回す好循環を作りましょう。`,
    };
  }
  if (nw < 50_000_000) {
    return {
      score: 75,
      alert: "good",
      headline: "老後資金は概ね安定",
      fpComment: `老後資金計画は概ね安定しています。基本的な生活設計に大きな問題はなく、想定通り推移すれば${endAge}歳まで安心して過ごせる水準です。\n\n今後の主要な課題は、(1) インフレ耐性の強化（資産の30〜50%を株式・投信で運用し購買力を維持）、(2) 医療費・介護費リスクの軽減（民間保険・公的制度の併用）、(3) 相続・贈与の準備（基礎控除の範囲内での計画的な資産移転）です。\n\n資産配分は年齢に応じて段階的にリスクを下げる「ライフサイクル型」が基本ですが、長寿化を踏まえると65歳時点でも30〜40%程度の株式比率を維持することを推奨します。`,
    };
  }
  if (nw < 100_000_000) {
    return {
      score: 85,
      alert: "good",
      headline: "余裕ある資産形成",
      fpComment: `余裕のある資産形成が見込まれており、現役期の収支構造は健全です。${endAge}歳時点で5,000万〜1億円の純資産が残る見通しで、想定外の支出にも十分対応できる体力があります。\n\n今後は「守りから攻めへ」の移行を意識するタイミングです。具体的には、(1) 相続税対策（生前贈与・生命保険の死亡保険金非課税枠の活用）、(2) 子・孫への教育資金一括贈与（1,500万円非課税）の検討、(3) 不動産・有価証券の含み益処理、(4) 家族信託の検討、など富裕層向けの最適化テーマを順次検討しましょう。\n\nFP・税理士による定期レビュー（年1回程度）で、税制改正や家族構成の変化に応じた戦略の見直しを推奨します。`,
    };
  }
  if (nw < 300_000_000) {
    return {
      score: 92,
      alert: "good",
      headline: "資産計画は非常に良好",
      fpComment: `資産計画は非常に良好な水準です。1億〜3億円規模の純資産が形成される見通しで、相続税の課税対象となる規模です。無対策では相続税で数千万円規模の負担が発生する可能性があります。\n\n相続・贈与対策の本格的な検討時期です。具体的には、(1) 配偶者・子への暦年贈与（年間110万円非課税）の継続実施、(2) 教育資金一括贈与の特例（1,500万円非課税）、(3) 生命保険の死亡保険金非課税枠（500万円×法定相続人数）の活用、(4) 不動産の活用による評価額圧縮、(5) 配偶者の税額軽減（1億6,000万円まで非課税）の検討、など複数制度を組み合わせた戦略的な資産移転を計画しましょう。\n\nFP・税理士との連携による包括的な相続・事業承継プランの策定をお勧めします。`,
    };
  }
  return {
    score: 98,
    alert: "good",
    headline: "富裕層レベルの資産計画",
    fpComment: `富裕層レベルの資産形成が見込まれます。3億円超の純資産は相続税の最高税率（55%）の対象となり、無対策では資産の半分以上が税金として失われる可能性があります。\n\n専門家チーム（FP・税理士・弁護士）による包括的な相続・事業承継戦略の構築が必須レベルです。検討すべき施策には、(1) 資産管理会社の設立による法人化メリットの享受、(2) 不動産による評価額圧縮（タワマン節税は規制強化に注意）、(3) 生命保険を活用した納税資金確保、(4) 家族信託による認知症リスク対応、(5) 海外資産の活用と国際相続の検討、などがあります。\n\n税制改正の影響も大きいため、年単位での戦略見直しと、複数の専門家による横断的な検討体制が重要です。早めの専門家相談を強くお勧めします。`,
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
      {/* スコア + 診断見出し */}
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
              width: 52,
              height: 52,
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
        </div>
      </div>

      {/* FP INSIGHT */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1.5px solid #0a0a0a18" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: c.text }}
          >
            FP INSIGHT
          </span>
          <span
            className="inline-block h-px flex-1"
            style={{ background: `${c.main}40` }}
          />
        </div>
        <p
          className="whitespace-pre-line text-[11px] leading-[1.7] text-[#0a0a0a]/80"
          style={{ fontFeatureSettings: "'palt'" }}
        >
          {health.fpComment}
        </p>
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
