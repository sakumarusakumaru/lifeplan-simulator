"use client";

import { useEffect, useState } from "react";

import { Field } from "./Field";

interface PercentFieldProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  hint?: string;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}

export function PercentField({
  label,
  value,
  onChange,
  hint,
  step = 0.1,
  min,
  max,
  className,
}: PercentFieldProps) {
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <Field label={label} hint={hint} className={className}>
      <div
        className="flex overflow-hidden bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#c8383a]"
        style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
      >
        <input
          type="number"
          step={step}
          className="w-full px-2 py-1.5 text-right text-xs font-bold tabular-nums outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            let n = Number(text);
            if (!Number.isFinite(n)) n = 0;
            if (min !== undefined && n < min) n = min;
            if (max !== undefined && n > max) n = max;
            setText(String(n));
            onChange(n);
          }}
        />
        <span
          className="flex items-center px-2 text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ borderLeft: "2px solid #0a0a0a", background: "#f0f0ee", color: "#0a0a0a" }}
        >
          %
        </span>
      </div>
    </Field>
  );
}
