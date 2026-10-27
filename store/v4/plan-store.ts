"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_PLAN, EMPTY_PLAN } from "@/lib/v4/calc/defaults";
import { normalizeInsurance } from "@/lib/v4/calc/insurance";
import type { PlanInput } from "@/lib/v4/calc/types";

// ver3（lp_v13）の保存データを ver4 の項目に読み替える。
// 投信・株を「NISA口座」「特定口座」に合算し、利回りは残高で加重平均する。
export function migrateV3Plan(old: Record<string, unknown>): Partial<PlanInput> {
  const n = (k: string) => (typeof old[k] === "number" ? (old[k] as number) : 0);
  const wavg = (b1: number, r1: number, b2: number, r2: number, fallback: number) =>
    b1 + b2 > 0 ? (b1 * r1 + b2 * r2) / (b1 + b2) : fallback;
  const out: Record<string, unknown> = { ...old };
  for (const k of [
    "fundBal", "fundR", "saveFundM", "saveFundEndAge",
    "fundNisaBal", "saveFundNisaM", "saveFundNisaEndAge",
    "stockBal", "stockR", "saveStockM", "saveStockEndAge",
    "stockNisaBal", "saveStockNisaM", "saveStockNisaEndAge",
    "drawOrder", "drawCustomOrder",
  ]) delete out[k];
  if ("fundBal" in old || "fundNisaBal" in old) {
    out.nisaBal = n("fundNisaBal") + n("stockNisaBal");
    out.nisaR = wavg(n("fundNisaBal"), n("fundR"), n("stockNisaBal"), n("stockR"), n("fundR") || 4);
    out.nisaTsumitateM = n("saveFundNisaM");
    out.nisaGrowthM = n("saveStockNisaM");
    out.nisaEndAge = Math.max(n("saveFundNisaEndAge"), n("saveStockNisaEndAge")) || 60;
    out.tokuBal = n("fundBal") + n("stockBal");
    out.tokuR = wavg(n("fundBal"), n("fundR"), n("stockBal"), n("stockR"), n("fundR") || 4);
    out.saveTokuM = n("saveFundM") + n("saveStockM");
    out.saveTokuEndAge = Math.max(n("saveFundEndAge"), n("saveStockEndAge")) || 60;
  }
  if (typeof old.cashRate === "number" && old.cashRate >= 0.01) out.cashRate = DEFAULT_PLAN.cashRate;
  return out as Partial<PlanInput>;
}

function readV3Plan(): Partial<PlanInput> | null {
  try {
    const raw = localStorage.getItem("lp_v13");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { plan?: Record<string, unknown> } };
    const plan = parsed?.state?.plan;
    return plan ? migrateV3Plan(plan) : null;
  } catch {
    return null;
  }
}

