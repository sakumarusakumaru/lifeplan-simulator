"use client";

import { useState, type ReactNode } from "react";

interface SectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Section({ title, description, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-zinc-900">{title}</span>
          {description ? (
            <span className="text-xs text-zinc-500">{description}</span>
          ) : null}
        </span>
        <span
          className={`text-xs text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open ? (
        <div className="border-t border-zinc-100 bg-zinc-50/40 p-5">{children}</div>
      ) : null}
    </section>
  );
}
