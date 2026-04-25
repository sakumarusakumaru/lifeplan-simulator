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
      <div className="flex items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          step={step}
          className="w-full px-3 py-2 text-right tabular-nums outline-none"
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
        <span className="flex items-center bg-zinc-50 px-2 text-xs text-zinc-500">
          %
        </span>
      </div>
    </Field>
  );
}
