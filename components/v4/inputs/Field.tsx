import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={`group flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-colors group-focus-within:text-[#c8383a]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-[11px] font-medium text-[#0a0a0a]/55">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
