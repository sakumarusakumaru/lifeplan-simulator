"use client";

interface CheckboxFieldProps {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}

export function CheckboxField({ label, value, onChange, hint }: CheckboxFieldProps) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 px-3 py-2 text-xs font-bold transition-colors"
      style={{
        border: `2px solid ${value ? "#c8383a" : "#0a0a0a"}`,
        borderRadius: 8,
        background: "#f0f0ee",
        color: "#0a0a0a",
      }}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-3.5 w-3.5 accent-[#c8383a]"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex flex-col gap-0.5">
        <span>{label}</span>
        {hint ? <span className="text-[10px] font-medium opacity-60">{hint}</span> : null}
      </span>
    </label>
  );
}
