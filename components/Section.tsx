"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useUiStore } from "@/store/ui-store";

export type SectionStatus = "default" | "entered";

// v3 で左カラムのセクションヘッダーをスティッキー表示するためのcontext。
// 既定値は false で v2 等では従来通りの挙動を維持。
export const StickyHeaderContext = createContext<{ enabled: boolean; topPx: number }>({
  enabled: false,
  topPx: 56,
});

interface SectionProps {
  id: string;
  no: string;
  title: string;
  description?: string;
  status?: SectionStatus;
  children: ReactNode;
}

export function Section({
  id,
  no,
  title,
  description,
  status = "default",
  children,
}: SectionProps) {
  const open = useUiStore((s) => s.open[id] ?? false);
  const toggle = useUiStore((s) => s.toggle);
  const { enabled: stickyEnabled, topPx } = useContext(StickyHeaderContext);

  return (
    <section
      id={id}
      style={{
        background: "#f0f0ee",
        border: "2.5px solid #0a0a0a",
        borderRadius: 12,
        scrollMarginTop: 24,
      }}
    >
      <button
        type="button"
        onClick={() => toggle(id)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        style={
          stickyEnabled
            ? {
                position: "sticky",
                top: topPx,
                zIndex: 5,
                background: "#f0f0ee",
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                boxShadow: open ? "0 2px 0 0 #0a0a0a" : "none",
              }
            : undefined
        }
      >
        <span className="flex flex-1 items-start gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center text-[10px] font-bold tabular-nums tracking-tight"
            style={{
              background: open ? "#0a0a0a" : "#ffffff",
              color: open ? "#ffffff" : "#0a0a0a",
              border: "2.5px solid #0a0a0a",
              borderRadius: 12,
            }}
          >
            {no}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0a0a0a]">
                {title}
              </span>
              <StatusPill status={status} />
            </span>
            {description ? (
              <span className="truncate text-[10px] font-medium text-[#0a0a0a]/65">
                {description}
              </span>
            ) : null}
          </span>
        </span>
        <span
          aria-hidden
          className={`text-base font-bold text-[#0a0a0a] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="px-4 pb-4"
          style={{ borderTop: "2.5px solid #0a0a0a" }}
        >
          <div className="pt-4">{children}</div>
        </div>
      ) : null}
    </section>
  );
}

function StatusPill({ status }: { status: SectionStatus }) {
  if (status === "entered") {
    return (
      <span
        className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-white"
        style={{
          height: 20,
          padding: "0 8px",
          background: "#c8383a",
          border: "2.5px solid #0a0a0a",
          borderRadius: 12,
        }}
      >
        DONE
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{
        height: 20,
        padding: "0 8px",
        background: "#ffffff",
        color: "#66666a",
        border: "2.5px solid #66666a",
        borderRadius: 12,
      }}
    >
      TODO
    </span>
  );
}
