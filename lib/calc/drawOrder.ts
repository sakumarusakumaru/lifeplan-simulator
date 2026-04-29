import type { DrawAsset, DrawOrderMode } from "./types";

const DRAW_ASSETS: DrawAsset[] = ["f", "s", "fNisa", "sNisa", "dc", "k", "g"];

export const DRAW_LABEL: Record<DrawAsset | "c", string> = {
  f: "投信(課税)",
  s: "株(課税)",
  fNisa: "投信(NISA)",
  sNisa: "株(NISA)",
  k: "仮想通貨",
  g: "金・コモディティ",
  dc: "確定拠出年金",
  c: "現金",
};

// FP視点の取崩順序の基本方針：
//  1. 課税口座（特定口座等）の投信・株を先に取り崩す → 譲渡益課税の発生を抑え、
//     NISA非課税枠を最後まで温存することで複利効果を最大化
//  2. 60歳以降は DC を組み合わせる（退職所得控除・公的年金等控除を活用）
//  3. NISA は最後に取り崩す
//  4. 仮想通貨・金は最後（ボラティリティ高く分散効果として温存）
export function resolveDrawOrder(
  mode: DrawOrderMode,
  customOrder: DrawAsset[],
  age: number,
): DrawAsset[] {
  if (mode === "auto-tiered") {
    if (age < 60) return ["f", "s", "fNisa", "sNisa", "k", "g"];
    if (age < 65) return ["dc", "s", "f", "sNisa", "fNisa", "k", "g"];
    return ["f", "s", "dc", "fNisa", "sNisa", "k", "g"];
  }

  if (mode === "custom") {
    const seen = new Set<DrawAsset>();
    const ord: DrawAsset[] = [];
    for (const x of customOrder) {
      if (DRAW_ASSETS.includes(x) && !seen.has(x)) {
        ord.push(x);
        seen.add(x);
      }
    }
    for (const x of DRAW_ASSETS) {
      if (!seen.has(x)) ord.push(x);
    }
    if (age < 60) return ord.filter((x) => x !== "dc");
    return ord;
  }

  if (mode === "fund-stock-crypto") {
    return age < 60
      ? ["f", "s", "fNisa", "sNisa", "k", "g"]
      : ["f", "s", "dc", "fNisa", "sNisa", "k", "g"];
  }
  if (mode === "stock-fund-crypto") {
    return age < 60
      ? ["s", "f", "sNisa", "fNisa", "k", "g"]
      : ["s", "f", "dc", "sNisa", "fNisa", "k", "g"];
  }

  return age < 60
    ? ["f", "s", "fNisa", "sNisa", "k", "g"]
    : age < 65
      ? ["dc", "s", "f", "sNisa", "fNisa", "k", "g"]
      : ["f", "s", "dc", "fNisa", "sNisa", "k", "g"];
}

export function orderToText(ord: DrawAsset[]): string {
  return ord.map((x) => DRAW_LABEL[x] ?? x).join(" → ");
}
