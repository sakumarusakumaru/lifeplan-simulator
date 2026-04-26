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
        return {
          ...currentState,
          plan: {
            ...DEFAULT_PLAN,
            ...currentState.plan,
            ...(persisted?.plan ?? {}),
            selfPension: {
              ...DEFAULT_PLAN.selfPension,
              ...((persisted?.plan as Partial<PlanInput> | undefined)?.selfPension ?? {}),
            },
            spousePension: {
              ...DEFAULT_PLAN.spousePension,
              ...((persisted?.plan as Partial<PlanInput> | undefined)?.spousePension ?? {}),
            },
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
