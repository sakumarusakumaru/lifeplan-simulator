import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-zinc-400">{hint}</span> : null}
    </label>
  );
}
