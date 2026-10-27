"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { LITE_DEFAULT, type LiteInput } from "@/lib/lite/types";

// ver4 Lite の入力。ver4（lp_v4）とは別に保存する
interface LiteStore {
  q: LiteInput;
  hydrated: boolean;
  set: (p: Partial<LiteInput>) => void;
  reset: () => void;
  setHydrated: () => void;
}

export const useLiteStore = create<LiteStore>()(
  persist(
    (set) => ({
      q: LITE_DEFAULT,
      hydrated: false,
      set: (p) => set((s) => ({ q: { ...s.q, ...p } })),
      reset: () => set({ q: LITE_DEFAULT }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "lp_lite_v1",
      partialize: (s) => ({ q: s.q }),
      merge: (persisted, current) => ({ ...current, q: { ...LITE_DEFAULT, ...((persisted as { q?: Partial<LiteInput> })?.q ?? {}) } }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
