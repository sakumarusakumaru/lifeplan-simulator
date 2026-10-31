"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { LiteInputs } from "@/components/lite/LiteInputs";
import { LiteBar, LiteResult } from "@/components/lite/LiteResult";
import { sendToV4 } from "@/components/lite/sendToV4";
import { ConsentDialog } from "@/components/v4/ConsentDialog";
import { useLiteStore } from "@/store/lite/lite-store";

// Lite: 4枚のカード（と任意の2枚）を入れるだけで、右（スマホは下）に結果がすぐ出る
export default function LitePage() {
  const hydrated = useLiteStore((s) => s.hydrated);
  const reset = useLiteStore((s) => s.reset);
  const router = useRouter();
  // 詳細版へ。Liteに答えがあれば引き継ぐ（置き換えを断ったときは、引き継がずに開く）
  const openDetail = () => {
    const q = useLiteStore.getState().q;
    if (q.income > 0 && q.livingM > 0) sendToV4(q);
    router.push("/v5/detail");
  };

  return (
    <main className="min-h-screen px-4 pb-24 pt-6 sm:px-8 lg:pb-16" style={{ background: "#f0f0ee" }}>
      <ConsentDialog />
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#0a0a0a] pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0a0a0a]/50">LIFE PLAN SIMULATOR Lite</p>
            <h1 className="text-2xl font-bold leading-tight text-[#0a0a0a] sm:text-3xl">3分で、100歳までのお金をざっくり</h1>
            <p className="mt-1 text-[12px] leading-relaxed text-[#0a0a0a]/65">
              01〜04の4枚に答えるだけ（05・06は、わかれば）。わからない数字は、だいたいで大丈夫です。
            </p>
          </div>
          <div className="flex items-center gap-3 text-[12px] font-bold">
            <button
              type="button"
              onClick={() => {
                if (confirm("Liteの入力を消して、最初からにしますか？")) reset();
              }}
              className="underline text-[#0a0a0a]/60"
            >
              最初から
            </button>
            <button type="button" onClick={openDetail} className="underline">
              詳細版 →
            </button>
          </div>
        </header>

        {hydrated ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <LiteInputs />
            <div id="lite-result" className="scroll-mt-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
              <LiteResult />
            </div>
          </div>
        ) : null}
        {hydrated ? <LiteBar /> : null}

        <footer className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#0a0a0a]/50">
          <span>入力はこのブラウザの中だけに保存され、外部には送られません。計算は概算です。</span>
          <Link href="/terms" className="underline">
            利用規約
          </Link>
          <Link href="/privacy" className="underline">
            プライバシーポリシー
          </Link>
        </footer>
      </div>
    </main>
  );
}
