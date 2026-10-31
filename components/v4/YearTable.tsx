"use client";

import { useMemo, useState } from "react";

import { useIsNarrow } from "@/components/v4/useIsNarrow";
import { ageOn, parseYMD } from "@/lib/v4/calc/age";
import { deflator } from "@/lib/v4/calc/realValue";
import type { LifeEvent, PlanInput, YearlyResult } from "@/lib/v4/calc/types";
import { useUiStore } from "@/store/v4/ui-store";

// ver5 の「年次サマリー」の表。
// 1年1行で「収支（入ったお金・出たお金）」「運用（積み立てた・増えた・売った）」「年末の残高」を並べる。
// PC は11列、スマホ（640px未満）は 年齢・年間収支・運用益・金融資産合計 の4列に絞る（「すべての列」で全部も見られる）。
// 見た目は frame.ts のルールどおり: 黒い太線・黒のベタ塗りは使わない。区切りは薄い線、イベントの年だけ薄い地色。

const INK = "#0a0a0a";
const MINUS = "#cf7a4a"; // マイナスの数字（朱）
const SHORT_BG = "#fbefe8"; // 足りなくなる年の地色（朱を白に薄く混ぜた色）
const SOFT_LINE = "1px solid rgba(10,10,10,0.07)";
const GROUP_LINE = "1px solid rgba(10,10,10,0.14)";

// 表の1行に出す値（すべて円。表示の直前で万円に丸める）
export interface YearRow {
  age: number;
  spouseAge: number | null;
  year: number;
  income: number; // 収入（手取り。給与・年金・不動産・相続などの合計）
  exp: number; // 支出（生活費・住居・教育・保険・介護・一時支出・その他ローンの合計）
  inv: number; // 積立（NISA・特定口座・暗号資産・金・iDeCo本人掛金）
  cf: number; // 年間収支 = 収入 − 支出 − 積立（現金がどれだけ増減したか。取り崩し前）
  gain: number; // 運用益（その年に運用で増えた分）
  draw: number; // 取り崩し（運用資産を売って現金にした手取り額）
  cash: number; // 現金（預金）の年末残高
  invBal: number; // 運用資産 = NISA＋特定口座＋DC＋暗号資産＋金
  fin: number; // 金融資産合計 = 現金＋運用資産（「いまの試算」の判定と同じ「預金と投資」。家・不動産は入れない）
  loan: number; // ローン残高（住宅・不動産・その他ローンの合計）
  event: string | null; // その年のできごと（グラフの印と同じ）
  short: boolean; // 足りなくなる年（現金がはじめてマイナスになる年）
}

// 運用益の計算（YearlyResult に直接ないので、前年の行との差から出す）
//
//   NISA・特定口座・暗号資産・金（売ることのある口座）:
//     年末残高 = (年初残高 ＋ 積立) × (1 ＋ 利回り) − 売った額（税引き前）
//     → 運用益 = 年末残高 − 年初残高 − 積立 ＋ 売った額（税引き前）
//       年初残高 = 前年の行の年末残高（1年目は入力した今の残高）
//       積立     = inv − dcContribSelf（inv は iDeCo本人掛金を含むので除く）
//       売った額 = draw（手取り）＋ saleTax（売却益にかかった税）
//   DC（iDeCo・企業型DC）:
//     会社掛金が行に入っていないので差では出せない。DCは売らない口座で、
//     年末残高 = (年初残高 − 受取 ＋ 掛金) × (1 ＋ dcR) と1年分まとめて運用されるため、
//     → 運用益 = 年末残高 × dcR ÷ (1 ＋ dcR)
//   現金の利息は運用益に入れない（預金の増減は年間収支の側で見る）
//
//   「今の価値」表示のときは各行が自分の年の物価で割り戻されているので、
//   前年の残高を今年の物価に直してから差を取る（前年の割戻し率 ÷ 今年の割戻し率 を掛ける）
export function buildYearRows(
  rows: YearlyResult[],
  plan: PlanInput,
  real: boolean,
  lifeEvents: LifeEvent[],
  shortfallAge: number | null,
): YearRow[] {
  const spouseNow = ageOn(plan.spouseBirth, plan.baseDate);
  const baseYear = (parseYMD(plan.baseDate) ?? new Date()).getFullYear();
  const events = new Map(lifeEvents.map((e) => [e.age, e.label]));
  const dcR = plan.dcR / 100;
  const df = (age: number) => (real ? deflator(plan, age) : 1);

  return rows.map((r, i) => {
    const a = r.ass;
    const tradable = a.nisa + a.toku + a.k + a.g;
    const prev = i > 0 ? rows[i - 1] : null;
    const startTradable = prev
      ? (prev.ass.nisa + prev.ass.toku + prev.ass.k + prev.ass.g) * (df(prev.age) / df(r.age))
      : (plan.nisaBal + plan.tokuBal + plan.cryptoBal + plan.goldBal) / df(r.age);
    const tradableIn = r.inv - r.dcContribSelf;
    const tradableGain = tradable - startTradable - tradableIn + r.draw + r.saleTax;
    const dcGain = 1 + dcR > 0 ? (a.dc * dcR) / (1 + dcR) : 0;

    const invBal = tradable + a.dc;
    const fin = a.c + invBal;
    const t = r.age - plan.curAge;
    const evs: string[] = [];
    const ev = events.get(r.age);
    if (ev) evs.push(ev);
    const short = shortfallAge !== null && r.age === shortfallAge;
    if (short) evs.push("お金が足りなくなる");

    return {
      age: r.age,
      spouseAge: spouseNow === null ? null : spouseNow + t,
      year: baseYear + t,
      income: r.income,
      exp: r.exp,
      inv: r.inv,
      cf: r.cf,
      gain: tradableGain + dcGain,
      draw: r.draw,
      cash: a.c,
      invBal,
      fin,
      // 金融純資産 nw = 金融資産合計 − ローン残高（住宅・不動産・その他）なので、差がローン残高
      loan: Math.max(0, fin - r.nw),
      event: evs.length ? evs.join("・") : null,
      short,
    };
  });
}

