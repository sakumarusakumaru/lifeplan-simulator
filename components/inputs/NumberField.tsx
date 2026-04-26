"use client";

import { useEffect, useState } from "react";

import { Field } from "./Field";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  unit?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  min,
  max,
  step,
  className,
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => (value === 0 ? "" : String(value)));

  // value が外部から変わったとき（フォーカス外）にテキストを同期
  useEffect(() => {
    if (!focused) {
      setText(value === 0 ? "" : String(value));
    }
  }, [value, focused]);

  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  };

  const displayValue = focused ? text : value === 0 ? "0" : value.toLocaleString("ja-JP");

  return (
    <Field label={label} hint={hint} className={className}>
      <div
        className="flex overflow-hidden bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#c8383a]"
        style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
      >
        <input
          type="text"
          inputMode="numeric"
          className="w-full px-2 py-1.5 text-right text-xs font-bold tabular-nums outline-none"
          value={displayValue}
          onFocus={(e) => {
            const raw = value === 0 ? "" : String(value);
            setText(raw);
            setFocused(true);
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9\-]/g, "");
            setText(raw);
            const n = Number(raw);
            if (raw !== "" && raw !== "-" && Number.isFinite(n)) {
              onChange(clamp(n));
            }
          }}
          onBlur={(e) => {
            setFocused(false);
            const n = Number(e.target.value.replace(/,/g, ""));
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          onKeyDown={(e) => {
            const effStep = step ?? (unit === "円" ? 10000 : 1);
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const newVal = clamp(value + effStep);
              onChange(newVal);
              setText(String(newVal));
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const newVal = clamp(value - effStep);
              onChange(newVal);
              setText(String(newVal));
            }
          }}
        />
        {unit ? (
          <span
            className="flex items-center px-2 text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{
              borderLeft: "2px solid #0a0a0a",
              background: "#f0f0ee",
              color: "#0a0a0a",
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
    </Field>
  );
}
