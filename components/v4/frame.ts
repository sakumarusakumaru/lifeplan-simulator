import type { CSSProperties } from "react";

// 枠・色・記号のルール（ver5.17〜）。同じ階層のものは、同じ見た目で見せる。
//
// 1. 枠（階層ごとに1種類。黒い枠を並べない）
//   章        ページの区切り（01 年金・02 遺族年金…）。枠なし。番号＋見出し＋下線
//   カード    章の中の同じ階層のまとまり（入力の組・グラフ・表・結果の項目）。白地・2pxの薄い線（墨12%）・角丸12。
//             開閉できる組も同じ枠で、見出しの右に「開く ▸／閉じる ▾」
//   中箱      カードの中で繰り返す1件（勤務先・子ども・ローン・物件・保険）や補足の表。線なし・薄い地色・角丸10。
//             さらに分けるときは白地（線なし）。地色を交互にして、線は増やさない
//   強調      その画面の結論だけ（いまの試算・結果のまとめ・保障の判定）。2.5pxの強調色か状態色（緑・赤）。1画面に1つ
//   お知らせ  地色＋同じ系統の色の2px線。黄＝注意・制度チェック、青＝補足（この入力だと…）、緑＝良い知らせ・キープ中、赤＝警告
//   操作      ボタン・切り替え・入力欄。1.5pxの黒い線は「押せる・入れられる」もの専用。説明や合計の表示には使わない
//
// 2. ベタ色（塗りつぶし）
//   強調色 --lp-primary（藍）: 選んでいるタブ・主なボタン・結論の箱の見出し帯。黒のベタ塗りは使わない
//   状態色: 緑＝足りる・良い、赤＝足りない・警告、黄＝注意。判定の文字と、お知らせの線・地色だけに使う
//   薄い地色 --lp-primary-soft / #f4f4f2: 中箱・選んでいない切り替え。濃い色の面を1画面に2つ以上並べない
//
// 3. 記号
//   開閉: 「開く ▸」「閉じる ▾」（見出しの右。文字つきで出す。▷や＋は使わない）
//   流れ: 「›」（ヘッダーの5画面）、進む: 「→」（次へ・レポートを見る）、戻る: 「←」
//   注意: 「●」（赤＝要確認、黄＝注意）、補足: 「○」、完了: 「✓」（緑）。「！」「⚠」は使わない
//
// 4. 折りたたみ
//   はじめから開く: 入力に必ず要る組（本人・収入・生活費など）、結果の本体（まとめ・グラフ・表）
//   はじめは閉じる: あれば入れる組（副業・暗号資産・介護など）、補足（グラフの読み方・計算の前提・制度チェックで要確認がないとき）
//   開閉の記憶はしない（毎回同じ状態で開く）。閉じていても見出しに件数や要点を出す（「制度チェック（3件）」「仮定を置いているもの（9項目）」）
//
//   例外: 引き継ぎ書の印刷する紙面は、紙の書類としての体裁（罫線・記入欄）を優先する

export const LINE_SOFT = "#0a0a0a1f"; // カードの線
export const INNER_BG = "#f4f4f2"; // 中箱の地色

export const CARD: CSSProperties = { background: "#ffffff", border: `2px solid ${LINE_SOFT}`, borderRadius: 12 };
export const INNER: CSSProperties = { background: INNER_BG, borderRadius: 10 };
export const INNER2: CSSProperties = { background: "#ffffff", borderRadius: 8 };

export const strong = (color = "var(--lp-primary)"): CSSProperties => ({ background: "#ffffff", border: `2.5px solid ${color}`, borderRadius: 12 });

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
