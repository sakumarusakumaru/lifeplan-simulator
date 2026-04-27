"use client";

import { useEffect, useState } from "react";

import { Field } from "./Field";

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  unit?: string;
  className?: string;
}

export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.1,
  hint,
  unit = "%",
  className,
}: SliderFieldProps) {
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clamp = (n: number) => {
    let v = n;
    if (v < min) v = min;
    if (v > max) v = max;
    return v;
  };

  return (
    <Field label={label} hint={hint} className={className}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="flex-1 accent-[#c8383a]"
          style={{ height: 32 }}
        />
        <div
          className="flex shrink-0 items-stretch overflow-hidden bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#c8383a]"
          style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
        >
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(clamp(n));
            }}
            onBlur={() => setText(String(value))}
            className="w-12 px-1.5 py-1.5 text-right text-xs font-bold tabular-nums outline-none"
          />
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
        </div>
      </div>
    </Field>
  );
}
