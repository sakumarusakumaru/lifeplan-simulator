import type { DrawAsset, DrawOrderMode } from "./types";

export const DRAW_ASSETS: DrawAsset[] = ["toku", "g", "k", "nisa"];

export const DRAW_LABEL: Record<DrawAsset | "c" | "dc", string> = {
  toku: "特定口座（課税）",
  nisa: "NISA口座",
  k: "暗号資産",
  g: "金・コモディティ",
  dc: "iDeCo・企業型DC",
  c: "現金",
};

// 取り崩し順序（現金が下限を割ったときに売る順番）
//
//  [おすすめ] simulate.ts の中で毎年決める: 特定口座・金・暗号資産のうち「1円売るのにかかる税金」
//             （利益の割合 × 税率）が小さいものから売り、NISA は最後まで残す
//  [自分で決める] ここで指定順に並べる（指定のないものは末尾）
//   - DC（iDeCo・企業型DC）は取り崩さず、受取開始年齢に一時金／年金で受け取る
export function resolveDrawOrder(mode: DrawOrderMode, customOrder: DrawAsset[]): DrawAsset[] {
  if (mode === "custom") {
    const seen = new Set<DrawAsset>();
    const ord: DrawAsset[] = [];
    for (const x of customOrder) {
      if (DRAW_ASSETS.includes(x) && !seen.has(x)) {
        ord.push(x);
        seen.add(x);
      }
    }
    for (const x of DRAW_ASSETS) if (!seen.has(x)) ord.push(x);
    return ord;
  }
  return ["toku", "g", "k", "nisa"];
}

export function orderToText(ord: DrawAsset[]): string {
  return ord.map((x) => DRAW_LABEL[x] ?? x).join(" → ");
}
