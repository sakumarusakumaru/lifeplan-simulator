"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// 引き継ぎ書の「口座番号・ログインID・証券番号」など、取り扱いに注意が必要な値。
// シミュレーターの入力（lp_v4）とは別のキーに保存し、JSONの保存・検証用の書き出しには含めない。
// パスワード・暗証番号はここにも保存しない（画面では入力できず、印刷後に手で書く）。
interface SecretStore {
  enabled: boolean;                  // 画面で入力する（false=印刷後に手書き）
  maskPrint: boolean;                // 印刷するときも下4桁以外を伏せる（家族に渡す写し用）
  setMaskPrint: (v: boolean) => void;
  values: Record<string, string>;    // キー: `${項目ID}.${欄のキー}`
  hydrated: boolean;
  setEnabled: (v: boolean) => void;
  set: (key: string, v: string) => void;
  clear: () => void;                 // この端末から消す
  remap: (fn: (key: string) => string | null) => void; // キーを付け替える（null は消す）
  setHydrated: () => void;
}

export const useSecretStore = create<SecretStore>()(
  persist(
    (set) => ({
      enabled: false,
      maskPrint: false,
      setMaskPrint: (v) => set({ maskPrint: v }),
      values: {},
      hydrated: false,
      setEnabled: (v) => set({ enabled: v }),
      set: (key, v) =>
        set((s) => {
          const values = { ...s.values };
          if (v) values[key] = v;
          else delete values[key];
          return { values };
        }),
      clear: () => set({ values: {}, enabled: false }),
      remap: (fn) =>
        set((s) => {
          const values: Record<string, string> = {};
          for (const [k, v] of Object.entries(s.values)) {
            const nk = fn(k);
            if (nk) values[nk] = v;
          }
          return { values };
        }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "lp_handover_secret_v1",
      partialize: (s) => ({ enabled: s.enabled, maskPrint: s.maskPrint, values: s.values }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
