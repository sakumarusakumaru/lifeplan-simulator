"use client";

import { create } from "zustand";

import { DEFAULT_QUICK } from "@/lib/calc/quick-types";
import type { QuickInput } from "@/lib/calc/quick-types";

interface QuickStore {
  q: QuickInput;
  step: number;
  setField: <K extends keyof QuickInput>(key: K, value: QuickInput[K]) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

export const useQuickStore = create<QuickStore>((set) => ({
  q: DEFAULT_QUICK,
  step: 0,
  setField: (key, value) => set((s) => ({ q: { ...s.q, [key]: value } })),
  setStep: (step) => set({ step }),
  reset: () => set({ q: DEFAULT_QUICK, step: 0 }),
}));