// 円 → 万円（整数・桁区切り）。0に丸まるものは0
const manOf = (yen: number) => Math.round(yen / 10_000);
function Num({ yen, signed = false, dim0 = false, bold = false }: { yen: number; signed?: boolean; dim0?: boolean; bold?: boolean }) {
  const m = manOf(yen);
  if (m === 0) {
    return <span style={{ color: dim0 ? "rgba(10,10,10,0.25)" : INK }}>{dim0 ? "–" : "0"}</span>;
  }
  const neg = m < 0;
  const text = `${neg ? "−" : signed ? "+" : ""}${Math.abs(m).toLocaleString()}`;
  return <span style={{ color: neg ? MINUS : INK, fontWeight: bold ? 700 : 500 }}>{text}</span>;
}

type ColKey = "income" | "exp" | "inv" | "cf" | "gain" | "draw" | "cash" | "invBal" | "fin" | "loan";
interface Col {
  key: ColKey;
  label: string;
  group: "flow" | "run" | "bal";
  signed?: boolean; // プラスにも「+」を付ける（増減を表す列）
  dim0?: boolean; // 0は「–」で薄く（ない年が多い列）
  bold?: boolean;
  narrow?: boolean; // スマホでも出す列
}
const COLS: Col[] = [
  { key: "income", label: "収入", group: "flow" },
  { key: "exp", label: "支出", group: "flow" },
  { key: "inv", label: "積立", group: "flow", dim0: true },
  { key: "cf", label: "年間収支", group: "flow", signed: true, bold: true, narrow: true },
  { key: "gain", label: "運用益", group: "run", signed: true, narrow: true },
  { key: "draw", label: "取り崩し", group: "run", dim0: true },
  { key: "cash", label: "現金", group: "bal" },
  { key: "invBal", label: "運用資産", group: "bal" },
  { key: "fin", label: "金融資産", group: "bal", bold: true, narrow: true },
  { key: "loan", label: "ローン", group: "bal", dim0: true },
];
const GROUP_LABEL = { flow: "収支", run: "運用", bal: "年末の残高" } as const;

