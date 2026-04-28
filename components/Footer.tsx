"use client";

export function Footer() {
  return (
    <footer
      className="px-4 py-3 sm:px-8"
      style={{
        borderTop: "2.5px solid #0a0a0a",
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/70">
          DISCLAIMER
        </span>
        <span className="text-[9px] text-[#0a0a0a]/55">
          情報提供のみを目的とした計算ツール。投資・保険・税務の助言ではありません。
        </span>
        <span className="text-[9px] text-[#0a0a0a]/40">
          入力データはブラウザ内のみに保存。計算結果は概算であり将来を保証しません。
        </span>
        <span className="ml-auto shrink-0 text-[9px] text-[#0a0a0a]/35">
          © Lifeplan Simulator
        </span>
      </div>
    </footer>
  );
}
