"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="px-4 py-4 sm:px-8"
      style={{
        borderTop: "2.5px solid #0a0a0a",
        background: "#f0f0ee",
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2">
        {/* 重要な免責 */}
        <div
          className="flex flex-col gap-1.5 rounded-lg px-3 py-2.5"
          style={{ background: "#fff8e7", border: "1.5px solid #c8383a40" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8383a]">
            ⚠ 免責事項 ／ DISCLAIMER
          </p>
          <p className="text-[10px] leading-relaxed text-[#0a0a0a]/75">
            本サイトは個人運営の情報提供ツールです。運営者はFP・税理士・社労士・弁護士等の有資格者ではなく、
            <span className="font-bold">投資・保険・税務・法務に関する個別の助言は一切行いません</span>。
            計算結果は前提条件下の概算であり将来を保証しません。個別の意思決定は
            <span className="font-bold">登録のある専門家にご相談ください</span>。
            本サイトの利用により発生した損害について、運営者は一切の責任を負いません。
          </p>
        </div>

        {/* リンク行 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
          <Link
            href="/terms"
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/65 hover:text-[#c8383a]"
          >
            利用規約
          </Link>
          <span className="text-[#0a0a0a]/25">·</span>
          <Link
            href="/privacy"
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/65 hover:text-[#c8383a]"
          >
            プライバシーポリシー
          </Link>
          <span className="text-[#0a0a0a]/25">·</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/45">
            個人運営 / 個人データ送信なし
          </span>
          <span className="ml-auto text-[10px] text-[#0a0a0a]/35">
            © LIFE PLAN SIMULATOR
          </span>
        </div>
      </div>
    </footer>
  );
}
