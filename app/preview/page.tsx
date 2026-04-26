import Link from "next/link";

const variants = [
  {
    href: "/preview/a",
    name: "A. pastel pop",
    blurb: "legacy路線をモダンに磨いた温かい配色。家族・友達に勧めやすい安心感。",
    bg: "bg-gradient-to-br from-rose-100 via-amber-50 to-emerald-100",
  },
  {
    href: "/preview/b",
    name: "B. editorial magazine",
    blurb: "大判タイポで数字を物語る雑誌風。黒＋赤の2色で個性を立てる。世界向け。",
    bg: "bg-zinc-50",
  },
  {
    href: "/preview/c",
    name: "C. fintech terminal",
    blurb: "ダーク背景＋ネオンアクセント。数字を真剣に見るための業務端末感。",
    bg: "bg-zinc-950",
  },
  {
    href: "/preview/d",
    name: "D. Black Border",
    blurb: "Colothelloで構築済みのデザインシステム。太い黒縁＋クリーム＋限定アクセント。",
    bg: "bg-[#f0f0ee]",
  },
];

export default function PreviewIndex() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        デザイン候補プレビュー
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        同じデフォルトプランを3種のスタイルで描いた比較用ページ。気に入った方向で本実装する。
      </p>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {variants.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className={`group flex h-44 flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${v.bg}`}
          >
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 group-hover:text-zinc-700">
              variant
            </div>
            <div>
              <div className={`text-lg font-semibold ${v.href.endsWith("c") ? "text-emerald-300" : "text-zinc-900"}`}>
                {v.name}
              </div>
              <div className={`mt-2 text-xs ${v.href.endsWith("c") ? "text-zinc-400" : "text-zinc-600"}`}>
                {v.blurb}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-10 text-xs text-zinc-400">
        現在の本番プレビューは <Link href="/" className="underline">/</Link> （実装ベース）
      </div>
    </main>
  );
}
