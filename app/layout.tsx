import type { Metadata } from "next";

// フォントは npm パッケージから自前で配信する（ビルド時に Google Fonts をダウンロードしないので、
// 取得失敗で Vercel のビルドが落ちることがない）。日本語は unicode-range で分割され、使う文字の分だけ読み込む
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-jp";

import "./globals.css";

export const metadata: Metadata = {
  title: "LifePlan Simulator",
  description: "人生のお金、ちゃんと描こう。あなたの今と、これからの暮らしを数字で見える化するシンプルなライフプランシミュレーター。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
