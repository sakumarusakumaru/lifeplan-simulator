"use client";

import { handoverAfterRemove } from "@/lib/v4/calc/handover";
import { usePlanStore } from "@/store/v4/plan-store";
import { useSecretStore } from "@/store/v4/secret-store";

// 保険・不動産・ローンを入力から消す。引き継ぎ書の項目・保管場所・口座番号など（番号で結びついている）も一緒に付け替える
export function removeLinked(field: "ins" | "res" | "otherLoans", i: number) {
  const { plan, setField } = usePlanStore.getState();
  const prefixes = field === "ins" ? ["ins"] : field === "res" ? ["re", "reloan"] : ["loan"];
  const r = handoverAfterRemove(plan.handover, prefixes, i);
  setField(field, (plan[field] as unknown[]).filter((_, idx) => idx !== i) as never);
  setField("handover", r.handover);
  useSecretStore.getState().remap(r.secretKey);
}
