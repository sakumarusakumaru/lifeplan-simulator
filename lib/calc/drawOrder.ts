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
//
//  [原則] NISA は「常に最後」に取り崩す
//    → NISA の非課税複利を最大限温存するため、他の資産をすべて使い切ってから。
//
//  [順序]
//   1. 課税口座の安定資産（投信・株）を先に取り崩す
//      → 含み益への譲渡益課税（20.315%）が発生するが、元本部分は無税。
//        NISA より税コストが高いため先に使う。
//   2. ハイボラ資産（仮想通貨・金）を課税安定資産の次に取り崩す
//      → 暗号資産は雑所得として最大55%課税（NISA より不利）。
//        金は分離課税・総合課税の選択適用。どちらも NISA より税コストが高い。
//   3. DC（確定拠出年金）は60歳以降のみ取り崩し可能
//      → 退職所得控除（一時金）または公的年金等控除（年金受給）が使える。
//        受給開始年齢・税控除の最適化のため、ハイボラ資産の後に配置。
//   4. NISA（投信・株）を最後に取り崩す
//      → 非課税口座なので税コストが最小。最後まで複利成長させることが合理的。
//
//  [年齢別変化]
//   < 60歳 : 課税投信→課税株→仮想通貨→金→NISA投信→NISA株  ※DC取崩不可
//   ≥ 60歳 : 課税投信→課税株→仮想通貨→金→DC→NISA投信→NISA株
export function resolveDrawOrder(
  mode: DrawOrderMode,
  customOrder: DrawAsset[],
  age: number,
): DrawAsset[] {
  const under60 = age < 60;

  if (mode === "auto-tiered") {
    return under60
      ? ["f", "s", "k", "g", "fNisa", "sNisa"]
      : ["f", "s", "k", "g", "dc", "fNisa", "sNisa"];
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
    // カスタムに含まれていないアセットを末尾に追加（抜け漏れ防止）
    for (const x of DRAW_ASSETS) {
      if (!seen.has(x)) ord.push(x);
    }
    // DC は 60歳未満は取崩不可
    return under60 ? ord.filter((x) => x !== "dc") : ord;
  }

  // 投信→株→仮想通貨 プリセット（課税先・NISA後）
  if (mode === "fund-stock-crypto") {
    return under60
      ? ["f", "s", "k", "g", "fNisa", "sNisa"]
      : ["f", "s", "k", "g", "dc", "fNisa", "sNisa"];
  }

  // 株→投信→仮想通貨 プリセット（課税先・NISA後）
  if (mode === "stock-fund-crypto") {
    return under60
      ? ["s", "f", "k", "g", "sNisa", "fNisa"]
      : ["s", "f", "k", "g", "dc", "sNisa", "fNisa"];
  }

  // フォールバック（auto-tiered と同一）
  return under60
    ? ["f", "s", "k", "g", "fNisa", "sNisa"]
    : ["f", "s", "k", "g", "dc", "fNisa", "sNisa"];
}

export function orderToText(ord: DrawAsset[]): string {
  return ord.map((x) => DRAW_LABEL[x] ?? x).join(" → ");
}
