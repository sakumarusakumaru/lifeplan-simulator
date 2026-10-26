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
//  [自動] 特定口座 → 金 → 暗号資産 → NISA
//   - NISA は売却益が非課税で、持ち続けるほど非課税の複利が効くため最後に回す
//   - 特定口座は売却益に20.315%。元本部分には税がかからないので、含み益が小さいうちに使う方が有利
//   - DC（iDeCo・企業型DC）は「取り崩す」ものではなく、受取開始年齢に一時金／年金で受け取る
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
