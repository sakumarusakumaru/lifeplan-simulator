import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ライフプランシミュレーター Lite — 3分で、老後までのお金をざっくり",
  description: "年齢・年収・生活費・住まい・貯蓄だけで、100歳までのお金の流れを試算。もっと詳しくは「ライフプランシミュレーター 詳細版」へそのまま引き継げます。",
};

export default function LiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
