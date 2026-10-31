"use client";

import { useMemo, useState } from "react";

import { useIsNarrow } from "@/components/v4/useIsNarrow";
import { ageOn, parseYMD } from "@/lib/v4/calc/age";
import { deflator } from "@/lib/v4/calc/realValue";
import type { LifeEvent, PlanInput, YearlyResult } from "@/lib/v4/calc/types";
import { useUiStore } from "@/store/v4/ui-store";

// ver5 の「年次サマリー」の表。
// 1年1行で「収入（手取り）」「支出」「積立」「年間収支」「運用」「年末の残高」を、内訳まで並べる（ver5.20〜）。
// 各グループは合計の列を先頭に太字で、続けて内訳を少し薄い字で出す。どの年も0の内訳の列は出さない。
// 「合計だけ」にすると内訳を隠す。スマホ（640px未満）は 年齢・年間収支・運用益・金融資産 の4列から始める。
// 見た目は frame.ts のルールどおり: 黒い太線・黒のベタ塗りは使わない。区切りは薄い線、イベントの年だけ薄い地色。

const INK = "#0a0a0a";
const MINUS = "#cf7a4a"; // マイナスの数字（朱）
const SHORT_BG = "#fbefe8"; // 足りなくなる年の地色（朱を白に薄く混ぜた色）
const SOFT_LINE = "1px solid rgba(10,10,10,0.07)";
const GROUP_LINE = "1px solid rgba(10,10,10,0.14)";

// 表の1行に出す値（すべて円。表示の直前で万円に丸める）
// 内訳を足すと合計になる（tests/throughline.test.ts の THRU-04 で確かめている）
//   収入 = 給与（本人・配偶者）＋副業＋公的年金＋企業・DC年金＋退職一時金＋児童手当＋不動産＋臨時収入＋保険金など − 税・社保
//   支出 = 生活費＋特別費＋住居費＋住宅ローン＋学費＋塾・習い事＋保険料＋介護＋一時支出＋他のローン
//   積立 = NISA＋特定口座＋iDeCo＋暗号資産・金
export interface YearRow {
  age: number;
  spouseAge: number | null;
  year: number;
  income: number; // 収入（手取り）
  wageSelf: number;
  wageSpouse: number;
  sideInc: number;
  pubPen: number; // 公的年金（加給年金を含む）
  corpPen: number; // 企業年金・DC年金・退職金の年金受取
  lump: number; // 退職金・DC一時金（額面）
  childAllow: number;
  re: number; // 不動産投資の手残り（家賃 − 経費 − 返済）
  inherit: number; // 臨時収入（相続・贈与など）
  insOther: number; // 保険の満期金・保険金・収入保障・遺族年金
  taxAll: number; // 税・社会保険料（退職金・DC・保険の分離課税を含む）
  exp: number; // 支出
  living: number;
  special: number;
  housing: number; // 家賃・管理費・固定資産税
  homePay: number; // 住宅ローンの返済（繰上返済を含む）
  eduT: number;
  eduJ: number;
  ins: number; // 保険料
  care: number;
  lifeExp: number;
  otherLoan: number;
  inv: number; // 積立
  nisaIn: number;
  tokuIn: number;
  dcIn: number; // iDeCo（本人掛金）
  kgIn: number; // 暗号資産・金
  cf: number; // 年間収支 = 収入 − 支出 − 積立（現金がどれだけ増減したか。取り崩し前）
  gain: number; // 運用益（その年に運用で増えた分）
  draw: number; // 取り崩し（運用資産を売って現金にした手取り額）
  saleTax: number; // 売却益にかかった税
  cash: number; // 現金（預金）の年末残高
  nisa: number;
  toku: number;
  dc: number;
  kg: number; // 暗号資産＋金
  fin: number; // 金融資産合計 = 現金＋運用資産（「いまの試算」の判定と同じ「預金と投資」。家・不動産は入れない）
  hl: number; // 住宅ローン残高
  otherDebt: number; // 不動産投資・その他のローン残高
  nw: number; // 差し引き = 金融資産 − ローン残高
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

