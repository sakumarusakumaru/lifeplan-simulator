"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ヘッダー右端の「メニュー」。保存・読込・PDF・旧バージョン・初期化をひとまとめにする
export function HeaderMenu({
  onExport,
  onImport,
  onPdf,
  onReset,
}: {
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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-[60] w-64 overflow-hidden rounded-xl bg-white py-1 shadow-lg"
          style={{ border: "2px solid #0a0a0a" }}
        >
          <p className="px-3 pt-1.5 pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/45">
            データ
          </p>
          <button type="button" role="menuitem" className={item} onClick={run(onExport)}>
            <span aria-hidden>↓</span>
            <span className="flex flex-col">
              <span className="font-bold">入力データを保存</span>
              <span className="text-[10px] text-[#0a0a0a]/55">JSONファイルでダウンロード（バックアップ・別の端末へ）</span>
            </span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(onImport)}>
            <span aria-hidden>↑</span>
            <span className="flex flex-col">
              <span className="font-bold">保存したデータを読み込む</span>
              <span className="text-[10px] text-[#0a0a0a]/55">ver3で保存したJSONも読めます</span>
            </span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(onPdf)}>
            <span aria-hidden>⎙</span>
            <span className="flex flex-col">
              <span className="font-bold">この画面をPDFで保存</span>
              <span className="text-[10px] text-[#0a0a0a]/55">印刷画面で「PDFに保存」を選択</span>
            </span>
          </button>

          <div className="my-1 h-px bg-[#0a0a0a15]" />
          <p className="px-3 pt-1 pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/45">
            その他
          </p>
          <Link href="/v3/detail" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <span aria-hidden>↺</span>
            <span className="flex flex-col">
              <span className="font-bold">旧バージョン（ver3）を開く</span>
              <span className="text-[10px] text-[#0a0a0a]/55">2026年10月以前の計算方法。入力データは別保存</span>
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
              <span className="font-bold">入力をすべて初期化</span>
              <span className="text-[10px] text-[#c8383a]/70">確認のあと初期値に戻ります（取り消し不可）</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
