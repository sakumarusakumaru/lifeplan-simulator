"use client";

import { useState } from "react";

export const INK = "#0a0a0a";
export const RED = "#c8383a";
export const GREEN = "#22863a";

export const man = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(2)}億円`;
  return `${sign}${abs.toLocaleString()}万円`;
};

export function Card({ no, title, note, children }: { no: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `2.5px solid ${INK}` }}>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[11px] font-bold tracking-[0.14em]" style={{ color: RED }}>
          {no}
        </span>
        <h2 className="text-base font-bold text-[#0a0a0a]">{title}</h2>
      </div>
      {note ? <p className="-mt-1 mb-3 text-[11px] leading-relaxed text-[#0a0a0a]/60">{note}</p> : null}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

// 数字の欄。入力中は文字のまま持ち、離れたときに数字に直す（「0」を消して打ち直せるように）
export function NumField({
  label,
  value,
  onChange,
  unit,
  hint,
  min = 0,
  max = 100000,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  hint?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value ? String(value) : "");
  const commit = (s: string) => {
    const n = Number(s.replace(/[,，\s]/g, "").replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
    onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0);
  };
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-bold text-[#0a0a0a]">{label}</span>
      <span className="flex items-stretch overflow-hidden rounded-lg" style={{ border: `2px solid ${INK}` }}>
        <input
          type="text"
          inputMode="decimal"
          value={shown}
          placeholder={placeholder ?? "0"}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(null)}
          className="min-w-0 flex-1 bg-white px-3 py-2 text-right text-base font-bold tabular-nums outline-none"
        />
        <span className="flex items-center bg-[#f0f0ee] px-2.5 text-[12px] font-bold text-[#0a0a0a]/70">{unit}</span>
      </span>
      {hint ? <span className="text-[10px] leading-snug text-[#0a0a0a]/55">{hint}</span> : null}
    </label>
  );
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-bold text-[#0a0a0a]">{label}</span>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="rounded-lg px-1.5 py-2 text-[12px] font-bold leading-tight"
            style={{
              background: value === o.value ? INK : "#fff",
              color: value === o.value ? "#fff" : INK,
              border: `2px solid ${INK}`,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint ? <span className="text-[10px] leading-snug text-[#0a0a0a]/55">{hint}</span> : null}
    </div>
  );
}
