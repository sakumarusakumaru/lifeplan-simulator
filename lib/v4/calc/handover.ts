// 「お金の引き継ぎ書」の財産・負債の一覧。金額はシミュレーターの入力（作成日時点）から自動で入る
import { computeRealEstateValue } from "./finance";
import type { PlanInput } from "./types";

export interface InventoryRow {
  key: string;            // 保管場所（where）を結びつけるキー
  kind: "asset" | "debt";
  label: string;
  amount: number;
  placeholder: string;    // 保管場所の入力例
}

function homeValueNow(plan: PlanInput, year: number): number {
  if (!plan.homeOwned) return 0;
  return computeRealEstateValue(
    {
      name: "自宅",
      rent: 0,
      cost: 0,
      propTax: 0,
      bal: 0,
      rate: 0,
      term: 0,
      start: 0,
      propType: plan.homePropType ?? "house",
      structure: plan.homeStructure ?? "wood",
      builtYear: plan.homeBuiltYear ?? year,
      purchasePrice: plan.homePurchasePrice ?? 0,
      landRatio: plan.homeLandRatio ?? 50,
      currentValueOverride: plan.homeCurrentValueOverride ?? 0,
    },
    year,
  );
}

export function buildInventory(plan: PlanInput): InventoryRow[] {
  const year = new Date().getFullYear();
  const rows: InventoryRow[] = [
    { key: "cash", kind: "asset", label: "現金・預金", amount: plan.cashBal, placeholder: "例：○○銀行 △△支店（普通・定期）、ゆうちょ銀行" },
    { key: "nisa", kind: "asset", label: "NISA口座", amount: plan.nisaBal, placeholder: "例：○○証券のNISA口座" },
    { key: "toku", kind: "asset", label: "特定口座（証券）", amount: plan.tokuBal, placeholder: "例：○○証券・△△証券の特定口座" },
    { key: "dc", kind: "asset", label: "iDeCo・企業型DC", amount: plan.dcBal, placeholder: "例：iDeCo（○○証券）、会社の企業型DC" },
    { key: "crypto", kind: "asset", label: "暗号資産", amount: plan.cryptoBal, placeholder: "例：○○取引所（アプリ名）" },
    { key: "gold", kind: "asset", label: "金・コモディティ", amount: plan.goldBal, placeholder: "例：○○証券の金ETF、自宅の金庫" },
    { key: "home", kind: "asset", label: "自宅（評価額の目安）", amount: homeValueNow(plan, year), placeholder: "例：所在地。権利証・登記識別情報は○○に保管" },
  ];
  plan.res.forEach((r, i) => {
    rows.push({
      key: `re-${i}`,
      kind: "asset",
      label: `不動産投資：${r.name || `物件${i + 1}`}`,
      amount: computeRealEstateValue(r, year),
      placeholder: "例：所在地・管理会社",
    });
  });
  if (plan.useHomeLoan && plan.hlBal > 0) {
    rows.push({ key: "hl", kind: "debt", label: "住宅ローン", amount: plan.hlBal, placeholder: "例：○○銀行。団体信用生命保険あり" });
  }
  plan.res.forEach((r, i) => {
    if (r.bal > 0) {
      rows.push({ key: `reloan-${i}`, kind: "debt", label: `不動産ローン：${r.name || `物件${i + 1}`}`, amount: r.bal, placeholder: "例：○○銀行" });
    }
  });
  plan.otherLoans.forEach((ln, i) => {
    const amount = ln.monthlyPay * ln.remainMonths;
    if (amount > 0) {
      rows.push({ key: `loan-${i}`, kind: "debt", label: ln.label || `ローン${i + 1}`, amount, placeholder: "例：○○信販" });
    }
  });
  (plan.handover?.extraAssets ?? []).forEach((x, i) => {
    rows.push({ key: `extra-${i}`, kind: "asset", label: x.label || `その他の財産${i + 1}`, amount: x.amount, placeholder: "" });
  });
  return rows;
}

// 亡くなった後の手続き（期限の早い順）。一般的な目安
export const AFTER_DEATH_STEPS: { when: string; items: string[] }[] = [
  { when: "7日以内", items: ["死亡届の提出（市区町村役場。葬儀社が代行することが多い）", "火葬許可申請"] },
  {
    when: "14日以内",
    items: [
      "年金の受給停止（年金事務所。マイナンバー登録済みなら原則不要）",
      "国民健康保険・後期高齢者医療・介護保険の資格喪失届",
      "世帯主の変更届（必要な場合）",
    ],
  },
  { when: "すみやかに", items: ["勤務先への連絡（死亡退職金・未払い給与）", "生命保険会社への連絡（保険金の請求は3年以内）", "遺言書の有無を確認（自筆の遺言は家庭裁判所の検認が必要。法務局保管のものは不要）"] },
  { when: "3か月以内", items: ["相続放棄・限定承認をするかの判断（借金が多い場合）"] },
  { when: "4か月以内", items: ["準確定申告（亡くなった人のその年の所得の確定申告）"] },
  { when: "10か月以内", items: ["遺産分割協議", "相続税の申告・納付（基礎控除を超える場合）"] },
  { when: "2年以内", items: ["葬祭費・埋葬料の申請", "高額療養費の申請（入院していた場合）"] },
  { when: "3年以内", items: ["不動産の相続登記（2024年4月から義務化）"] },
  { when: "5年以内", items: ["遺族年金・未支給年金の請求"] },
];
