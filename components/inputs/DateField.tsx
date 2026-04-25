"use client";

import { Field } from "./Field";

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  className?: string;
}

export function DateField({ label, value, onChange, hint, className }: DateFieldProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input
        type="date"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
