"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// 引き継ぎ書の「口座番号・ログインID・証券番号」など、取り扱いに注意が必要な値。
// シミュレーターの入力（lp_v4）とは別のキーに保存する。
// JSONの保存（app/v5/layout.tsx）には、「画面で入力する」（enabled）がオンのときだけ handoverSecrets として含め、読み込み時に restore で戻す。
// オフのときは含めない。検証用の匿名化した書き出しには、オンでも含めない。
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
  restore: (values: Record<string, string>) => void; // JSONから読み込んで入れ替える（画面入力もオンにする）
  remap: (fn: (key: string) => string | null) => void; // キーを付け替える（null は消す）
  setHydrated: () => void;
}

// JSONの保存に入れる形（読み込みの型チェックにも使う）
export interface HandoverSecretsJson {
  enabled: true;
  values: Record<string, string>;
}

// 読み込んだJSONの handoverSecrets が、保存した形どおりかを確かめて取り出す（文字でない値・空の値は捨てる）
export function parseHandoverSecrets(raw: unknown): HandoverSecretsJson | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as { enabled?: unknown; values?: unknown };
  if (o.enabled !== true || typeof o.values !== "object" || o.values === null) return null;
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.values as Record<string, unknown>)) if (typeof v === "string" && v) values[k] = v;
  return { enabled: true, values };
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
      restore: (values) => set({ values: { ...values }, enabled: true }),
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
