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
        className="w-full bg-white px-2 py-1.5 text-xs font-bold outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[#c8383a]"
        style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
