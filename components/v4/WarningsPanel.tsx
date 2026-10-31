"use client";

import { useState } from "react";

import type { SimulationWarning } from "@/lib/v4/calc/types";

// 制度上限の超過・退職所得控除の重複など、計算の前提を変えた点を知らせる。
// 場所を取らないよう折りたたみ式: ふだんは件数だけの1行で、押すと中身が開く（警告●があるときは最初から開く）
export function WarningsPanel({ warnings }: { warnings: SimulationWarning[] }) {
  const hasWarn = warnings.some((w) => w.level === "warn");
  const [open, setOpen] = useState(hasWarn);
  if (!warnings.length) return null;
  return (
    <div className="rounded-xl" style={{ background: "#fff8e7", border: "2px solid #d4a01760" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a07900]">
          制度チェック（{warnings.length}件）
          {!open && hasWarn ? <span className="ml-2 text-[#c8383a]">● 要確認あり</span> : null}
        </span>
        <span className="text-[11px] font-bold text-[#a07900]" aria-hidden>
          {open ? "閉じる ▾" : "開く ▸"}
        </span>
      </button>
      {open ? (
        <ul className="flex flex-col gap-1 px-4 pb-3">
          {warnings.map((w, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-[#0a0a0a]/80">
              <span style={{ color: w.level === "warn" ? "#c8383a" : "#a07900" }}>
                {w.level === "warn" ? "●" : "○"}
              </span>
              <span>{w.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
