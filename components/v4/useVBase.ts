"use client";

import { usePathname } from "next/navigation";

// いま見ている版のURLの頭（/v4 か /v5）。/v4 配下にいるときだけ /v4、それ以外（/guide など）は現行版の /v5
export function vBaseOf(pathname: string | null | undefined): "/v4" | "/v5" {
  return pathname?.startsWith("/v4") ? "/v4" : "/v5";
}

export function useVBase(): "/v4" | "/v5" {
  return vBaseOf(usePathname());
}
