"use client";

import { useMemo, useState } from "react";

import { useIsNarrow } from "@/components/v4/useIsNarrow";
import { ageOn, parseYMD } from "@/lib/v4/calc/age";
import { deflator } from "@/lib/v4/calc/realValue";
import type { LifeEvent, PlanInput, YearlyResult } from "@/lib/v4/calc/types";
import { useUiStore } from "@/store/v4/ui-store";

// ver5 の「年次サマリー」の表。
// 1年1行で「収入（手取り）」「支出」「積立」「年間収支」「運用益」「年末の残高」を並べる。
// 列は14列まで（ver5.20〜）: A4縦（印刷幅190mm）に7.5ptで収まる上限。年齢の列のほかに、数字の列は1列46px前後要る。
//   収入（手取り）: 収入計・給与・年金・その他
//   支出:          支出計・生活費・住まい・教育・その他
//   積立・年間収支・運用益・金融資産・ローン残高
// 内訳は「家計簿の大きな費目」の粒度にそろえ、内訳を足すと合計になるようにしている（その他＝合計−ほかの内訳）。
// 「合計だけ」にすると内訳を隠す。スマホ（640px未満）は 年齢・年間収支・運用益・金融資産 の4列から始める。
// 見た目は frame.ts のルールどおり: 黒い太線・黒のベタ塗りは使わない。区切りは薄い線、イベントの年だけ薄い地色。

const INK = "#0a0a0a";
const MINUS = "#cf7a4a"; // マイナスの数字（朱）
const SHORT_BG = "#fbefe8"; // 足りなくなる年の地色（朱を白に薄く混ぜた色）
const SOFT_LINE = "1px solid rgba(10,10,10,0.07)";
const GROUP_LINE = "1px solid rgba(10,10,10,0.14)";

// 表の1行に出す値（すべて円。表示の直前で万円に丸める）
//   収入（手取り）= 給与 ＋ 年金 ＋ その他
//     給与・年金は、税・社会保険料（給与・年金にかかる分）を額面の割合で按分して引いた手取り
//     その他 = 収入 − 給与 − 年金（退職金・DC一時金の手取り、児童手当、不動産の手残り、臨時収入、保険金・遺族年金）
//     給与も年金もない年の税・社会保険料（国保の均等割など）は、その他から引く
//   支出 = 生活費（生活費＋特別費）＋ 住まい（家賃・管理費・固定資産税＋住宅ローン）＋ 教育（学費＋塾）＋ その他（保険料・介護・一時支出・他のローン）
export interface YearRow {
  age: number;
  spouseAge: number | null;
  year: number;
  income: number;
  wage: number;
  pension: number;
  incOther: number;
  exp: number;
  living: number;
  housing: number;
  edu: number;
  expOther: number;
  inv: number; // 積立（NISA・特定口座・iDeCo本人掛金・暗号資産・金）
  cf: number; // 年間収支 = 収入 − 支出 − 積立（現金がどれだけ増減したか。取り崩し前）
  gain: number; // 運用益（その年に運用で増えた分）
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

    const fin = a.c + tradable + a.dc;
    const t = r.age - plan.curAge;
    const evs: string[] = [];
    const ev = events.get(r.age);
    if (ev) evs.push(ev);
    const short = shortfallAge !== null && r.age === shortfallAge;
    if (short) evs.push("お金が足りなくなる");

