"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "lp_consent_v1";

export function ConsentDialog() {
  const [needsConsent, setNeedsConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) setNeedsConsent(true);
    } catch {
      // localStorage 不可の環境では同意ダイアログを出さない（プライベートブラウジング等）
    }
  }, []);

  if (!needsConsent) return null;

  const handleAgree = () => {
    if (!agreed) return;
    try {
      localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    } catch {
      // 失敗しても進めるようにする
    }
    setNeedsConsent(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6"
        style={{ border: "2.5px solid #0a0a0a", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}
      >
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8383a]">
          重要 ／ ご利用にあたって
        </p>
        <h2
          id="consent-title"
          className="mb-3 text-lg font-bold leading-snug text-[#0a0a0a]"
        >
          本ツールをご利用いただく前にご確認ください
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-[#0a0a0a]/75">
          本サイトは個人が運営する情報提供のための計算ツールです。
          ご利用前に、以下の点にご同意いただきます。
        </p>

        <ul className="mb-4 list-inside list-disc space-y-1.5 text-xs leading-relaxed text-[#0a0a0a]/80">
          <li>
            本サイトは
            <strong>情報提供のみ</strong>
            を目的としており、
            <strong>投資・保険・税務・法務の個別の助言を行うものではありません</strong>
          </li>
          <li>
            入力データは
            <strong>お使いのブラウザ内（localStorage）にのみ保存</strong>
            され、運営者のサーバーには
            <strong>一切送信されません</strong>
          </li>
          <li>
            計算結果は前提条件（インフレ率・運用利回り・耐用年数等）下の
            <strong>概算</strong>
            であり、将来を保証するものではありません
          </li>
          <li>
            個別の商品選択・税務判断・契約に関わる意思決定は、
            <strong>登録のある専門家（FP・税理士・弁護士等）</strong>
            にご相談ください
          </li>
          <li>
            本サイトの利用により発生したいかなる損害についても、運営者は責任を負いません
          </li>
        </ul>

        <label
          className="mb-4 flex cursor-pointer items-start gap-2.5 rounded-lg p-3"
          style={{ background: agreed ? "#f0fff4" : "#f0f0ee", border: `2px solid ${agreed ? "#22863a" : "#0a0a0a30"}` }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#22863a]"
          />
          <span className="text-xs font-bold leading-snug text-[#0a0a0a]">
            上記すべての内容を理解し、同意して利用します
          </span>
        </label>

        <button
          type="button"
          onClick={handleAgree}
          disabled={!agreed}
          className="w-full py-3 text-xs font-bold transition-all"
          style={{
            background: agreed ? "#0a0a0a" : "#9ca3af",
            color: "#ffffff",
            border: `2.5px solid ${agreed ? "#0a0a0a" : "#9ca3af"}`,
            borderRadius: 10,
            cursor: agreed ? "pointer" : "not-allowed",
            opacity: agreed ? 1 : 0.6,
          }}
        >
          同意して進む →
        </button>
      </div>
    </div>
  );
}
