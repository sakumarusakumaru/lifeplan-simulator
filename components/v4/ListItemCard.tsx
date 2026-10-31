"use client";

import { useState, type ReactNode } from "react";

import { INNER } from "@/components/v4/frame";
import { useVBase } from "@/components/v4/useVBase";

interface ListItemCardProps {
  kicker: string;
  onRemove?: () => void;
  children: ReactNode;
  tone?: "default" | "kid1" | "kid2" | "kid3" | "kid4";
  summary?: string; // ver5: 閉じているときに見出しの横に出す要点（「現職 年収600万円」など）
}

const TONES = {
  default: { bg: "#ffffff", border: "#0a0a0a" },
  kid1: { bg: "#ffffff", border: "#0a0a0a" },
  kid2: { bg: "#ffffff", border: "#0a0a0a" },
  kid3: { bg: "#ffffff", border: "#0a0a0a" },
  kid4: { bg: "#ffffff", border: "#0a0a0a" },
};

// ver5: カードの小見出しを日本語に（ver4 は英語のまま）
const KICKER_JP: [RegExp, string][] = [
  [/^JOB /, "勤務先 "],
  [/^SIDE /, "副業 "],
  [/^PROPERTY /, "物件 "],
  [/^LOAN /, "ローン "],
  [/^KID /, "子ども "],
  [/^INCOME /, "一時収入 "],
  [/^EXPENSE /, "一時支出 "],
  [/^CARE /, "介護 "],
  [/^POLICY /, "保険 "],
  [/ · OFF$/, "（計算に含めない）"],
];
const toJp = (k: string) => KICKER_JP.reduce((s, [re, to]) => s.replace(re, to), k).replace(/ 0(\d)/, " $1");

export function ListItemCard({ kicker, onRemove, children, tone = "default", summary }: ListItemCardProps) {
  const t = TONES[tone];
  const jp = useVBase() === "/v5";
  const [open, setOpen] = useState(true);
  const shown = !jp || open;
  const removeBtn = onRemove ? (
    <button
      type="button"
      onClick={() => {
        // ver5 は消す前に確かめる
        if (jp && !confirm(`「${toJp(kicker)}」を消しますか？`)) return;
        onRemove();
      }}
      className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0a0a0a]/45 transition-colors hover:text-[#cf7a4a]"
    >
      {jp ? "削除 ✕" : "REMOVE ✕"}
    </button>
  ) : null;
  return (
    <div
      className={jp ? "p-3" : "p-4"}
      // ver5: カードの中で繰り返す1件は「中箱」（線なし・薄い地色。枠のルール3）
      style={jp ? INNER : { background: t.bg, border: `2.5px solid ${t.border}`, borderRadius: 12 }}
    >
      {jp ? (
        // ver5: 1件ずつ開閉できる。閉じていても名前や金額の要点は見える
        <div className={`flex items-center gap-3 ${shown ? "mb-3" : ""}`}>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="shrink-0 text-[10px] font-bold tracking-[0.18em] text-[#0a0a0a]">{toJp(kicker)}</span>
            {summary && !open ? <span className="min-w-0 truncate text-[11px] text-[#0a0a0a]/65">{summary}</span> : null}
            <span className="ml-auto shrink-0 text-[11px] font-bold text-[#0a0a0a]/55">{open ? "閉じる ▾" : "開く ▸"}</span>
          </button>
          {removeBtn}
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">{kicker}</span>
          {removeBtn}
        </div>
      )}
      {shown ? children : null}
    </div>
  );
}

// 閉じた見出しの要点用（万円に丸める）
export const manYen = (yen: number) => `${Math.round(yen / 10000).toLocaleString()}万円`;

interface AddButtonProps {
  label: string;
  onClick: () => void;
}

export function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-bold transition-colors duration-150 hover:bg-[var(--lp-primary)] hover:text-white"
      style={{
        background: "#f0f0ee",
        color: "#0a0a0a",
        border: "1.5px solid #0a0a0a",
        borderRadius: 12,
      }}
    >
      + {label}
    </button>
  );
}
