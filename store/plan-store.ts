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
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
