// 制度上限（NISA・iDeCo/企業型DC・児童手当）— 2026年10月時点
import type { DcType } from "./types";

const MAN = 10000;

// ─────────────────────────────────────────
// 新NISA（2024年〜・恒久化）
// ─────────────────────────────────────────
export const NISA = {
  tsumitateYear: 120 * MAN,   // つみたて投資枠 年120万
  growthYear: 240 * MAN,      // 成長投資枠 年240万
  lifetime: 1800 * MAN,       // 生涯 非課税保有限度額（簿価）
  growthLifetime: 1200 * MAN, // うち成長投資枠
};

// ─────────────────────────────────────────
// iDeCo・企業型DC の掛金上限（月額）
//   2026年11月掛金分まで: 現行 / 2026年12月掛金分（2027年1月引落）から: 引上げ後
//   シミュレーションは年単位なので 2026年分は現行、2027年分以降は引上げ後で判定
// ─────────────────────────────────────────
export interface DcLimit {
  selfMax: number;      // 本人掛金（iDeCo・マッチング）の上限
  note: string;
}

export function dcSelfLimit(type: DcType, employerM: number, year: number): DcLimit {
  const after = year >= 2027;
  switch (type) {
    case "employee-none":
      return after
        ? { selfMax: 62_000, note: "会社員（企業年金なし）: 月6.2万（2026年12月掛金分から。従来2.3万）" }
        : { selfMax: 23_000, note: "会社員（企業年金なし）: 月2.3万" };
    case "employee-dc":
      return after
        ? {
            selfMax: Math.max(0, 62_000 - employerM),
            note: "企業型DCあり: 会社掛金と合わせて月6.2万まで（2026年12月掛金分から）",
          }
        : {
            selfMax: Math.max(0, Math.min(20_000, 55_000 - employerM)),
            note: "企業型DCあり: iDeCoは月2万まで、かつ会社掛金と合わせて5.5万まで",
          };
    case "employee-db":
      return after
        ? {
            selfMax: Math.max(0, 54_000 - employerM),
            note: "DBあり・公務員: 目安 月5.4万（62,000円−DB等の掛金相当額。勤務先で確認）",
          }
        : { selfMax: 20_000, note: "DBあり・公務員: 月2万" };
    case "self-employed":
      return after
        ? { selfMax: 75_000, note: "自営業（第1号）: 月7.5万（国民年金基金・付加保険料と合算）" }
        : { selfMax: 68_000, note: "自営業（第1号）: 月6.8万（国民年金基金・付加保険料と合算）" };
    case "dependent":
      return { selfMax: 23_000, note: "専業主婦（夫）（第3号）: 月2.3万" };
  }
}

// iDeCo の加入可能年齢: 2026年12月から 70歳未満（老齢基礎年金・iDeCo老齢給付を受けていないこと）
export const DC_MAX_CONTRIB_AGE = 70;
export const DC_PAYOUT_MIN_AGE = 60;
export const DC_PAYOUT_MAX_AGE = 75;

export const DC_TYPE_OPTIONS: { value: DcType; label: string }[] = [
  { value: "employee-none", label: "会社員（企業年金なし）" },
  { value: "employee-dc", label: "会社員（企業型DCあり）" },
  { value: "employee-db", label: "会社員（確定給付の企業年金DBあり）・公務員" },
  { value: "self-employed", label: "自営業・フリーランス（第1号）" },
  { value: "dependent", label: "専業主婦（夫）（第3号）" },
];

// ─────────────────────────────────────────
// 児童手当（2024年10月拡充後）月額
//   0〜2歳 1.5万 / 3歳〜高校生年代 1万 / 第3子以降は年齢を問わず 3万
//   第何子かは 22歳年度末までの子を数える。所得制限なし
// ─────────────────────────────────────────
export function childAllowanceMonthly(kidAge: number, rank: number): number {
  if (kidAge < 0 || kidAge > 17) return 0;
  if (rank >= 3) return 30_000;
  return kidAge < 3 ? 15_000 : 10_000;
}
