"use client";

import { ENV_NONE, ENV_OPTIONS, envActive, type EnvInput } from "@/lib/v4/calc/environment";
import type { SimulationSummary } from "@/lib/v4/calc/types";

const INK = "#0a0a0a";
const RED = "#c8383a";
const GREEN = "#22863a";

const fmt = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  return abs >= 10000 ? `${sign}${(abs / 10000).toFixed(1)}億` : `${sign}${abs.toLocaleString()}万`;
};

// 外的環境の選択。選ぶと、上のグラフ・最終純資産・下の打ち手がすべてその環境で計算し直される
export function EnvironmentPanel({
  env,
  setEnv,
  normal,
  current,
}: {
  env: EnvInput;
  setEnv: (e: EnvInput) => void;
  normal: SimulationSummary;
  current: SimulationSummary;
}) {
  const on = envActive(env);
  const delta = current.finalNetWorth - normal.finalNetWorth;
  return (
    <div className="mb-6 rounded-xl bg-white p-4" style={{ border: `2.5px solid ${INK}` }}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/50">External environment</p>
          <p className="text-sm font-bold text-[#0a0a0a]">外的環境を選ぶ</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#0a0a0a]/60">
            自分では選べない世の中の変化を重ねると、上のグラフと下の打ち手がその環境で計算し直されます。
          </p>
        </div>
        {on ? (
          <button
            type="button"
            onClick={() => setEnv(ENV_NONE)}
            className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold"
            style={{ border: `2px solid ${INK}` }}
          >
            リセット
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {ENV_OPTIONS.map((opt) => (
          <div key={opt.key}>
            <p className="text-[12px] font-bold text-[#0a0a0a]">{opt.label}</p>
            <p className="mb-1 text-[10px] text-[#0a0a0a]/55">{opt.note}</p>
            <div className="flex flex-wrap gap-1">
              {opt.choices.map((c) => {
                const active = env[opt.key] === c.value;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setEnv({ ...env, [opt.key]: c.value })}
                    aria-pressed={active}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors"
                    style={{
                      background: active ? (c.value === 0 ? INK : RED) : "#fff",
                      color: active ? "#fff" : INK,
                      border: `2px solid ${active ? (c.value === 0 ? INK : RED) : `${INK}30`}`,
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {on ? (
        <div className="mt-3 rounded-lg px-3 py-2" style={{ background: delta < 0 ? "#fff1f1" : "#f0fff4" }}>
          <p className="text-[12px] font-bold" style={{ color: delta < 0 ? RED : GREEN }}>
            この環境だと、最終純資産は {fmt(delta)}（{fmt(normal.finalNetWorth)} → {fmt(current.finalNetWorth)}）
          </p>
          <p className="text-[11px] text-[#0a0a0a]/70">
            資金ショート:{" "}
            {normal.shortfallAge ? `${normal.shortfallAge}歳` : "なし"} →{" "}
            <b>{current.shortfallAge ? `${current.shortfallAge}歳` : "なし"}</b>
            。下の打ち手は、この環境での効果の大きい順です。
          </p>
        </div>
      ) : null}
    </div>
  );
}
