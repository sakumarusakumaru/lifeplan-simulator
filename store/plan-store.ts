"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_PLAN } from "@/lib/calc/defaults";
import type { PlanInput } from "@/lib/calc/types";

interface PlanStore {
  plan: PlanInput;
  hydrated: boolean;
  setField: <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => void;
  patch: (partial: Partial<PlanInput>) => void;
  reset: () => void;
  setHydrated: () => void;
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set) => ({
      plan: DEFAULT_PLAN,
      hydrated: false,
      setField: (key, value) =>
        set((s) => ({ plan: { ...s.plan, [key]: value } })),
      patch: (partial) =>
        set((s) => ({ plan: { ...s.plan, ...partial } })),
      reset: () => set({ plan: DEFAULT_PLAN }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "lp_v13",
      partialize: (state) => ({ plan: state.plan }),
      // 新フィールド追加時にpersist済みデータをマージしてundefinedを防ぐ
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { plan?: Partial<PlanInput> } | undefined;
        const persistedPlan = (persisted?.plan ?? {}) as Partial<PlanInput> & {
          kids?: Array<{ s?: Record<string, unknown>; opt?: Record<string, unknown> } & Record<string, unknown>>;
          jobs?: Array<Record<string, unknown>>;
        };

        // Kid フィールドの自動マイグレーション
        // 旧: opt.grad / opt.dormU / opt.dormG → 新: s.g / opt.dorm
        const migratedKids = (persistedPlan.kids ?? DEFAULT_PLAN.kids).map((kid) => {
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
        const migratedJobs = (persistedPlan.jobs ?? DEFAULT_PLAN.jobs).map((j) => {
          const obj = { ...j } as Record<string, unknown>;
          if (obj.raise === undefined) obj.raise = 0;
          return obj;
        });

        return {
          ...currentState,
          plan: {
            ...DEFAULT_PLAN,
            ...currentState.plan,
            ...persistedPlan,
            kids: migratedKids,
            jobs: migratedJobs,
            selfPension: {
              ...DEFAULT_PLAN.selfPension,
              ...(persistedPlan.selfPension ?? {}),
            },
            spousePension: {
              ...DEFAULT_PLAN.spousePension,
              ...(persistedPlan.spousePension ?? {}),
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
