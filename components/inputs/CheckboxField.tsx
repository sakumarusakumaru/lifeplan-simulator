"use client";

interface CheckboxFieldProps {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}

export function CheckboxField({ label, value, onChange, hint }: CheckboxFieldProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:border-zinc-300">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-blue-600"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-zinc-800">{label}</span>
        {hint ? <span className="text-[11px] text-zinc-400">{hint}</span> : null}
      </span>
    </label>
  );
}
