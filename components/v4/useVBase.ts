"use client";

import { usePathname } from "next/navigation";

// いま見ている版のURLの頭（/v4・/v5・/v6）。/v4・/v6 配下にいるときだけその版、それ以外（/guide など）は現行版の /v5。
// 見た目（日本語の見出しなど）は /v5 と /v6 で同じ。v6 だけの入力（配偶者の口座・配当）は base === "/v6" で出し分ける
export type VBase = "/v4" | "/v5" | "/v6";
export function vBaseOf(pathname: string | null | undefined): VBase {
  return pathname?.startsWith("/v4") ? "/v4" : pathname?.startsWith("/v6") ? "/v6" : "/v5";
}

export function useVBase(): VBase {
  return vBaseOf(usePathname());
}
