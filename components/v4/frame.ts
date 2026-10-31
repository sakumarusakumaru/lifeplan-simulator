import type { CSSProperties } from "react";

// 枠のルール（ver5.16〜）。同じ階層のものは、同じ枠で見せる。
//
//   1. 章         ページの区切り（01 年金・02 遺族年金…）。枠なし。番号＋見出し＋下線
//   2. カード     章の中の同じ階層のまとまり（入力の組・グラフ・表・結果の項目）。
//                 白地・2pxの薄い線・角丸12。開閉できる組も同じ枠で、見出しの右に「開く／閉じる」
//   3. 中箱       カードの中で繰り返す1件（勤務先・子ども・ローン・物件・保険・年金の本人/配偶者）や、
//                 カードの中の補足の表。線なし・薄い地色・角丸10
//                 中箱の中をさらに分けるときは白地（線なし）。地色を交互にして、線は増やさない
//   4. 強調       その画面の結論だけ（いまの試算・結果のまとめ・保障の判定）。2.5pxの黒か状態色
//   5. お知らせ   地色＋同じ系統の色の2px線。黄＝注意・制度チェック、青＝補足（この入力だと…）、
//                 緑＝良い知らせ・キープ中、赤＝警告
//   6. 操作       ボタン・切り替え・入力欄。黒い線は「押せる・入れられる」もの専用で、
//                 それ以外（説明・合計の表示など）には黒い線を使わない
//
//   例外: 引き継ぎ書の印刷する紙面は、紙の書類としての体裁（罫線・記入欄）を優先する

export const LINE_SOFT = "#0a0a0a1f"; // カードの線
export const INNER_BG = "#f4f4f2"; // 中箱の地色

export const CARD: CSSProperties = { background: "#ffffff", border: `2px solid ${LINE_SOFT}`, borderRadius: 12 };
export const INNER: CSSProperties = { background: INNER_BG, borderRadius: 10 };
export const INNER2: CSSProperties = { background: "#ffffff", borderRadius: 8 };

export const strong = (color = "#0a0a0a"): CSSProperties => ({ background: "#ffffff", border: `2.5px solid ${color}`, borderRadius: 12 });

const NOTE_COLORS = {
  yellow: { bg: "#fff8e7", line: "#d4a01766" },
  blue: { bg: "#eef6fc", line: "#3b82f659" },
  green: { bg: "#f0fff4", line: "#22863a66" },
  red: { bg: "#fff1f1", line: "#c8383a66" },
} as const;
export type NoteKind = keyof typeof NOTE_COLORS;
export const note = (kind: NoteKind): CSSProperties => ({
  background: NOTE_COLORS[kind].bg,
  border: `2px solid ${NOTE_COLORS[kind].line}`,
  borderRadius: 10,
});
