"use client";

import { useMemo } from "react";

import { DRAW_LABEL } from "@/lib/v4/calc/drawOrder";
import { simulate } from "@/lib/v4/calc/simulate";
import type { DrawAsset, SimulationSummary } from "@/lib/v4/calc/types";
import { usePlanStore } from "@/store/v4/plan-store";

const INK = "#0a0a0a";
const GREEN = "#22863a";

const man = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  return abs >= 10000 ? `${sign}${(abs / 10000).toFixed(2)}億円` : `${sign}${abs.toLocaleString()}万円`;
};

// 税引き後の最終純資産（課税口座の含み益にかかる税を差し引く）
const afterTax = (r: SimulationSummary) => {
  const last = r.rows[r.rows.length - 1];
  return last ? last.nw - last.latentTax : 0;
};

// 取り崩し順序の設定と、その理由・効果の説明
export function DrawOrderEditor() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const auto = plan.drawOrder !== "custom";

  const cmp = useMemo(() => {
    const rec = simulate({ ...plan, drawOrder: "auto" });
    const nisaFirst = simulate({ ...plan, drawOrder: "custom", drawCustomOrder: ["nisa", "toku", "g", "k"] });
    const mine = auto ? rec : simulate(plan);
    const firstDraw = rec.rows.find((r) => r.draw > 0)?.age ?? null;
    return { rec: afterTax(rec), nisaFirst: afterTax(nisaFirst), mine: afterTax(mine), firstDraw };
  }, [plan, auto]);

  const move = (i: number, dir: -1 | 1) => {
    const order = [...plan.drawCustomOrder];
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setField("drawCustomOrder", order as DrawAsset[]);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">取り崩し順序（お金が足りない年に、何から売るか）</p>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { v: "auto" as const, label: "おすすめ", sub: "税金が少ない順・自動" },
          { v: "custom" as const, label: "自分で決める", sub: "順番を指定" },
        ].map((o) => {
          const active = (o.v === "auto") === auto;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => setField("drawOrder", o.v)}
              className="rounded-lg px-2 py-2 text-left"
              style={{ background: active ? INK : "#fff", color: active ? "#fff" : INK, border: `2px solid ${INK}` }}
            >
              <span className="block text-[12px] font-bold">{o.label}</span>
              <span className="block text-[10px] opacity-70">{o.sub}</span>
            </button>
          );
        })}
      </div>

      {auto ? (
        <ol className="flex flex-col gap-1.5 rounded-lg bg-white p-3" style={{ border: `1.5px solid ${INK}20` }}>
          {[
            {
              no: "0",
              title: "まず現金（預金）から",
              body: `毎年の不足はまず現金で払い、「現金保有下限額」（${man(plan.cashFloor)}）を下回りそうな年だけ、運用資産を売ります。`,
            },
            {
              no: "1",
              title: "特定口座・金・暗号資産：税金が少ないものから",
              body: "売ったときの税金は「利益の部分」だけにかかります。毎年、利益の割合が小さく税金が少なくて済むものを自動で選んで先に売ります。",
            },
            {
              no: "2",
              title: "NISA：最後まで残す",
              body: "売っても税金はゼロ。残しておけば非課税のまま増え続けるので、いちばん最後に使うのが有利です。",
            },
          ].map((s) => (
            <li key={s.no} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: INK }}>
                {s.no}
              </span>
              <span className="flex flex-col">
                <span className="text-[12px] font-bold">{s.title}</span>
                <span className="text-[11px] leading-relaxed text-[#0a0a0a]/70">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-lg p-2" style={{ background: "#f0f0ee", border: "1.5px solid #0a0a0a30" }}>
          <p className="px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/55">上から先に売る（現金のあと）</p>
          {plan.drawCustomOrder.map((code, i) => (
            <div key={code} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5" style={{ border: `2px solid ${INK}` }}>
              <span className="text-[9px] font-bold text-[#66666a]">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-xs font-bold">{DRAW_LABEL[code]}</span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md px-2 py-0.5 text-[10px] font-bold disabled:opacity-30" style={{ border: `2px solid ${INK}` }} aria-label="上へ">
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === plan.drawCustomOrder.length - 1}
                className="rounded-md px-2 py-0.5 text-[10px] font-bold disabled:opacity-30"
                style={{ border: `2px solid ${INK}` }}
                aria-label="下へ"
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#f0fff4", border: `1.5px solid ${GREEN}60` }}>
        <p className="font-bold" style={{ color: GREEN }}>
          {cmp.rec - cmp.nisaFirst >= 0
            ? `おすすめの順番だと、NISAを先に使う場合より税引き後の最終純資産が ${man(cmp.rec - cmp.nisaFirst)} 多くなります`
            : "このプランでは順番による差はほとんどありません"}
        </p>
        {!auto ? (
          <p className="mt-0.5 text-[#0a0a0a]/70">
            いまの順番（自分で決める）: 税引き後 {man(cmp.mine)}／おすすめ: {man(cmp.rec)}
          </p>
        ) : null}
        <p className="mt-0.5 text-[10px] text-[#0a0a0a]/55">
          {cmp.firstDraw !== null ? `取り崩しが始まるのは${cmp.firstDraw}歳ごろ。` : "このプランでは運用資産を取り崩す年はありません。"}
          税引き後＝特定口座などに残った利益にかかる税金（売ったら払う分）を差し引いた金額。相続しても取得価額は引き継がれるので、この税金は消えません。
        </p>
      </div>
      <p className="text-[10px] leading-relaxed text-[#0a0a0a]/50">
        入っていないもの: iDeCo・企業型DC（取り崩すのではなく、受取開始年齢に一時金か年金で受け取ります）、自宅・不動産（売却しない前提）、退職金（受け取り方は「収入」の勤務先ごとに選べます）。
      </p>
    </div>
  );
}
