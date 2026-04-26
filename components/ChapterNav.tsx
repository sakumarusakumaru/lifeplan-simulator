"use client";

import { useEffect, useState } from "react";

import { usePlanStore } from "@/store/plan-store";

interface NavItem {
  id: string;
  no: string;
  title: string;
  status: "default" | "entered";
}

export function ChapterNav() {
  const plan = usePlanStore((s) => s.plan);
  const pensionEntered =
    plan.selfPension.mode === "manual"
      ? plan.selfPension.manualMonth > 0
      : plan.selfPension.koseiAvgIncome > 0 || plan.selfPension.kokuminMonths > 0;
  const items: NavItem[] = [
    { id: "ch-01", no: "01", title: "基本情報", status: plan.selfBirth ? "entered" : "default" },
    { id: "ch-02", no: "02", title: "収入", status: plan.jobs.length > 0 ? "entered" : "default" },
    { id: "ch-03", no: "03", title: "年金", status: pensionEntered ? "entered" : "default" },
    { id: "ch-04", no: "04", title: "資産", status: plan.cashBal + plan.fundBal + plan.stockBal + plan.cryptoBal + plan.dcBal > 0 ? "entered" : "default" },
    { id: "ch-05", no: "05", title: "支出", status: plan.livingM > 0 ? "entered" : "default" },
    { id: "ch-06", no: "06", title: "住居", status: plan.rentM > 0 || plan.useHomeLoan ? "entered" : "default" },
    { id: "ch-07", no: "07", title: "教育費", status: plan.kids.length > 0 ? "entered" : "default" },
    { id: "ch-08", no: "08", title: "不動産投資", status: plan.res.length > 0 ? "entered" : "default" },
    { id: "ch-09", no: "09", title: "保険", status: plan.ins.length > 0 ? "entered" : "default" },
  ];

  const [active, setActive] = useState<string>(items[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-25% 0px -55% 0px" },
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <nav className="hidden xl:sticky xl:top-6 xl:flex xl:flex-col xl:gap-1.5 xl:self-start">
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="group relative"
          >
            <span
              className="block h-6 w-2.5 transition-colors"
              style={{
                background: isActive ? "#0a0a0a" : "#d4d4d2",
                border: "2px solid #0a0a0a",
                borderRadius: 4,
              }}
            />
            {it.status === "entered" ? (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 h-2 w-2"
                style={{
                  background: "#c8383a",
                  border: "1.5px solid #0a0a0a",
                  borderRadius: 999,
                }}
              />
            ) : null}
            {/* tooltip */}
            <span
              className="pointer-events-none invisible absolute left-4 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-white opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
              style={{
                background: "#0a0a0a",
                padding: "4px 10px",
                border: "2px solid #0a0a0a",
                borderRadius: 8,
              }}
            >
              {it.no} · {it.title}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
