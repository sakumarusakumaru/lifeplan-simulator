"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ヘッダー右端の「メニュー」。保存・読込・PDF・旧バージョン・初期化をひとまとめにする
function Seg({
  label,
  hint,
  value,
  options,
  onChange,
  activeColor,
}: {
  label: string;
  hint: string;
  value: boolean;
  options: [string, string];
  onChange: (v: boolean) => void;
  activeColor: string;
}) {
  return (
    <div className="px-3 py-1.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-bold">{label}</span>
      </div>
      <div
        className="grid grid-cols-2 overflow-hidden text-[11px] font-bold"
        style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
      >
        {[false, true].map((v, i) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className="px-2 py-1.5 transition-colors"
            style={{
              background: value === v ? activeColor : "#ffffff",
              color: value === v ? "#ffffff" : "#0a0a0a",
            }}
          >
            {options[i]}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[10px] leading-snug text-[#0a0a0a]/55">{hint}</p>
    </div>
  );
}

export function HeaderMenu({
  realValue,
  setRealValue,
  mcOn,
  setMcOn,
  onSample,
  onExport,
  onImport,
  onPdf,
  onReset,
}: {
  realValue: boolean;
  setRealValue: (v: boolean) => void;
  mcOn: boolean;
  setMcOn: (v: boolean) => void;
  onSample: () => void;
  onExport: () => void;
  onImport: () => void;
  onPdf: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const item =
    "flex w-full items-start gap-2.5 px-3 py-2 text-left text-[12px] transition-colors hover:bg-[#f0f0ee]";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold transition-colors"
        style={{
          background: open ? "#0a0a0a" : "#ffffff",
          color: open ? "#ffffff" : "#0a0a0a",
          border: "2px solid #0a0a0a",
          borderRadius: 8,
        }}
      >
        <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
          <rect y="0" width="12" height="1.8" rx="0.9" fill="currentColor" />
          <rect y="4.1" width="12" height="1.8" rx="0.9" fill="currentColor" />
          <rect y="8.2" width="12" height="1.8" rx="0.9" fill="currentColor" />
        </svg>
        メニュー
        {realValue || mcOn ? (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#1a6fa8" }}
            aria-label="表示設定を変更中"
            title={
              [mcOn ? "振れ幅" : null, realValue ? "今の価値" : null]
                .filter(Boolean)
                .join("・") + " で表示中"
            }
          />
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-[60] max-h-[calc(100vh-80px)] w-72 overflow-y-auto rounded-xl bg-white py-1 shadow-lg"
          style={{ border: "2px solid #0a0a0a" }}
        >
          <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/45">
            表示設定
          </p>
          <Seg
            label="運用利回り"
            hint={
              mcOn
                ? "値動きを1,000通り試算。結果出力に「運用の振れ幅」の章が出ます"
                : "毎年一定の利回りで計算します"
            }
            value={mcOn}
            options={["固定", "振れ幅"]}
            onChange={setMcOn}
            activeColor="#1a6fa8"
          />
          <Seg
            label="金額の表示"
            hint={
              realValue
                ? "将来の金額を物価で割り戻し、今の価値で表示します"
                : "将来の金額はその年の金額（名目）で表示します"
            }
            value={realValue}
            options={["名目", "今の価値"]}
            onChange={setRealValue}
            activeColor="#0a0a0a"
          />

          <div className="my-1 h-px bg-[#0a0a0a15]" />
          <p className="px-3 pt-1 pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/45">
            データ
          </p>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={run(onExport)}
          >
            <span aria-hidden>↓</span>
            <span className="flex flex-col">
              <span className="font-bold">入力データを保存</span>
              <span className="text-[10px] text-[#0a0a0a]/55">
                JSONファイルでダウンロード（バックアップ・別の端末へ）
              </span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={run(onImport)}
          >
            <span aria-hidden>↑</span>
            <span className="flex flex-col">
              <span className="font-bold">保存したデータを読み込む</span>
              <span className="text-[10px] text-[#0a0a0a]/55">
                ver3で保存したJSONも読めます
              </span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={run(onPdf)}
          >
            <span aria-hidden>⎙</span>
            <span className="flex flex-col">
              <span className="font-bold">この画面をPDFで保存</span>
              <span className="text-[10px] text-[#0a0a0a]/55">
                印刷画面で「PDFに保存」を選択
              </span>
            </span>
          </button>

          <div className="my-1 h-px bg-[#0a0a0a15]" />
          <p className="px-3 pt-1 pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/45">
            その他
          </p>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={run(onSample)}
          >
            <span aria-hidden>☺</span>
            <span className="flex flex-col">
              <span className="font-bold">サンプルを読み込む</span>
              <span className="text-[10px] text-[#0a0a0a]/55">
                35歳・会社員・持ち家の例で試す（今の入力は上書き）
              </span>
            </span>
          </button>
          <Link
            href="/v3/detail"
            role="menuitem"
            className={item}
            onClick={() => setOpen(false)}
          >
            <span aria-hidden>↺</span>
            <span className="flex flex-col">
              <span className="font-bold">旧バージョン（ver3）を開く</span>
              <span className="text-[10px] text-[#0a0a0a]/55">
                2026年10月以前の計算方法。入力データは別保存
              </span>
            </span>
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-[#c8383a] hover:bg-[#fff1f1]`}
            onClick={run(onReset)}
          >
            <span aria-hidden>⟲</span>
            <span className="flex flex-col">
              <span className="font-bold">入力をすべて消す</span>
              <span className="text-[10px] text-[#c8383a]/70">
                確認のあと、はじめの状態に戻ります（取り消し不可）
              </span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
