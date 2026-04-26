"use client";

import { useState } from "react";

export function CollapsibleSubGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "2px solid #0a0a0a18",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors"
        style={{ background: open ? "#ffffff" : "#ececea" }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">
          {title}
        </span>
        <span
          className="text-xs font-bold text-[#0a0a0a]/40 transition-transform duration-150"
          style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          className="flex flex-col gap-2 px-3 pb-3 pt-2.5"
          style={{ borderTop: "1.5px solid #0a0a0a15", background: "#fafaf9" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
