"use client";

import Link from "next/link";

export default function DetailPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <span
        className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-white"
        style={{
          height: 22,
          padding: "0 10px",
          background: "#66666a",
          border: "2px solid #0a0a0a",
          borderRadius: 8,
        }}
      >
        COMING SOON
      </span>
      <h1 className="mt-4 text-xl font-bold text-[#0a0a0a]">詳細入力</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#0a0a0a]/60">
        かんたん診断では推定した年金・税金・保険などを<br />
        より正確な数値で入力できるようになります。
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/v2/result"
          className="block py-3 text-center text-xs font-bold text-white"
          style={{
            background: "#0a0a0a",
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
          }}
        >
          診断結果に戻る
        </Link>
        <Link
          href="/"
          className="block py-3 text-center text-xs font-bold text-[#0a0a0a]"
          style={{
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
          }}
        >
          ver1 詳細入力を使う
        </Link>
      </div>
    </main>
  );
}
