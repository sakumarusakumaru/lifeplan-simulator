"use client";

import { GuideFlow } from "@/components/v4/GuideFlow";

// 初回訪問者向けの使い方ガイド（単独ページ）。シミュレーター内からはモーダルで開く
export default function GuidePage() {
  return <GuideFlow mode="page" />;
}
