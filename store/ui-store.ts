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
      name: "lp_ui_v1",
      partialize: (state) => ({ open: state.open }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