interface PlanStore {
  plan: PlanInput;
  hydrated: boolean;
  setField: <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => void;
  patch: (partial: Partial<PlanInput>) => void;
  reset: () => void;          // 空の状態に戻す（はじめての人と同じ）
  loadSample: () => void;     // サンプル（35歳・会社員）を読み込む
  setHydrated: () => void;
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set) => ({
      plan: EMPTY_PLAN,
      hydrated: false,
      setField: (key, value) =>
        set((s) => ({ plan: { ...s.plan, [key]: value } })),
      patch: (partial) =>
        set((s) => ({ plan: { ...s.plan, ...partial } })),
      reset: () => set({ plan: EMPTY_PLAN }),
      loadSample: () => set({ plan: DEFAULT_PLAN }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "lp_v4",
      partialize: (state) => ({ plan: state.plan }),
      // 新フィールド追加時にpersist済みデータをマージしてundefinedを防ぐ
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { plan?: Partial<PlanInput> } | undefined;
        // ver4 の保存が無ければ、ver3 の入力内容を引き継ぐ（ver3 側のデータは消さない）
        const loaded = persisted?.plan ?? (typeof window !== "undefined" ? readV3Plan() : null);
        const source = loaded ?? {};
        // 保存データがない（はじめての人）は空の状態から。保存データがある人は不足項目をサンプル値で補う
        const BASE = loaded ? DEFAULT_PLAN : EMPTY_PLAN;
        const persistedPlan = source as Partial<PlanInput> & {
          kids?: Array<{ s?: Record<string, unknown>; opt?: Record<string, unknown> } & Record<string, unknown>>;
          jobs?: Array<Record<string, unknown>>;
          res?: Array<Record<string, unknown>>;
        };

        // Kid フィールドの自動マイグレーション
        // 旧: opt.grad / opt.dormU / opt.dormG → 新: s.g / opt.dorm
        const migratedKids = (persistedPlan.kids ?? BASE.kids).map((kid) => {
          const s = { ...(kid.s ?? {}) } as Record<string, unknown>;
          const opt = { ...(kid.opt ?? {}) } as Record<string, unknown>;
          if (s.g === undefined) {
            s.g = opt.grad ? "pub" : "none";
          }
          if (opt.dorm === undefined) {
            opt.dorm = Boolean(opt.dormU || opt.dormG);
          }
          return { ...kid, s, opt };
        });

        // Job フィールドの自動マイグレーション (raise追加)
        const migratedJobs = (persistedPlan.jobs ?? BASE.jobs).map((j) => {
          const obj = { ...j } as Record<string, unknown>;
          if (obj.raise === undefined) obj.raise = 0;
          return obj;
        });

        // drawCustomOrder: ver4 の口座単位に揃える
        const ALL_DRAW_ASSETS = BASE.drawCustomOrder;
        const persistedOrder = (persistedPlan.drawCustomOrder ?? []).filter((a) =>
          ALL_DRAW_ASSETS.includes(a),
        );
        const migratedDrawOrder = [
          ...persistedOrder,
          ...ALL_DRAW_ASSETS.filter((a) => !persistedOrder.includes(a)),
        ];
        const migratedDrawMode =
          persistedPlan.drawOrder === "custom" ? "custom" : BASE.drawOrder;

        // RealEstate フィールドの自動マイグレーション (propTax + 評価額算定用フィールド追加)
        const currentYear = new Date().getFullYear();
        const migratedRes = (persistedPlan.res ?? BASE.res).map((r) => {
          const obj = { ...r } as Record<string, unknown>;
          if (obj.propTax === undefined) obj.propTax = 0;
          if (obj.propType === undefined) obj.propType = "mansion";
          if (obj.structure === undefined) obj.structure = "rc";
          if (obj.builtYear === undefined) obj.builtYear = currentYear - 5;
          if (obj.purchasePrice === undefined) obj.purchasePrice = obj.bal || 0;
          if (obj.landRatio === undefined) obj.landRatio = 30;
          if (obj.currentValueOverride === undefined) obj.currentValueOverride = 0;
          return obj;
        });

        // 持ち家（自宅）フィールドのマイグレーション
        const planWithHome = persistedPlan as typeof persistedPlan & Record<string, unknown>;
        if (planWithHome.homeOwned === undefined) {
          // 旧データ: useHomeLoan が true なら持ち家とみなす
          planWithHome.homeOwned = Boolean(planWithHome.useHomeLoan);
        }
        if (planWithHome.homePropType === undefined) planWithHome.homePropType = "house";
        if (planWithHome.homeStructure === undefined) planWithHome.homeStructure = "wood";
        if (planWithHome.homeBuiltYear === undefined) planWithHome.homeBuiltYear = currentYear - 5;
        if (planWithHome.homePurchasePrice === undefined) planWithHome.homePurchasePrice = 0;
        if (planWithHome.homeLandRatio === undefined) planWithHome.homeLandRatio = 50;
        if (planWithHome.homeCurrentValueOverride === undefined) planWithHome.homeCurrentValueOverride = 0;

        return {
          ...currentState,
          plan: {
            ...BASE,
            ...currentState.plan,
            ...persistedPlan,
            kids: migratedKids,
            jobs: migratedJobs,
            // 保険: 旧い種類名（「生命（死亡・収入保障）」など）を新しい種類に読み替え、足りない項目を補う
            ins: (persistedPlan.ins ?? BASE.ins).map((p) =>
              normalizeInsurance(p as never, persistedPlan.curAge ?? BASE.curAge, persistedPlan.endAge ?? BASE.endAge),
            ),
            res: migratedRes,
            drawCustomOrder: migratedDrawOrder,
            drawOrder: migratedDrawMode,
            selfPension: {
              ...BASE.selfPension,
              ...(persistedPlan.selfPension ?? {}),
            },
            spousePension: {
              ...BASE.spousePension,
              ...(persistedPlan.spousePension ?? {}),
            },
            // 投信／株のカード入力: まとめて入れていた人は、その金額を「投資信託」に入れて引き継ぐ
            nisaSplit: persistedPlan.nisaSplit?.on
              ? { ...BASE.nisaSplit, ...persistedPlan.nisaSplit }
              : { ...BASE.nisaSplit, on: true, fundBal: persistedPlan.nisaBal ?? 0, fundR: persistedPlan.nisaR ?? BASE.nisaR },
            tokuSplit: persistedPlan.tokuSplit?.on
              ? { ...BASE.tokuSplit, ...persistedPlan.tokuSplit }
              : { ...BASE.tokuSplit, on: true, fundBal: persistedPlan.tokuBal ?? BASE.tokuBal, fundR: persistedPlan.tokuR ?? BASE.tokuR },
            handover: { ...BASE.handover, ...(persistedPlan.handover ?? {}) },
            risk: {
              ...BASE.risk,
              ...(persistedPlan.risk ?? {}),
            },
          } as unknown as PlanInput,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
