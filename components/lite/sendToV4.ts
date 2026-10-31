"use client";

import { liteToPlan } from "@/lib/lite/toPlan";
import type { LiteInput } from "@/lib/lite/types";
import type { PlanInput } from "@/lib/v4/calc/types";
import { DEFAULT_PLAN, EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import { normalizePlan, usePlanStore } from "@/store/v4/plan-store";

// ver4 にもう何か入力しているか（入っていれば、置き換える前に確かめる）
function v4HasInput() {
  try {
    if (!localStorage.getItem("lp_v4")) return false;
  } catch {
    return false;
  }
  const p = usePlanStore.getState().plan;
  return p.jobs.some((j) => j.inc > 0) || p.livingM > 0 || p.cashBal > 0 || p.nisaBal > 0 || p.kids.length > 0;
}

// Lite の入力を ver4 に渡す。ver4 の引き継ぎ書と相続の設定はそのまま残す。渡したら true
export function sendToV4(q: LiteInput): boolean {
  if (
    v4HasInput() &&
    !confirm("詳細版にはすでに入力があります。Liteの内容で置き換えますか？\n（引き継ぎ書と相続の設定は残ります。今の詳細版の入力を残したいときは、先に詳細版のメニューの「入力データを保存」で保存してください）")
  )
    return false;
  const st = usePlanStore.getState();
  const plan = normalizePlan(liteToPlan(q), { ...DEFAULT_PLAN, ...EMPTY_PLAN });
  st.replace({ ...plan, handover: st.plan.handover, inheritSet: st.plan.inheritSet });
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoffLines(plan)));
  } catch {
    // 見せられなくても引き継ぎはできている
  }
  return true;
}

export const HANDOFF_KEY = "lp_lite_handoff";

const man = (yen: number) => `${Math.round(yen / 10000).toLocaleString()}万円`;

// Lite の答えを、詳細版のどの欄に何を入れたか（詳細版の入力画面で一度だけ見せる）
function handoffLines(p: PlanInput): string[] {
  const job = p.jobs[0];
  const lines = [
    `1 基本設定 ＞ 本人の生年月日: ${p.selfBirth}（Liteは年齢だけなので1月1日生まれとして）`,
    p.spouseBirth ? `1 基本設定 ＞ 配偶者の生年月日: ${p.spouseBirth}（同じく1月1日として）` : "1 基本設定 ＞ 配偶者: いない",
    p.kids.length ? `1 基本設定 ＞ 子ども: ${p.kids.length}人（進学プランは学校の答えから。塾代は目安）` : "",
    job ? `2 収入 ＞ ${job.name}: 年収${man(job.inc)}、${job.end}歳まで、退職金${man(job.sev)}（昇給は年${job.raise}%）` : "",
    p.jobs[1] ? `2 収入 ＞ ${p.jobs[1].name}: 年収${man(p.jobs[1].inc)}（60歳のときの年収×割合）、${p.jobs[1].end}歳まで、昇給なし` : "",
    p.dcBal || p.saveDcM ? `3 資産 ＞ iDeCo・DCに入った年齢: ${p.dcJoinAge}歳（受け取るときの税金の計算に使う）` : "",
    p.saveTokuM ? `3 資産 ＞ 特定口座の積立: 月${man(p.saveTokuM)}（NISAの月30万円を超えた分）` : "",
    p.spouseBirth ? `2 収入 ＞ 配偶者の収入: ${p.spouseWork === "work" ? `年収${man(p.spouseIncY)}、${p.spouseIncEnd}歳まで` : "働いていない"}` : "",
    `2 収入 ＞ 年金: ${p.selfPension.mode === "manual" ? `ねんきん定期便の額（月${man(p.selfPension.manualMonth)}）` : "年収と働く年数から自動計算"}、${p.penStartA}歳から`,
    p.cashBal || p.nisaBal ? `3 資産 ＞ 現金${man(p.cashBal)}、投資の合計${man(p.nisaBal)}はすべて新NISAの投資信託として（利回り年${p.nisaR}%）` : "",
    p.nisaTsumitateM + p.nisaGrowthM ? `3 資産 ＞ NISAの積立: 月${man(p.nisaTsumitateM + p.nisaGrowthM)}（つみたて枠から順に）` : "",
    p.dcBal || p.saveDcM ? `3 資産 ＞ iDeCo・DC: 残高${man(p.dcBal)}、掛金 月${man(p.saveDcM)}、65歳に一時金` : "",
    `4 支出 ＞ 基本生活費: 月${man(p.livingM)}（Liteの生活費には保険料も入っています。保険を別に入れるときは、その分を生活費から引いてください）`,
    p.livingRetireM ? `4 支出 ＞ 働き終わったあとの生活費: 月${man(p.livingRetireM)}` : "",
    p.homeOwned && !p.homeBuyAge
      ? `4 支出 ＞ 住居: 持ち家。維持費 月${man(p.rentM)}を「家賃/管理費」に、固定資産税 年${man(p.homeTaxY)}`
      : p.rentM
        ? `4 支出 ＞ 住居: 家賃 月${man(p.rentM)}`
        : "",
    p.homeBuyAge ? `4 支出 ＞ 住居: ${p.homeBuyAge}歳で家を買う。頭金・諸費用は「ライフイベント」、維持費は固定資産税の欄に足している` : "",
    p.useHomeLoan ? `4 支出 ＞ 住宅ローン: ${p.homeBuyAge ? `${p.hlStart}歳から借りる` : "残高"} 約${man(p.hlBal)}、金利${p.hlRate}%、${p.hlTerm}年（${p.homeBuyAge ? "家の値段から頭金を引いた額" : "Liteの返済額と残り年数から逆算"}）` : "",
    p.lifeExpenses.length ? `4 支出 ＞ ライフイベント: 一時支出 ${p.lifeExpenses.length}件` : "",
    `前提: 物価 年${p.infl}%、${p.endAge}歳まで計算。保険・副業・不動産投資・介護は入っていません`,
  ];
  return lines.filter(Boolean);
}
