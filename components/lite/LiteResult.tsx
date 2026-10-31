"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { finOf, liteBase, liteMonteCarlo, liteResult } from "@/lib/lite/result";
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
          「足りなくなる」は、預金と、売って使える投資が尽きる年です。金額はすべて「今の価値」です（物価が毎年{A.infl}%上がる分を割り戻した額）。家やローンは入れず、預金と投資だけを見ています。
          {!ok && (r.rows.find((row) => row.age === r.shortfallAge)?.ass.dc ?? 0) > 0
            ? " グラフにはiDeCo・企業型DCも入っていますが、受け取る年齢（65歳）まで引き出せないため、グラフが0より上でも足りなくなることがあります。"
            : ""}
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
          <LiteChart data={data} retireAge={Math.max(q.age, q.retireAge)} events={r.events} />
        </div>
        {r.events.length ? (
          <ol className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[11px] text-[#0a0a0a]/70 sm:grid-cols-2">
            {r.events.map((e, i) => (
              <li key={e.age} className="flex gap-1.5">
                <span className="w-4 shrink-0 text-right font-bold text-[#0a0a0a]">{i + 1}</span>
                <span className="tabular-nums">{e.age}歳</span>
                <span className="min-w-0">{e.label}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {/* 次にやること: 足りない人は積立をあといくら、足りる人は生活費の余裕 */}
        <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: ok ? "#f0fff4" : "#fff1f1" }}>
          {ok ? (
            <p className="text-[13px] font-bold leading-snug">
              生活費をあと月{r.room !== null && r.room >= 50 ? "50万円以上" : `${r.room}万円`}ふやしても、{A.endAge}歳まで足りる計算です
            </p>
          ) : r.needMonthly !== null ? (
            <p className="text-[13px] font-bold leading-snug">
              毎月の積立が働き終わるまで <span style={{ color: RED }}>{r.needMonthly}万円</span> 多い場合に、{A.endAge}歳まで足りる計算です
            </p>
          ) : (
            <p className="text-[13px] font-bold leading-snug">積立の額を変えるだけでは、{A.endAge}歳まで足りる計算になりません。生活費・働く年数・住まいの条件でも変わります</p>
          )}
          <p className="mt-0.5 text-[10px] text-[#0a0a0a]/55">
            {ok ? "急な出費や、物価・運用が思ったより悪いときの余裕の目安です" : "積立は利回り年4%の計算。生活費や働く年数の条件によっても、この額は変わります。どうするのがよいかをすすめるものではありません"}
          </p>
        </div>
      </div>

      {/* 一生で動かすお金の総額（ここでしか見られない「発見」） */}
      <div className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `2.5px solid ${INK}` }}>
        <p className="text-sm font-bold">あなたが一生で動かすお金</p>
        <p className="mt-0.5 text-[11px] text-[#0a0a0a]/60">今から{A.endAge}歳までの合計（今の価値）。毎年の計算を足し上げた数字です</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "手取りの収入", v: r.lifetime.income, sub: "給与・年金・退職金など" },
            { label: "税金と社会保険料", v: r.lifetime.tax, sub: "所得税・住民税・年金・健康保険など（消費税は除く）", red: true },
            { label: "受け取る年金", v: r.lifetime.pension, sub: "手取り" },
            { label: "暮らしのお金", v: r.lifetime.living, sub: "生活費（住まい・教育を除く）" },
            { label: "住まいのお金", v: r.lifetime.home, sub: "家賃・ローン・税・維持費" },
            ...(r.lifetime.edu > 0 ? [{ label: "教育費", v: r.lifetime.edu, sub: "幼稚園〜大学・塾" }] : []),
          ].map((x) => (
            <div key={x.label} className="rounded-lg p-2.5" style={{ background: "#f0f0ee" }}>
              <p className="text-[10px] font-bold leading-tight text-[#0a0a0a]/55">{x.label}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums" style={{ color: x.red ? RED : INK }}>
                {man(x.v)}
              </p>
              <p className="text-[9px] leading-tight text-[#0a0a0a]/45">{x.sub}</p>
            </div>
          ))}
        </div>
        {r.lifetime.tax > 0 && r.lifetime.pension > 0 ? (
          <p className="mt-2.5 text-[12px] font-bold leading-relaxed">
            {r.lifetime.tax >= r.lifetime.pension
              ? `一生で払う税金と社会保険料は、受け取る年金の約${(r.lifetime.tax / r.lifetime.pension).toFixed(1)}倍です`
              : `受け取る年金は、一生で払う税金と社会保険料の約${(r.lifetime.pension / r.lifetime.tax).toFixed(1)}倍です`}
          </p>
        ) : null}
      </div>

      {/* 詳細版でわかることを、その人の数字で予告する */}
      <Teasers teasers={r.teasers} onMore={goV4} />

      {/* 精度メーター: 任意の項目に答えるほど上がる */}
      <div className="rounded-2xl bg-white p-4" style={{ border: `2px solid ${INK}30` }}>
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold">入力の充実度</p>
          <p className="text-lg font-bold tabular-nums">{r.accuracy.pct}%</p>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full" style={{ background: "#0a0a0a12" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${r.accuracy.pct}%`, background: r.accuracy.pct >= 90 ? GREEN : INK }} />
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#0a0a0a]/60">
          {r.accuracy.next
            ? `次は「${r.accuracy.next}」を入れると、試算にあなたの事情がより多く入ります（カード05・06）`
            : "Liteで入れられることは全部入っています。もっと細かくは詳細版で"}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[#0a0a0a]/45">どれだけ答えたかの目安です。計算が正しい度合いではありません（計算の前提や省略は、下の「この計算で置いている前提」に）</p>
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

      {/* 詳細版への入口（1行のバナー） */}
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

// 詳細版でわかること。Liteの入力から出した本物の数字を1つずつ見せ、続きは詳細版へ
function Teasers({ teasers, onMore }: { teasers: { key: string; title: string; value: string; note: string; more: string }[]; onMore: () => void }) {
  const q = useDeferredValue(useLiteStore((s) => s.q));
  // 運用の振れ幅（1,000通り）は重いので、押したときだけ計算する
  const [mc, setMc] = useState<{ key: string; rate: number; worst: number | null } | null>(null);
  const qKey = JSON.stringify(q);
  const mcNow = mc && mc.key === qKey ? mc : null;
  return (
    <div className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `2.5px solid ${INK}` }}>
      <p className="text-sm font-bold">詳細版でわかること（あなたの数字で）</p>
      <p className="mt-0.5 text-[11px] text-[#0a0a0a]/60">Liteの答えから出した概算です。詳細版で条件を足すと、ここから先まで確かめられます</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {teasers.map((t) => (
          <li key={t.key} className="rounded-lg p-3" style={{ background: "#f7f7f5", border: `1px solid ${INK}15` }}>
            <p className="text-[11px] font-bold text-[#0a0a0a]/60">{t.title}</p>
            <p className="mt-0.5 text-[14px] font-bold leading-snug">{t.value}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#0a0a0a]/50">{t.note}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed">
              <span className="font-bold">詳細版では：</span>
              {t.more}
            </p>
          </li>
        ))}
        <li className="rounded-lg p-3" style={{ background: "#f7f7f5", border: `1px solid ${INK}15` }}>
          <p className="text-[11px] font-bold text-[#0a0a0a]/60">運用が毎年上がったり下がったりしたら</p>
          {mcNow ? (
            <p className="mt-0.5 text-[14px] font-bold leading-snug">
              設定した運用条件で1,000通りの試算をした結果、{mcNow.rate}%で{A.endAge}歳までお金が残りました
              {mcNow.worst !== null ? `（悪いほうから1割の場合は${mcNow.worst}歳で足りなくなる）` : ""}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setMc({ key: qKey, ...liteMonteCarlo(q) })}
              className="mt-1 rounded-lg px-3 py-1.5 text-[12px] font-bold"
              style={{ border: `2px solid ${INK}` }}
            >
              1,000通り計算してみる
            </button>
          )}
          <p className="mt-1 text-[10px] leading-relaxed text-[#0a0a0a]/50">利回り4%が、毎年±12%前後で上下する場合（株式5〜6割の運用の目安）。物価・金利は固定。実際の将来の確率を示すものではありません</p>
          <p className="mt-1.5 text-[11px] leading-relaxed">
            <span className="font-bold">詳細版では：</span>
            値動きの大きさ（安定・バランス・積極）や口座ごとの利回りを変えて、帯グラフで見られます
          </p>
        </li>
      </ul>
      <button type="button" onClick={onMore} className="mt-3 w-full rounded-lg px-4 py-2.5 text-[13px] font-bold text-white" style={{ background: INK }}>
        この答えのまま、詳細版で続きを見る →
      </button>
    </div>
  );
}
