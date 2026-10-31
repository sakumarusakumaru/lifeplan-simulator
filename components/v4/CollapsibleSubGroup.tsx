"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { CARD, LINE_SOFT } from "@/components/v4/frame";
import { TabModeContext } from "@/components/v4/Section";

// カードの中に入れた組（基本設定の「詳細設定」の中など）。カードの中にカードを作らず、見出しと区切り線だけにする
export const NestedGroupContext = createContext(false);

export function CollapsibleSubGroup({
  title,
  children,
  defaultOpen = true,
  headerExtra,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  headerExtra?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tabMode = useContext(TabModeContext);
  const nested = useContext(NestedGroupContext);

  // ver5: 組はどれも同じ「カード」（枠のルール2）。はじめから開いている組は開閉なし、
  // 「あれば入れる」組は同じカードの見出しの右に「開く／閉じる」
  if (tabMode && nested) {
    return (
      <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: LINE_SOFT }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-[#0a0a0a]">{title}</span>
          {headerExtra ? <div className="flex shrink-0 items-center">{headerExtra}</div> : null}
        </div>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    );
  }
  if (tabMode) {
    const shown = open;
    return (
      <div style={CARD}>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          {/* はじめから開いている組も、見出しを押せば閉じられる（開いた状態が既定） */}
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex flex-1 items-center justify-between gap-2 text-left">
            <span className="text-[13px] font-bold text-[#0a0a0a]">{title}</span>
            <span className="text-[11px] font-bold text-[#0a0a0a]/55">{open ? "閉じる ▾" : "開く ▸"}</span>
          </button>
          {headerExtra ? <div className="flex shrink-0 items-center">{headerExtra}</div> : null}
        </div>
        {shown ? (
          <NestedGroupContext.Provider value={true}>
            <div className="flex flex-col gap-2 px-4 pb-4">{children}</div>
          </NestedGroupContext.Provider>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        border: "2px solid #0a0a0a18",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-stretch"
        style={{ background: open ? "#ffffff" : "#ececea" }}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center justify-between px-3 py-2.5 text-left transition-colors"
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
        {headerExtra ? (
          <div className="flex shrink-0 items-center px-2">{headerExtra}</div>
        ) : null}
      </div>
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
