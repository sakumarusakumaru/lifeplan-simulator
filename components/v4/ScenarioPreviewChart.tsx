"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useVBase } from "@/components/v4/useVBase";
import type { SimulationSummary } from "@/lib/v4/calc/types";

const INK = "#0a0a0a";
const GREEN = "#4f86b8";
const RED = "#cf7a4a";

const axisFmt = (yen: number) =>
  Math.abs(yen) >= 100_000_000 ? `${(yen / 100_000_000).toFixed(1)}億` : `${Math.round(yen / 10000)}万`;
const fmtMan = (yen: number) => {
  const man = Math.round(yen / 10000);
  return Math.abs(man) >= 10000 ? `${(man / 10000).toFixed(2)}億円` : `${man.toLocaleString()}万円`;
};
const fmtDelta = (yen: number) => {
  const sign = yen >= 0 ? "+" : "-";
  const abs = Math.abs(Math.round(yen / 10000));
  return abs >= 10000 ? `${sign}${(abs / 10000).toFixed(1)}億` : `${sign}${abs.toLocaleString()}万`;
};

// 縦軸の範囲を、表示しうる全ての線（通常・環境・全打ち手）から先に決めて固定する。
// 長押しで線を切り替えても目盛りが変わらず、線だけが滑らかに動く。
function niceDomain(series: SimulationSummary[]): [number, number] {
  let lo = 0;
  let hi = 0;
  for (const s of series) for (const r of s.rows) {
    if (r.nw < lo) lo = r.nw;
    if (r.nw > hi) hi = r.nw;
  }
  const span = Math.max(hi - lo, 10_000_000);
  const step = Math.pow(10, Math.floor(Math.log10(span / 4)));
  const unit = [1, 2, 2.5, 5, 10].map((m) => m * step).find((u) => span / u <= 5) ?? step * 10;
  return [Math.floor(lo / unit) * unit, Math.ceil(hi / unit) * unit];
}

