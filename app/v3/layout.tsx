"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ConsentDialog } from "@/components/ConsentDialog";
import { Footer } from "@/components/Footer";

const TABS = [
  { href: "/v3/detail", label: "詳細入力" },
  { href: "/v3/result", label: "結果出力" },
  { href: "/v3/suggest", label: "シナリオ比較" },
];

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIdx = TABS.findIndex((t) => pathname.startsWith(t.href));

  return (
    <div className="min-h-screen" style={{ background: "#f0f0ee" }}>
      <header
        className="sticky top-0 z-50 flex items-center gap-3 px-4 py-2.5 sm:px-8"
        style={{ background: "#f0f0ee", borderBottom: "2.5px solid #0a0a0a" }}
      >
        <Link
          href="/"
          className="shrink-0 text-sm font-bold uppercase tracking-[0.18em] text-[#0a0a0a] transition-colors hover:text-[#c8383a]"
        >
          LIFEPLAN
        </Link>

        <span className="text-[#0a0a0a]/30">|</span>

        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {TABS.map((tab, i) => {
            const active = i === activeIdx;
            const passed = activeIdx >= 0 && i < activeIdx;
            const upcoming = activeIdx >= 0 && i > activeIdx;

            const stepBg = active
              ? "#0a0a0a"
              : passed
                ? "#0a0a0a25"
                : "#ffffff";
            const stepText = active
              ? "#ffffff"
              : passed
                ? "#0a0a0a55"
                : "#0a0a0a";
            const labelColor = active
              ? "#ffffff"
              : passed
                ? "#0a0a0a55"
                : upcoming
                  ? "#0a0a0a"
                  : "#0a0a0a";
            const tabBg = active ? "#0a0a0a" : "transparent";
            const tabBorder = active
              ? "2px solid #0a0a0a"
              : passed
                ? "2px solid #0a0a0a20"
                : "2px solid #0a0a0a";

            return (
              <span key={tab.href} className="flex items-center gap-0.5">
                <Link
                  href={tab.href}
                  className="flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-xs font-bold tracking-wide transition-all hover:opacity-80"
                  style={{
                    color: labelColor,
                    background: tabBg,
                    border: tabBorder,
                    borderRadius: 8,
                  }}
                >
                  <span
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[9px] font-bold tabular-nums"
                    style={{
                      background: stepBg,
                      color: stepText,
                      borderRadius: 4,
                      border: active ? "1px solid #ffffff40" : "none",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {tab.label}
                </Link>
                {i < TABS.length - 1 ? (
                  <span
                    className="shrink-0 text-sm font-bold"
                    style={{
                      color:
                        passed || (active && i + 1 <= activeIdx)
                          ? "#0a0a0a30"
                          : "#0a0a0a55",
                    }}
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
              </span>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span
            className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-white"
            style={{
              height: 20,
              padding: "0 8px",
              background: "#c8383a",
              border: "2px solid #0a0a0a",
              borderRadius: 8,
            }}
          >
            VER 3
          </span>
        </div>
      </header>

      {children}
      <Footer />
      <ConsentDialog />
    </div>
  );
}
