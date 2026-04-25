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
  className?: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  min,
  max,
  className,
}: NumberFieldProps) {
  const [text, setText] = useState(() => fmt(value));

  useEffect(() => {
    setText(fmt(value));
  }, [value]);

  return (
    <Field label={label} hint={hint} className={className}>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="text"
          inputMode="numeric"
          className="w-full px-3 py-2 text-right tabular-nums outline-none"
          value={text}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\-0-9]/g, "");
            setText(raw === "" ? "" : Number(raw).toLocaleString());
          }}
          onBlur={() => {
            const raw = text.replace(/[^\-0-9]/g, "");
            let n = raw === "" || raw === "-" ? 0 : Number(raw);
            if (min !== undefined && n < min) n = min;
            if (max !== undefined && n > max) n = max;
            setText(fmt(n));
            onChange(n);
          }}
        />
        {unit ? (
          <span className="flex items-center bg-zinc-50 px-2 text-xs text-zinc-500">
            {unit}
          </span>
        ) : null}
      </div>
    </Field>
  );
}