    const loan = Math.max(0, fin - r.nw);
    return {
      age: r.age,
      spouseAge: spouseNow === null ? null : spouseNow + t,
      year: baseYear + t,
      income: r.income,
      wageSelf: r.wageSelf,
      wageSpouse: r.wageSpouse,
      sideInc: r.sideInc,
      pubPen: r.pubPen,
      corpPen: r.corpPen,
      lump: r.sevGross + r.dcLump,
      childAllow: r.childAllow,
      re: r.reInc,
      inherit: r.inherit,
      insOther: r.insPayout + r.incomeProt + r.deathLump + r.survPen,
      taxAll: r.taxWage + r.sevTax + r.dcTax + r.insSepTax,
      exp: r.exp,
      living: r.basicL,
      special: r.special,
      housing: r.homeRent + r.homeTax,
      homePay: r.homePay,
      eduT: r.eduT,
      eduJ: r.eduJ,
      ins: r.ins,
      care: r.care,
      lifeExp: r.lifeExp,
      otherLoan: r.otherLoanPay,
      inv: r.inv,
      nisaIn: r.nisaIn,
      tokuIn: r.tokuIn,
      dcIn: r.dcContribSelf,
      kgIn: r.cryptoIn + r.goldIn,
      cf: r.cf,
      gain: tradableGain + dcGain,
      draw: r.draw,
      saleTax: r.saleTax,
      cash: a.c,
      nisa: a.nisa,
      toku: a.toku,
      dc: a.dc,
      kg: a.k + a.g,
      fin,
      // 金融純資産 nw = 金融資産合計 − ローン残高（住宅・不動産・その他）なので、差がローン残高
      hl: Math.min(loan, Math.max(0, r.hlBal)),
      otherDebt: Math.max(0, loan - Math.max(0, r.hlBal)),
      nw: r.nw,
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
  label: string;
  group: Group;
  total?: boolean; // グループの合計（いつも出す。太字）
  keep?: boolean; // 内訳でも、0の年ばかりでも出す
  signed?: boolean; // プラスにも「+」を付ける（増減を表す列）
  minus?: boolean; // 引かれる額（「−」を付ける）
  narrow?: boolean; // スマホでも出す列
}
const COLS: Col[] = [
  { key: "income", label: "収入計", group: "income", total: true },
  { key: "wageSelf", label: "本人の給与", group: "income" },
  { key: "wageSpouse", label: "配偶者の給与", group: "income" },
  { key: "sideInc", label: "副業", group: "income" },
  { key: "pubPen", label: "公的年金", group: "income" },
  { key: "corpPen", label: "企業・DC年金", group: "income" },
  { key: "lump", label: "退職一時金", group: "income" },
  { key: "childAllow", label: "児童手当", group: "income" },
  { key: "re", label: "不動産", group: "income", signed: true },
  { key: "inherit", label: "臨時収入", group: "income" },
  { key: "insOther", label: "保険金など", group: "income" },
  { key: "taxAll", label: "税・社保", group: "income", minus: true },
  { key: "exp", label: "支出計", group: "exp", total: true },
  { key: "living", label: "生活費", group: "exp" },
  { key: "special", label: "特別費", group: "exp" },
  { key: "housing", label: "住居費", group: "exp" },
  { key: "homePay", label: "住宅ローン", group: "exp" },
  { key: "eduT", label: "学費", group: "exp" },
  { key: "eduJ", label: "塾・習い事", group: "exp" },
  { key: "ins", label: "保険料", group: "exp" },
  { key: "care", label: "介護", group: "exp" },
  { key: "lifeExp", label: "一時支出", group: "exp" },
  { key: "otherLoan", label: "他のローン", group: "exp" },
  { key: "inv", label: "積立計", group: "inv", total: true },
  { key: "nisaIn", label: "NISA", group: "inv" },
  { key: "tokuIn", label: "特定口座", group: "inv" },
  { key: "dcIn", label: "iDeCo", group: "inv" },
  { key: "kgIn", label: "暗号資産・金", group: "inv" },
  { key: "cf", label: "年間収支", group: "cf", total: true, signed: true, narrow: true },
  { key: "gain", label: "運用益", group: "run", total: true, signed: true, narrow: true },
  { key: "draw", label: "取り崩し", group: "run", keep: true },
  { key: "saleTax", label: "売却の税", group: "run", minus: true },
  { key: "fin", label: "金融資産", group: "bal", total: true, narrow: true },
  { key: "cash", label: "現金", group: "bal", keep: true },
  { key: "nisa", label: "NISA", group: "bal" },
  { key: "toku", label: "特定口座", group: "bal" },
  { key: "dc", label: "iDeCo・DC", group: "bal" },
  { key: "kg", label: "暗号資産・金", group: "bal" },
  { key: "hl", label: "住宅ローン", group: "bal", minus: true },
  { key: "otherDebt", label: "他のローン", group: "bal", minus: true },
  { key: "nw", label: "差し引き", group: "bal", signed: true },
];
const GROUP_LABEL: Record<Group, string> = {
  income: "収入（手取り）",
  exp: "支出",
  inv: "積立",
  cf: "収支",
  run: "運用",
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
  // どの年も0の内訳は出さない（合計・現金・取り崩しはいつも出す）
  const cols = useMemo(() => {
    if (narrow && !showAll) return COLS.filter((c) => c.narrow);
    return COLS.filter((c) => c.total || (detail && (c.keep || data.some((d) => manOf(d[c.key]) !== 0))));
  }, [narrow, showAll, detail, data]);
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
                      <Num yen={d[c.key]} signed={c.signed} minus={c.minus} dim0={!c.total && !c.keep} bold={c.total} sub={!c.total} />
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
        <li>収入（手取り）＝ 給与・年金などの額面 − 税・社保。退職一時金は退職金とDC一時金の額面、保険金などは保険の満期金・保険金・収入保障・遺族年金。不動産は家賃から経費と返済を引いた手残り</li>
        <li>支出: 住居費 ＝ 家賃・管理費・修繕積立金・固定資産税、住宅ローン ＝ 毎月の返済と繰上返済、他のローン ＝ 車・奨学金など</li>
        <li>年間収支 ＝ 収入（手取り）− 支出 − 積立。マイナスの年は、預金か運用資産の取り崩しで埋めます</li>
        <li>運用益 ＝ その年に運用で増えた分（年初から年末の増減から、積立と取り崩しを除いたもの。預金の利息は入れない）。売却の税 ＝ 取り崩しで売った利益にかかった税</li>
        <li>金融資産 ＝ 現金＋NISA・特定口座・iDeCo/DC・暗号資産・金（家・不動産は入れない）。差し引き ＝ 金融資産 − ローン残高</li>
        <li>内訳は、どの年も0の列を省いています。「合計だけ」にすると内訳を隠します</li>
      </ul>
    </div>
  );
}
