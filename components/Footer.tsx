"use client";

export function Footer() {
  return (
    <footer
      className="mt-12 px-4 py-6 sm:px-8"
      style={{
        background: "#0a0a0a08",
        borderTop: "1px solid #0a0a0a18",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/70">
          DISCLAIMER ／ ご利用にあたって
        </p>
        <p className="mb-2 text-[10px] leading-relaxed text-[#0a0a0a]/65">
          本サイトは情報提供のみを目的とした計算ツールです。投資・保険・税務・法務の助言を行うものではありません。
        </p>
        <ul className="list-inside list-disc space-y-0.5 text-[10px] leading-relaxed text-[#0a0a0a]/55">
          <li>
            入力データはお使いのブラウザ内にのみ保存され、運営者は一切取得しません
          </li>
          <li>計算結果は前提条件下の概算であり、将来を保証するものではありません</li>
          <li>
            個別の商品選択・税務判断は、登録のある専門家（FP・税理士等）にご相談ください
          </li>
          <li>
            本サイトの利用により発生したいかなる損害についても、運営者は責任を負いません
          </li>
        </ul>
        <p className="mt-3 text-[9px] text-[#0a0a0a]/40">
          © Lifeplan Simulator — 個人運営の情報提供ツール
        </p>
      </div>
    </footer>
  );
}
