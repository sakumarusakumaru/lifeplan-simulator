"use client";

import type { SimulationWarning } from "@/lib/v4/calc/types";

// 制度上限の超過・退職所得控除の重複など、計算の前提を変えた点を知らせる
export function WarningsPanel({ warnings }: { warnings: SimulationWarning[] }) {
  if (!warnings.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: "#fff8e7", border: "2px solid #d4a01760" }}
    >
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a07900]">
        制度チェック（{warnings.length}件）
      </p>
      <ul className="flex flex-col gap-1">
        {warnings.map((w, i) => (
          <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-[#0a0a0a]/80">
            <span style={{ color: w.level === "warn" ? "#c8383a" : "#a07900" }}>
              {w.level === "warn" ? "●" : "○"}
            </span>
            <span>{w.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