    // 給与・年金にかかった税・社会保険料を、額面の割合で按分する
    const wageGross = r.wageSelf + r.wageSpouse + r.sideInc;
    const penGross = r.pubPen + r.corpPen;
    const ordinary = wageGross + penGross;
    const keep = ordinary > 0 ? 1 - Math.min(1, r.taxWage / ordinary) : 1;
    const wage = wageGross * keep;
    const pension = penGross * keep;
    const living = r.basicL + r.special;
    const housing = r.homeRent + r.homeTax + r.homePay;
    const edu = r.eduT + r.eduJ;
    return {
      age: r.age,
      spouseAge: spouseNow === null ? null : spouseNow + t,
      year: baseYear + t,
      income: r.income,
      wage,
      pension,
      incOther: r.income - wage - pension,
      exp: r.exp,
      living,
      housing,
      edu,
      expOther: r.exp - living - housing - edu,
      inv: r.inv,
      cf: r.cf,
      gain: tradableGain + dcGain,
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
function Num({ yen, signed = false, minus = false, dim0 = false, bold = false, sub = false }: { yen: number; signed?: boolean; minus?: boolean; dim0?: boolean; bold?: boolean; sub?: boolean }) {
  const m = manOf(yen);
  if (m === 0) {
    return <span style={{ color: dim0 ? "rgba(10,10,10,0.25)" : INK }}>{dim0 ? "–" : "0"}</span>;
  }
  // minus: 引かれる額（税・社保）。マイナスの色にはせず「−」だけ付ける
  const neg = !minus && m < 0;
  const text = `${minus || neg ? "−" : signed ? "+" : ""}${Math.abs(m).toLocaleString()}`;
  return <span style={{ color: neg ? MINUS : sub ? "rgba(10,10,10,0.72)" : INK, fontWeight: bold ? 700 : 500 }}>{text}</span>;
}

type ColKey = Exclude<keyof YearRow, "age" | "spouseAge" | "year" | "event" | "short">;
type Group = "income" | "exp" | "inv" | "cf" | "run" | "bal";
interface Col {
  key: ColKey;
  label: string; // 印刷で列幅が増えないよう4文字まで
  group: Group;
  total?: boolean; // 合計（太字。「合計だけ」でも出す）
  signed?: boolean; // プラスにも「+」を付ける（増減を表す列）
  minus?: boolean; // 引かれる額（「−」を付ける）
  narrow?: boolean; // スマホでも出す列
}
const COLS: Col[] = [
  { key: "income", label: "収入計", group: "income", total: true },
  { key: "wage", label: "給与", group: "income" },
  { key: "pension", label: "年金", group: "income" },
  { key: "incOther", label: "その他", group: "income" },
  { key: "exp", label: "支出計", group: "exp", total: true },
  { key: "living", label: "生活費", group: "exp" },
  { key: "housing", label: "住まい", group: "exp" },
  { key: "edu", label: "教育", group: "exp" },
  { key: "expOther", label: "その他", group: "exp" },
  { key: "inv", label: "積立", group: "inv", total: true },
  { key: "cf", label: "年間収支", group: "cf", total: true, signed: true, narrow: true },
  { key: "gain", label: "運用益", group: "run", total: true, signed: true, narrow: true },
  { key: "fin", label: "金融資産", group: "bal", total: true, narrow: true },
  { key: "loan", label: "ローン", group: "bal", total: true, minus: true },
];
const GROUP_LABEL: Record<Group, string> = {
  income: "収入（手取り）",
  exp: "支出",
  inv: "",
  cf: "",
  run: "",
  bal: "年末の残高",
};

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
  const [detail, setDetail] = useState(true);
  const data = useMemo(
    () => buildYearRows(rows, plan, real, lifeEvents, shortfallAge),
    [rows, plan, real, lifeEvents, shortfallAge],
  );
  // 列はいつも同じ（0の年ばかりの列も残して、表の形をそろえる）
  const cols = narrow && !showAll ? COLS.filter((c) => c.narrow) : COLS.filter((c) => c.total || detail);
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
        {narrow && !showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-md px-2 py-1 text-[11px] font-bold"
            style={{ border: `1.5px solid ${INK}`, background: "#ffffff", color: INK }}
          >
            すべての列を見る
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* 合計だけ／内訳まで の切り替え */}
            <div className="grid grid-cols-2 overflow-hidden text-[11px] font-bold" style={{ border: `1.5px solid ${INK}`, borderRadius: 8 }}>
              {[
                { v: false, label: "合計だけ" },
                { v: true, label: "内訳まで" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setDetail(o.v)}
                  aria-pressed={detail === o.v}
                  className="px-2.5 py-1"
                  style={{ background: detail === o.v ? "var(--lp-primary)" : "#ffffff", color: detail === o.v ? "#ffffff" : INK }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {narrow ? (
              <button type="button" onClick={() => setShowAll(false)} className="text-[11px] font-bold underline underline-offset-4">
                4列にもどす
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="overflow-auto" style={{ maxHeight: 480, borderTop: SOFT_LINE, borderBottom: SOFT_LINE }}>
        <table className="w-full border-collapse" style={{ minWidth: cols.length > 4 ? Math.max(640, 72 + cols.length * 62) : undefined }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "#ffffff" }}>
            <tr>
              <th style={{ ...th, position: "sticky", left: 0, zIndex: 3 }} />
              {groups.map((g, i) => (
                <th
                  key={g.g}
                  colSpan={g.span}
                  style={{
                    ...th,
                    // 横に長いグループでも見出しが見えるよう、左に寄せる
                    textAlign: "left",
                    color: "rgba(10,10,10,0.55)",
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
                <th
                  key={c.key}
                  style={{
                    ...th,
                    borderLeft: groupStart(i) ? GROUP_LINE : undefined,
                    color: c.total ? INK : "rgba(10,10,10,0.55)",
                    fontWeight: c.total ? 700 : 600,
                  }}
                >
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
                      <Num yen={d[c.key]} signed={c.signed} minus={c.minus} dim0={!c.total || c.key === "loan" || c.key === "inv"} bold={c.total} sub={!c.total} />
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
        <li>収入（手取り）: 給与・年金は税・社会保険料を引いた手取り。その他 ＝ 退職金・DC一時金（手取り）、児童手当、不動産の手残り、臨時収入、保険金など</li>
        <li>支出: 生活費 ＝ 毎月の生活費＋特別費、住まい ＝ 家賃・管理費・固定資産税＋住宅ローン、教育 ＝ 学費＋塾・習い事、その他 ＝ 保険料・介護・一時支出・車などのローン</li>
        <li>年間収支 ＝ 収入（手取り）− 支出 − 積立。マイナスの年は、預金か運用資産の取り崩しで埋めます</li>
        <li>運用益 ＝ その年に運用で増えた分（年初から年末の増減から、積立と取り崩しを除いたもの。預金の利息は入れない）</li>
        <li>金融資産 ＝ 現金＋NISA・特定口座・iDeCo/DC・暗号資産・金（家・不動産は入れない）。ローン ＝ 住宅・不動産・その他ローンの残り</li>
      </ul>
    </div>
  );
}
