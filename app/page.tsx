"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CONSENT_KEY = "lp_consent_v1";

export default function LandingPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        setHasPrev(true);
        setAgreed(true);
      }
    } catch {
      // localStorage 不可の環境（プライベートブラウジング等）はそのまま
    }
  }, []);

  const handleEnter = () => {
    if (!agreed) return;
    try {
      localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    } catch {
      // 失敗しても遷移する
    }
    router.push("/v3/detail");
  };

  return (
    <main
      className="min-h-screen px-4 py-10 sm:px-8 sm:py-14"
      style={{ background: "#f0f0ee" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* タイトル */}
        <div className="mb-8 border-b-2 border-[#0a0a0a] pb-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0a0a0a]/50">
            LIFE PLAN SIMULATOR v3
          </p>
          <h1 className="text-3xl font-bold leading-tight text-[#0a0a0a]">
            人生のお金を、
            <br />
            自分で試算してみるツール
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#0a0a0a]/65">
            年齢・収入・支出・資産・住居・教育・年金などを入力すると、
            毎年の純資産推移と資金ショート時期を試算します。
          </p>
        </div>

        {/* 重要な注意事項 */}
        <div
          className="mb-6 overflow-hidden rounded-xl"
          style={{ background: "#fff8e7", border: "2.5px solid #c8383a" }}
        >
          <div
            className="px-4 py-2.5"
            style={{ background: "#c8383a" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              ⚠ 重要 ／ ご利用前に必ずお読みください
            </p>
          </div>
          <div className="px-5 py-4">
            <ul className="flex flex-col gap-2.5 text-[13px] leading-relaxed text-[#0a0a0a]/85">
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-[#c8383a]">1.</span>
                <span>
                  本サイトは
                  <span className="font-bold">個人が運営する情報提供のための計算ツール</span>
                  です。
                  <span className="font-bold">投資・保険・税務・法務に関する助言は一切行いません。</span>
                  運営者は資格を有するファイナンシャルプランナー・税理士等ではありません。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-[#c8383a]">2.</span>
                <span>
                  入力されたデータは
                  <span className="font-bold">お使いのブラウザ内（localStorage）にのみ保存</span>
                  され、
                  <span className="font-bold">運営者のサーバーには一切送信されません</span>
                  。第三者への提供・販売も一切ありません。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-[#c8383a]">3.</span>
                <span>
                  計算結果は前提条件（インフレ率・運用利回り・税率・耐用年数等）下の
                  <span className="font-bold">概算</span>
                  です。実際の年金額・税額・運用成果は経済情勢や制度改正により変動し、
                  <span className="font-bold">将来を保証するものではありません</span>。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-[#c8383a]">4.</span>
                <span>
                  個別の商品選択・税務判断・契約に関わる意思決定は、必ず
                  <span className="font-bold">登録のある専門家（FP・税理士・社労士・弁護士等）</span>
                  にご相談ください。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-bold text-[#c8383a]">5.</span>
                <span>
                  本サイトの利用により発生したいかなる損害（投資判断・税務判断・契約等を含む）についても、
                  <span className="font-bold">運営者は一切の責任を負いません</span>。
                </span>
              </li>
            </ul>

            <div
              className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-[11px]"
              style={{ borderColor: "#0a0a0a20" }}
            >
              <Link
                href="/terms"
                className="font-bold text-[#0a0a0a] underline hover:text-[#c8383a]"
              >
                → 利用規約を読む
              </Link>
              <Link
                href="/privacy"
                className="font-bold text-[#0a0a0a] underline hover:text-[#c8383a]"
              >
                → プライバシーポリシーを読む
              </Link>
            </div>
          </div>
        </div>

        {/* 同意チェック + 入場ボタン */}
        <label
          className="flex cursor-pointer items-start gap-3 rounded-xl p-4"
          style={{
            background: agreed ? "#f0fff4" : "#ffffff",
            border: `2.5px solid ${agreed ? "#22863a" : "#0a0a0a"}`,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#22863a]"
          />
          <span className="flex-1 text-sm font-bold leading-snug text-[#0a0a0a]">
            上記すべての内容を理解し、同意して利用します
            {hasPrev && (
              <span className="ml-2 text-[10px] font-medium text-[#0a0a0a]/50">
                （前回の同意が記録されています）
              </span>
            )}
          </span>
        </label>

        <button
          type="button"
          onClick={handleEnter}
          disabled={!agreed}
          className="mt-4 w-full py-4 text-sm font-bold uppercase tracking-[0.16em] transition-all"
          style={{
            background: agreed ? "#0a0a0a" : "#d4d4d2",
            color: agreed ? "#ffffff" : "#0a0a0a55",
            border: `2.5px solid ${agreed ? "#0a0a0a" : "#0a0a0a30"}`,
            borderRadius: 12,
            cursor: agreed ? "pointer" : "not-allowed",
          }}
        >
          同意してシミュレーターを開始 →
        </button>

        <p className="mt-6 text-[11px] leading-relaxed text-[#0a0a0a]/45">
          運営者：個人（さくまる）／ 連絡先：本サイトはお問い合わせ窓口を設けておりません。
          サイトの利用は完全に自己責任でお願いします。
        </p>
      </div>
    </main>
  );
}
