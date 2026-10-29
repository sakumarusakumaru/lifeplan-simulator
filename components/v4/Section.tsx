"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useVBase } from "@/components/v4/useVBase";
import { useUiStore } from "@/store/v4/ui-store";

export type SectionStatus = "default" | "entered";

// v3 で左カラムのセクションヘッダーをスティッキー表示するためのcontext。
// 既定値は false で v2 等では従来通りの挙動を維持。
export const StickyHeaderContext = createContext<{ enabled: boolean; topPx: number }>({
  enabled: false,
  topPx: 56,
});

// 入力ステップ（はじめての人向け）。各ブロックの最後に「OK・次へ」を出し、順番に進めてもらう
export const SECTION_ORDER = ["ch-settings", "ch-income", "ch-assets", "ch-expense"] as const;

export const StepFlowContext = createContext<{
  enabled: boolean;
  onDone: (id: string) => void;     // 「OK・次へ」を押したとき
  canProceed: (id: string) => string | null; // 進めない理由（null なら進める）
  note: (id: string) => string | null;       // 進めるが、念のため確認してほしいこと
}>({ enabled: false, onDone: () => {}, canProceed: () => null, note: () => null });

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
  const flow = useContext(StepFlowContext);
  const confirmed = useUiStore((s) => !!s.confirmed[id]);
  const unlocked = useUiStore((s) => s.unlocked);
  // ステップ入力中は「OK」したかどうかで DONE/TODO を出す
  const pill: SectionStatus = confirmed ? "entered" : unlocked ? status : "default";
  // ver5: 状態を日本語で（完了／入力中／未入力）
  const jp = useVBase() === "/v5";
  const idx = SECTION_ORDER.indexOf(id as (typeof SECTION_ORDER)[number]);
  const isLast = idx === SECTION_ORDER.length - 1;
  const blocked = flow.enabled ? flow.canProceed(id) : null;
  const note = flow.enabled ? flow.note(id) : null;

  return (
    <section
      id={id}
      // sticky 有効時: section をボックスとして残しつつ背景を設定。
      // ボタンは section 内で sticky → sticky 範囲が section の高さに限定され、
      // 次のセクションボタンが来ると前のボタンが押し出される自然な cascading sticky が成立。
      // display:contents を使わないことで section の背景が全幅をカバーし、
      // ボタン丸角の隙間からコンテンツが透けるのを防ぐ。
      style={
        stickyEnabled
          ? {
              background: "#f0f0ee",
              scrollMarginTop: 24,
            }
          : {
              background: "#f0f0ee",
              border: "2.5px solid #0a0a0a",
              borderRadius: 12,
              scrollMarginTop: 24,
            }
      }
    >
      <button
        type="button"
        onClick={() => toggle(id)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        style={
          stickyEnabled
            ? {
                position: "sticky",
                // ヘッダーの高さ（layout が --lp-header-h に入れる）に追従。未設定なら topPx
                top: `var(--lp-header-h, ${topPx}px)`,
                zIndex: 10,
                background: "#f0f0ee",
                borderTop: "2.5px solid #0a0a0a",
                borderLeft: "2.5px solid #0a0a0a",
                borderRight: "2.5px solid #0a0a0a",
                borderBottom: "2.5px solid #0a0a0a",
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                borderBottomLeftRadius: open ? 0 : 12,
                borderBottomRightRadius: open ? 0 : 12,
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
              <StatusPill status={pill} jp={jp} active={open && flow.enabled} />
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
          style={
            stickyEnabled
              ? {
                  background: "#f0f0ee",
                  borderLeft: "2.5px solid #0a0a0a",
                  borderRight: "2.5px solid #0a0a0a",
                  borderBottom: "2.5px solid #0a0a0a",
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                }
              : { borderTop: "2.5px solid #0a0a0a" }
          }
        >
          <div className="pt-4">{children}</div>
          {flow.enabled && idx >= 0 ? (
            <div className="mt-4 flex flex-col items-stretch gap-1.5 border-t pt-4" style={{ borderColor: "#0a0a0a20" }}>
              {blocked ? (
                <p className="text-[11px] font-bold text-[#c8383a]">{blocked}</p>
              ) : note ? (
                <p className="text-[11px] font-bold text-[#a07900]">{note}</p>
              ) : (
                <p className="text-[10px] text-[#0a0a0a]/55">
                  わからない項目は空欄・初期値のままで大丈夫です。あとからいつでも直せます。
                </p>
              )}
              <button
                type="button"
                disabled={!!blocked}
                onClick={() => flow.onDone(id)}
                className="w-full py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                style={{ background: isLast ? "#c8383a" : "#0a0a0a", border: "2.5px solid #0a0a0a", borderRadius: 12 }}
              >
                {isLast ? "入力完了・結果を表示する →" : `この内容でOK・次へ（${String(idx + 2).padStart(2, "0")}）→`}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function StatusPill({ status, jp = false, active = false }: { status: SectionStatus; jp?: boolean; active?: boolean }) {
  if (jp && status !== "entered") {
    return (
      <span
        className="inline-flex items-center text-[10px] font-bold"
        style={{
          height: 20,
          padding: "0 8px",
          background: active ? "#0a0a0a" : "#ffffff",
          color: active ? "#ffffff" : "#55555a",
          border: `2px solid ${active ? "#0a0a0a" : "#8a8a8e"}`,
          borderRadius: 12,
        }}
      >
        {active ? "入力中" : "未入力"}
      </span>
    );
  }
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
        {jp ? "完了" : "DONE"}
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
