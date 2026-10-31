"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_OPEN: Record<string, boolean> = {
  "ch-01": true,
  "ch-02": false,
  "ch-03": false,
  "ch-04": false,
  "ch-05": false,
  "ch-06": false,
  "ch-07": false,
};

interface UiStore {
  open: Record<string, boolean>;
  hydrated: boolean;
  realValue: boolean; // 結果を「今のお金の価値」で表示する
  setRealValue: (v: boolean) => void;
  mcOn: boolean; // 運用の振れ幅（モンテカルロ）を表示する。既定は固定利回りのみ
  setMcOn: (v: boolean) => void;
  // はじめての人の入力ステップ。4ブロックを順に「OK」していき、終わったら結果を表示する
  confirmed: Record<string, boolean>;
  confirm: (id: string) => void;
  unlocked: boolean | null; // 結果を表示してよいか。null = まだ判定していない（既存ユーザー判定に使う）
  setUnlocked: (v: boolean) => void;
  resetProgress: () => void;
  setOpen: (id: string, open: boolean) => void;
  toggle: (id: string) => void;
  openAll: () => void;
  closeAll: () => void;
  setHydrated: () => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      open: DEFAULT_OPEN,
      hydrated: false,
      realValue: true, // 金額は「今の価値」で見せるのが既定（Lite と同じ）
      setRealValue: (v) => set({ realValue: v }),
      mcOn: false,
      setMcOn: (v) => set({ mcOn: v }),
      confirmed: {},
      confirm: (id) => set((s) => ({ confirmed: { ...s.confirmed, [id]: true } })),
      unlocked: null,
      setUnlocked: (v) => set({ unlocked: v }),
      resetProgress: () => set({ confirmed: {}, unlocked: false }),
      setOpen: (id, open) =>
        set((s) => ({ open: { ...s.open, [id]: open } })),
      toggle: (id) =>
        set((s) => ({ open: { ...s.open, [id]: !s.open[id] } })),
      openAll: () =>
        set(() => ({
          open: Object.fromEntries(Object.keys(DEFAULT_OPEN).map((k) => [k, true])),
        })),
      closeAll: () =>
        set(() => ({
          open: Object.fromEntries(Object.keys(DEFAULT_OPEN).map((k) => [k, false])),
        })),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "lp_ui_v4",
      partialize: (state) => ({
        open: state.open,
        realValue: state.realValue,
        mcOn: state.mcOn,
        confirmed: state.confirmed,
        unlocked: state.unlocked,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
