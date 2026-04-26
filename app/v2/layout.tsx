"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/v2/detail", label: "詳細入力" },
  { href: "/v2/result", label: "結果" },
  { href: "/v2/suggest", label: "改善提案" },
];

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

        <nav className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="shrink-0 px-3 py-1 text-xs font-bold tracking-wide transition-colors"
                style={{
                  color: active ? "#ffffff" : "#0a0a0a",
                  background: active ? "#0a0a0a" : "transparent",
                  borderRadius: 6,
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto shrink-0">
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
            VER 2
          </span>
        </div>
      </header>

      {children}
    </div>
  );
}
