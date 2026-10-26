"use client";

import { Field } from "./Field";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: readonly Option<T>[];
  hint?: string;
  className?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: SelectFieldProps<T>) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select
        className="bg-white px-2 py-1.5 text-xs font-bold outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[#c8383a]"
        style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
