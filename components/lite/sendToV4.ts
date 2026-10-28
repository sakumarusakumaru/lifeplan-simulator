"use client";

import { liteToPlan } from "@/lib/lite/toPlan";
import type { LiteInput } from "@/lib/lite/types";
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
    !confirm("詳細版にはすでに入力があります。Liteの内容で置き換えますか？\n（引き継ぎ書と相続の設定は残ります。今の詳細版の入力を残したいときは、先に詳細版のメニューからJSONで保存してください）")
  )
    return false;
  const st = usePlanStore.getState();
  const plan = normalizePlan(liteToPlan(q), { ...DEFAULT_PLAN, ...EMPTY_PLAN });
  st.replace({ ...plan, handover: st.plan.handover, inheritSet: st.plan.inheritSet });
  return true;
}
