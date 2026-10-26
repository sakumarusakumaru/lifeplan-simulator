"use client";

import type { ReactNode } from "react";

interface ListItemCardProps {
  kicker: string;
  onRemove?: () => void;
  children: ReactNode;
  tone?: "default" | "kid1" | "kid2" | "kid3" | "kid4";
}

const TONES = {
  default: { bg: "#ffffff", border: "#0a0a0a" },
  kid1: { bg: "#ffffff", border: "#0a0a0a" },
  kid2: { bg: "#ffffff", border: "#0a0a0a" },
  kid3: { bg: "#ffffff", border: "#0a0a0a" },
  kid4: { bg: "#ffffff", border: "#0a0a0a" },
};

export function ListItemCard({ kicker, onRemove, children, tone = "default" }: ListItemCardProps) {
  const t = TONES[tone];
  return (
    <div
      className="p-4"
      style={{
        background: t.bg,
        border: `2.5px solid ${t.border}`,
        borderRadius: 12,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">
          {kicker}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#0a0a0a]/45 transition-colors hover:text-[#c8383a]"
          >
            REMOVE ✕
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

interface AddButtonProps {
  label: string;
  onClick: () => void;
}

export function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-bold transition-colors duration-150 hover:bg-[#0a0a0a] hover:text-white"
      style={{
        background: "#f0f0ee",
        color: "#0a0a0a",
        border: "2.5px solid #0a0a0a",
        borderRadius: 12,
      }}
    >
      + {label}
    </button>
  );
}