export function YearTable({
  rows,
  plan,
  lifeEvents,
  shortfallAge,
}: {
  rows: YearlyResult[];
  plan: PlanInput;
  lifeEvents: LifeEvent[];
  shortfallAge: number | null;
}) {
  const real = useUiStore((s) => s.realValue);
  const narrow = useIsNarrow();
  const [showAll, setShowAll] = useState(false);
  const data = useMemo(
    () => buildYearRows(rows, plan, real, lifeEvents, shortfallAge),
    [rows, plan, real, lifeEvents, shortfallAge],
  );
  const cols = narrow && !showAll ? COLS.filter((c) => c.narrow) : COLS;
  const hasSpouse = data.some((d) => d.spouseAge !== null);

  // グループ見出し（収支・運用・年末の残高）の幅
  const groups: { g: Col["group"]; span: number }[] = [];
  for (const c of cols) {
    const last = groups[groups.length - 1];
    if (last && last.g === c.group) last.span += 1;
    else groups.push({ g: c.group, span: 1 });
  }
  // グループの切れ目に少し濃い線
  const groupStart = (i: number) => i > 0 && cols[i - 1].group !== cols[i].group;

  const th: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: "rgba(10,10,10,0.6)",
    padding: "4px 6px",
    textAlign: "right",
    whiteSpace: "nowrap",
    background: "#ffffff",
  };
  const td: React.CSSProperties = {
    fontSize: 11,
    padding: "4px 6px",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4">
        <p className="text-[11px] text-[#0a0a0a]/60">
          単位は万円・{real ? "今の価値" : "名目（その年の金額）"}
        </p>
        {narrow ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="rounded-md px-2 py-1 text-[11px] font-bold"
            style={{ border: `1.5px solid ${INK}`, background: "#ffffff", color: INK }}
          >
            {showAll ? "4列にもどす" : "すべての列を見る"}
          </button>
        ) : null}
      </div>

      <div className="overflow-auto" style={{ maxHeight: 480, borderTop: SOFT_LINE, borderBottom: SOFT_LINE }}>
        <table className="w-full border-collapse" style={{ minWidth: cols.length > 4 ? 640 : undefined }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "#ffffff" }}>
            <tr>
              <th style={{ ...th, position: "sticky", left: 0, zIndex: 3 }} />
              {groups.map((g, i) => (
                <th
                  key={g.g}
                  colSpan={g.span}
                  style={{
                    ...th,
                    textAlign: "center",
                    color: "rgba(10,10,10,0.45)",
                    paddingBottom: 0,
                    borderLeft: i > 0 ? GROUP_LINE : undefined,
                  }}
                >
                  {GROUP_LABEL[g.g]}
                </th>
              ))}
            </tr>
            <tr style={{ boxShadow: `inset 0 -1px 0 rgba(10,10,10,0.14)` }}>
              <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, zIndex: 3 }}>
                年齢{hasSpouse ? "（配偶者）" : ""}
              </th>
              {cols.map((c, i) => (
                <th key={c.key} style={{ ...th, borderLeft: groupStart(i) ? GROUP_LINE : undefined }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => {
              // 横にスクロールしても下が透けないよう、左端の固定列と同じ不透明な色にする
              const bg = d.short ? SHORT_BG : d.event ? "var(--lp-primary-soft)" : "#ffffff";
              return (
                <tr key={d.age} style={{ background: bg, borderTop: SOFT_LINE }}>
                  {/* 年齢（本人・配偶者）と西暦。イベントの年は印と内容を添える */}
                  <td
                    style={{
                      ...td,
                      textAlign: "left",
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      background: bg,
                      whiteSpace: "normal",
                      minWidth: 72,
                    }}
                  >
                    <span className="font-bold text-[#0a0a0a]">
                      {d.event ? (
                        <span aria-hidden className="mr-0.5" style={{ color: d.short ? MINUS : "var(--lp-primary)" }}>
                          {d.short ? "●" : "○"}
                        </span>
                      ) : null}
                      {d.age}歳
                    </span>
                    {d.spouseAge !== null ? (
                      <span className="ml-1 text-[10px] text-[#0a0a0a]/50">({d.spouseAge})</span>
                    ) : null}
                    <span className="block text-[9px] leading-tight text-[#0a0a0a]/45">{d.year}年</span>
                    {d.event ? (
                      <span
                        className="block max-w-[8.5em] text-[9px] font-bold leading-tight"
                        style={{ color: d.short ? MINUS : "var(--lp-primary)" }}
                      >
                        {d.event}
                      </span>
                    ) : null}
                  </td>
                  {cols.map((c, i) => (
                    <td key={c.key} style={{ ...td, borderLeft: groupStart(i) ? GROUP_LINE : undefined }}>
                      <Num yen={d[c.key]} signed={c.signed} dim0={c.dim0} bold={c.bold} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 列の意味（短く） */}
      <ul className="flex flex-col gap-0.5 px-4 pb-3 text-[10px] leading-relaxed text-[#0a0a0a]/55">
        <li>年間収支 ＝ 収入（手取り）− 支出 − 積立。マイナスの年は、預金か運用資産の取り崩しで埋めます</li>
        <li>運用益 ＝ その年に運用で増えた分（年初から年末の増減から、積立と取り崩しを除いたもの。預金の利息は入れない）</li>
        <li>運用資産 ＝ NISA・特定口座・iDeCo/DC・暗号資産・金。金融資産 ＝ 現金＋運用資産（家・不動産は入れない）</li>
        <li>ローン ＝ 住宅・不動産・その他ローンの残り</li>
      </ul>
    </div>
  );
}
