"use client";

import { useDeferredValue, useMemo } from "react";
import { useRouter } from "next/navigation";

import { finOf, liteBase, liteResult } from "@/lib/lite/result";
import { LITE_ASSUMPTIONS as A } from "@/lib/lite/types";
import { useLiteStore } from "@/store/lite/lite-store";

import { GREEN, INK, RED, man } from "./controls";
import { LiteChart } from "./LiteChart";
import { sendToV4 } from "./sendToV4";

export function LiteResult() {
  // 入力中は前の結果を出したまま、計算が追いついたら差し替える（打つたびに固まらないように）
  const q = useDeferredValue(useLiteStore((s) => s.q));
  const router = useRouter();
  const ready = q.income > 0 && q.livingM > 0;
  const r = useMemo(() => (ready ? liteResult(q) : null), [q, ready]);

  if (!r) {
    return (
      <div className="rounded-2xl bg-white p-5" style={{ border: `2.5px solid ${INK}` }}>
        <p className="text-sm font-bold">年収と毎月の生活費を入れると、ここに結果が出ます</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#0a0a0a]/60">
          入れた数字は、このブラウザの中だけに保存されます。外には送られません。
        </p>
      </div>
    );
  }

  const ok = r.shortfallAge === null;
  const data = r.rows.map((row) => ({ age: row.age, fin: Math.round(finOf(row)) }));
  const goV4 = () => {
    if (sendToV4(useLiteStore.getState().q)) router.push("/v5/detail");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `2.5px solid ${ok ? GREEN : RED}` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">RESULT</p>
        <p className="mt-1 text-xl font-bold leading-snug sm:text-2xl" style={{ color: ok ? GREEN : RED }}>
          {ok
            ? `${A.endAge}歳まで、お金は足りる見込み`
            : r.final > 0
              ? `${r.shortfallAge}歳で、一時的にお金が足りなくなる見込み`
              : `${r.shortfallAge}歳で、お金が足りなくなる見込み`}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#0a0a0a]/60">
          金額はすべて「今の価値」です（物価が毎年{A.infl}%上がる分を割り戻した額）。家やローンは入れず、預金と投資だけを見ています。
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: `${Math.max(q.age, q.retireAge)}歳（働き終わる）のお金`, v: r.retire },
            { label: `${A.endAge}歳のお金`, v: r.final },
            { label: "いまの1年の収支", v: r.nowBalance, sub: "収入（手取り）−支出" },
          ].map((x) => (
            <div key={x.label} className="rounded-lg p-2.5" style={{ background: "#f0f0ee" }}>
              <p className="text-[10px] font-bold leading-tight text-[#0a0a0a]/55">{x.label}</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums sm:text-base" style={{ color: x.v < 0 ? RED : INK }}>
                {man(x.v)}
              </p>
              {x.sub ? <p className="text-[9px] text-[#0a0a0a]/45">{x.sub}</p> : null}
            </div>
          ))}
        </div>

        <div className="mt-3">
          <LiteChart data={data} retireAge={Math.max(q.age, q.retireAge)} />
        </div>

        {/* 次にやること: 足りない人は積立をあといくら、足りる人は生活費の余裕 */}
        <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: ok ? "#f0fff4" : "#fff1f1" }}>
          {ok ? (
            <p className="text-[13px] font-bold leading-snug">
              生活費をあと月{r.room !== null && r.room >= 50 ? "50万円以上" : `${r.room}万円`}ふやしても、{A.endAge}歳まで足りる計算です
            </p>
          ) : r.needMonthly !== null ? (
            <p className="text-[13px] font-bold leading-snug">
              {A.endAge}歳まで足りるには、毎月の積立をあと <span style={{ color: RED }}>{r.needMonthly}万円</span>（働き終わるまで）
            </p>
          ) : (
            <p className="text-[13px] font-bold leading-snug">積立をふやすだけでは届きません。生活費・働く年数・住まいを見直す必要があります</p>
          )}
          <p className="mt-0.5 text-[10px] text-[#0a0a0a]/55">
            {ok ? "急な出費や、物価・運用が思ったより悪いときの余裕の目安です" : "積立は利回り年4%の計算。生活費を減らす・長く働くと、必要な額は下がります"}
          </p>
        </div>
      </div>

      {/* 精度メーター: 任意の項目に答えるほど上がる */}
      <div className="rounded-2xl bg-white p-4" style={{ border: `2px solid ${INK}30` }}>
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold">精度の目安</p>
          <p className="text-lg font-bold tabular-nums">{r.accuracy.pct}%</p>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full" style={{ background: "#0a0a0a12" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${r.accuracy.pct}%`, background: r.accuracy.pct >= 90 ? GREEN : INK }} />
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#0a0a0a]/60">
          {r.accuracy.next
            ? `次は「${r.accuracy.next}」を入れると、いちばん精度が上がります（カード05・06）`
            : "Liteで入れられることは全部入っています。もっと細かくは詳細版で"}
        </p>
      </div>

      {r.tips.length > 0 ? (
        <div className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `2px solid ${INK}30` }}>
          <p className="text-sm font-bold">小さく変えると、どうなる？</p>
          <ul className="mt-2 flex flex-col">
            {r.tips.map((t) => {
              const better =
                r.shortfallAge !== null
                  ? t.shortfallAge === null
                    ? `${A.endAge}歳まで足りるようになる`
                    : t.shortfallAge > r.shortfallAge
                      ? `足りなくなるのが${t.shortfallAge - r.shortfallAge}年おそくなる（${t.shortfallAge}歳）`
                      : "足りなくなる年齢は変わらない"
                  : "";
              return (
                <li key={t.label} className="flex items-baseline justify-between gap-3 border-t py-2 text-[12px]" style={{ borderColor: "#0a0a0a12" }}>
                  <span className="font-bold">{t.label}</span>
                  <span className="text-right tabular-nums">
                    {better ? <span className="block font-bold" style={{ color: GREEN }}>{better}</span> : null}
                    <span className={better ? "text-[10px] text-[#0a0a0a]/55" : "font-bold"} style={better ? undefined : { color: GREEN }}>
                      {A.endAge}歳のお金 {t.gain >= 0 ? "+" : ""}
                      {man(t.gain)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* 詳細版（ver4）への入口（1行のバナー） */}
      <button
        type="button"
        onClick={goV4}
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left"
        style={{ background: INK, color: "#fff" }}
      >
        <span className="min-w-0">
          <span className="block text-[14px] font-bold">もっと詳しく調べたい方は「ライフプランシミュレーター 詳細版」へ</span>
          <span className="block text-[11px] text-white/65">この入力のまま、保険・教育の進路・もしもの備えまで</span>
        </span>
        <span className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold" style={{ background: "#fff", color: INK }}>
          開く →
        </span>
      </button>

      <details className="rounded-2xl bg-white p-4 text-[11px] leading-relaxed text-[#0a0a0a]/70" style={{ border: `2px solid ${INK}18` }}>
        <summary className="cursor-pointer text-[12px] font-bold text-[#0a0a0a]">この計算で置いている前提</summary>
        <ul className="mt-2 flex flex-col gap-1">
          <li>・物価は毎年{A.infl}%、給料も同じだけ上がる（昇給{A.raise}%）。生活費・家賃も物価に合わせて上がり、働き終わったあとも同じ暮らしを続ける</li>
          <li>・投資の利回りは年{A.investR}%。投資はすべて新NISAにあるとみなす。預金が200万円を切ったら投資を取り崩す</li>
          <li>・年金は、ねんきん定期便の額を入れなければ、会社員は22歳から働き終わるまで厚生年金に入っていたとして今の年収から見積もる。自営業は国民年金を満額。もらい始める年齢で増減（繰上げ1か月0.4%減・繰下げ1か月0.7%増）</li>
          <li>・税金・社会保険料・児童手当は2026年10月時点の制度で計算</li>
          <li>・教育費は文部科学省などの調査をもとにした目安（塾代を含む）。大学まで進学</li>
          <li>・住宅ローンの金利は{A.loanRate}%。これから買う家は値段から頭金を引いた残りを{A.buyLoanYears}年ローン、諸費用は値段の{A.buyCostRate}%。住宅ローン控除は入れていない</li>
          <li>・持ち家は固定資産税を年{A.homeTaxY}万円、維持費をマンション月{A.upkeepMansionM}万円・戸建て月{A.upkeepHouseM}万円</li>
          <li>・iDeCo・企業型DCは自分で出す掛金だけを入れ、65歳で一時金として受け取る</li>
          <li>・{A.endAge}歳まで生きる前提。病気・介護・相続などの大きな出来事は入れていない</li>
        </ul>
        <p className="mt-2">計算は詳細版と同じエンジンです。結果は概算で、将来を保証するものではありません。</p>
      </details>
    </div>
  );
}

// スマホ用: 画面の下に結果をいつも小さく出す（押すと結果の位置へ）
export function LiteBar() {
  const q = useDeferredValue(useLiteStore((s) => s.q));
  const ready = q.income > 0 && q.livingM > 0;
  const r = useMemo(() => (ready ? liteBase(q) : null), [q, ready]);
  const ok = r?.shortfallAge === null;
  return (
    <button
      type="button"
      onClick={() => document.getElementById("lite-result")?.scrollIntoView({ behavior: "smooth" })}
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 px-4 py-3 text-left lg:hidden"
      style={{ background: INK, color: "#fff", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <span className="text-[13px] font-bold" style={{ color: !r ? "#fff" : ok ? "#7ee2a0" : "#ff9b9b" }}>
        {!r ? "年収と生活費を入れると結果が出ます" : ok ? `${A.endAge}歳まで足りる見込み` : `${r.shortfallAge}歳で足りなくなる見込み`}
      </span>
      {r ? <span className="shrink-0 text-[11px] font-bold text-white/70">{A.endAge}歳のお金 {man(r.final)} ↓</span> : null}
    </button>
  );
}
