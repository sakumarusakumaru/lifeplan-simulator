"use client";

import { useState } from "react";

import { HANDOFF_KEY } from "@/components/lite/sendToV4";

// Lite から詳細版に移った直後に、「どの欄に何を入れたか」を見せる（閉じるまで、このタブの中だけ）
function readLines(): string[] | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export function LiteHandoffNote() {
  const [lines, setLines] = useState<string[] | null>(readLines);
  if (!lines?.length) return null;
  const close = () => {
    try {
      sessionStorage.removeItem(HANDOFF_KEY);
    } catch {
      // 消せなくても閉じる
    }
    setLines(null);
  };
  return (
    <div className="rounded-xl px-4 py-3" style={{ border: "1.5px solid #0a0a0a", background: "#f7f7f5" }} role="status">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-bold">Lite版の答えを、詳細版のこれらの欄に入れました</p>
        <button type="button" onClick={close} className="shrink-0 text-[12px] font-bold text-[#0a0a0a]/60 underline">
          閉じる
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1 text-[11px] leading-relaxed text-[#0a0a0a]/80">
        {lines.map((l) => (
          <li key={l}>・{l}</li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-[#0a0a0a]/60">違うところは、それぞれの欄で直せます。直すたびに右（スマホは画面下）の試算が変わります。</p>
    </div>
  );
}