// 比較の上に固定するグラフ。
// 打ち手のカードを押している間（PCはマウスを乗せている間）だけ、線がその打ち手の結果に変わる。
// 線は常に1本を描き、データだけ差し替えるので「元の線から変化する」アニメーションになる。
export function ScenarioPreviewChart({
  normal,
  base,
  preview,
  previewTitle,
  previewKicker = null,
  kept = false,
  envOn = false,
  crashAges = [],
  domainSeries,
  onHoverChange,
}: {
  normal?: SimulationSummary;
  base: SimulationSummary;
  preview: SimulationSummary | null;
  previewTitle: string | null;
  previewKicker?: string | null; // 見出しの小さい文字（キープした打ち手を重ねているときなど）
  kept?: boolean;                 // キープした打ち手がある
  envOn?: boolean;
  crashAges?: number[];
  domainSeries?: SimulationSummary[];
  onHoverChange?: (over: boolean) => void; // グラフにマウスが乗っている間は、いま映している条件を保つため
}) {
  const jp = useVBase() === "/v5"; // ver5 は「金融純資産」「条件」の言葉で
  const ref = normal ?? base;
  const shown = preview ?? base;
  const delta = preview ? preview.finalNetWorth - base.finalNetWorth : 0;
  const color = !preview ? (envOn ? RED : INK) : delta >= 0 ? GREEN : RED;
  const domain = niceDomain(domainSeries ?? [ref, base, ...(preview ? [preview] : [])]);
  const dashedLabel = envOn ? "通常の環境" : "いまのプラン";
  const solidLabel = preview
    ? kept
      ? jp ? "条件を重ねた場合" : "打ち手を重ねた場合"
      : jp ? "条件を変えた場合" : "打ち手を試した場合"
    : envOn
      ? "選んだ外的環境"
      : "いまのプラン";
  const data = base.rows.map((r, i) => ({
    age: r.age,
    いま: Math.round(ref.rows[i]?.nw ?? r.nw),
    試算: Math.round(shown.rows[i]?.nw ?? r.nw),
  }));

  return (
    <div
      className="sticky z-20 -mx-4 mb-4 px-4 pt-2 pb-3 sm:-mx-8 sm:px-8"
      onPointerEnter={(e) => e.pointerType === "mouse" && onHoverChange?.(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onHoverChange?.(false)}
      style={{ top: "var(--lp-header-h, 56px)", background: "#f0f0ee", borderBottom: "2px solid #0a0a0a15" }}
    >
      <div className="mb-1 flex min-h-[34px] items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/50">
            {preview ? previewKicker ?? (jp ? "この条件で試算すると" : "この打ち手を試すと") : envOn ? `選んだ外的環境での${jp ? "金融純資産" : "純資産"}` : `いまのプランの${jp ? "金融純資産" : "純資産"}`}
          </p>
          <p className="truncate text-[12px] font-bold" style={{ color: preview ? color : INK }}>
            {preview ? previewTitle : "下のカードにマウスを乗せる（長押し）と変わり、クリックでキープします。グラフに乗せると、その年の金額が出ます"}
          </p>
        </div>
        {preview ? (
          <span className="shrink-0 text-lg font-bold tabular-nums" style={{ color }}>
            {fmtDelta(delta)}
          </span>
        ) : null}
      </div>
      <div className="h-[150px] w-full sm:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(10,10,10,0.08)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" tick={{ fill: INK, fontSize: 10 }} tickLine={false} minTickGap={16} />
            <YAxis
              tickFormatter={axisFmt}
              tick={{ fill: INK, fontSize: 10 }}
              width={52}
              tickLine={false}
              domain={domain}
              allowDataOverflow
            />
            <Tooltip
              cursor={{ stroke: "#0a0a0a40", strokeDasharray: "3 3" }}
              offset={40}
              wrapperStyle={{ pointerEvents: "none", zIndex: 30 }}
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as { いま: number; 試算: number };
                const diff = row.試算 - row.いま;
                return (
                  <div className="min-w-[150px] rounded-lg bg-white px-2.5 py-1.5 text-[10px] leading-relaxed shadow" style={{ border: "1.5px solid #0a0a0a30" }}>
                    <p className="mb-0.5 font-bold">{label}歳</p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-0 w-3 border-t-2 border-dashed" style={{ borderColor: "#a3b8cc" }} />
                        {dashedLabel}
                      </span>
                      <span className="font-bold tabular-nums">{fmtMan(row.いま)}</span>
                    </p>
                    {preview || envOn ? (
                      <>
                        <p className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-0.5 w-3" style={{ background: color }} />
                            {solidLabel}
                          </span>
                          <span className="font-bold tabular-nums" style={{ color }}>{fmtMan(row.試算)}</span>
                        </p>
                        <p className="mt-0.5 flex justify-between gap-3 border-t pt-0.5 text-[#0a0a0a]/60" style={{ borderColor: "#0a0a0a15" }}>
                          <span>差</span>
                          <span className="font-bold tabular-nums" style={{ color: diff >= 0 ? GREEN : RED }}>{fmtDelta(diff)}円</span>
                        </p>
                      </>
                    ) : null}
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke={INK} />
            {crashAges.map((a) => (
              <ReferenceLine key={a} x={a} stroke={RED} strokeOpacity={0.35} strokeDasharray="2 3" />
            ))}
            <Line type="monotone" dataKey="いま" stroke="#a3b8cc" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="試算"
              stroke={color}
              strokeWidth={3}
              dot={false}
              isAnimationActive
              animationDuration={450}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#0a0a0a]/60">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: "#a3b8cc" }} />
          {envOn ? "通常の環境" : "いまのプラン"}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4" style={{ background: color }} />
          {preview ? (kept ? (jp ? "条件を重ねた場合" : "打ち手を重ねた場合") : jp ? "条件を変えた場合" : "打ち手を試した場合") : envOn ? "選んだ外的環境" : "（押すとここが変わる）"}
        </span>
        {crashAges.length ? (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-0 border-l-2 border-dashed" style={{ borderColor: `${RED}80` }} />
            暴落の年
          </span>
        ) : null}
      </div>
    </div>
  );
}
