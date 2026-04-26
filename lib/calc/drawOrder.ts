import type { DrawAsset, DrawOrderMode } from "./types";

const DRAW_ASSETS: DrawAsset[] = ["f", "s", "dc", "k", "g"];

export const DRAW_LABEL: Record<DrawAsset | "c", string> = {
  f: "投信",
  s: "株",
  k: "仮想通貨",
  g: "金・コモディティ",
  dc: "確定拠出年金",
  c: "現金",
};

export function resolveDrawOrder(
  mode: DrawOrderMode,
  customOrder: DrawAsset[],
  age: number,
): DrawAsset[] {
  if (mode === "auto-tiered") {
    if (age < 60) return ["f", "s", "k", "g"];
    if (age < 65) return ["dc", "s", "f", "k", "g"];
    return ["f", "s", "dc", "k", "g"];
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

  if (mode === "fund-stock-crypto") return ["f", "s", "k", "g"];
  if (mode === "stock-fund-crypto") return ["s", "f", "k", "g"];

  return age < 60
    ? ["f", "s", "k", "g"]
    : age < 65
      ? ["dc", "s", "f", "k", "g"]
      : ["f", "s", "dc", "k", "g"];
}

export function orderToText(ord: DrawAsset[]): string {
  return ord.map((x) => DRAW_LABEL[x] ?? x).join(" → ");
}
