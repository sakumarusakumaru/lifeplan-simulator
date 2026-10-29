"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useVBase } from "@/components/v4/useVBase";

// 初回訪問者向けのインタラクティブな使い方ガイド。
// 最後のステップで免責に同意すると ver4 の入力へ進む。

const GUIDE_KEY = "lp_guide_v4";
const CONSENT_KEY = "lp_consent_v1";

const INK = "#0a0a0a";
const RED = "#c8383a";
const GREEN = "#22863a";
const CREAM = "#f0f0ee";

const STEPS = [
  { key: "hello", label: "はじめに" },
  { key: "how", label: "しくみ" },
  { key: "input", label: "入力" },
  { key: "account", label: "口座" },
  { key: "result", label: "結果" },
  { key: "start", label: "スタート" },
] as const;

const man = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億円`;
  return `${sign}${abs.toLocaleString()}万円`;
};

// ─────────────────────────────────────────
// 共通パーツ
// ─────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl bg-white p-4 sm:p-5 ${className}`}
      style={{ border: `2.5px solid ${INK}` }}
    >
      {children}
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/50">
      {children}
    </p>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between text-[11px] font-bold text-[#0a0a0a]">
        <span>{label}</span>
        <span className="tabular-nums" style={{ color: RED }}>
          {format(value)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#c8383a]"
      />
    </label>
  );
}

// ─────────────────────────────────────────
// STEP 0: はじめに
// ─────────────────────────────────────────
const PREP_ITEMS = [
  { key: "gensen", label: "源泉徴収票（年収・社会保険料）", hint: "なければ「額面年収」がわかればOK" },
  { key: "nenkin", label: "ねんきん定期便（加入年数・見込み額）", hint: "ねんきんネットでも確認できます" },
  { key: "shoken", label: "証券口座の評価額（NISA／特定口座）", hint: "口座ごとの「評価額」と「買った金額の合計（元本）」" },
  { key: "dc", label: "iDeCo・企業型DCの残高と掛金", hint: "会社のDCは会社が出している掛金も" },
  { key: "loan", label: "住宅ローンの残高・金利", hint: "返済予定表に載っています" },
];

function StepHello() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const done = PREP_ITEMS.filter((p) => checked[p.key]).length;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Kicker>LIFE PLAN SIMULATOR ver4</Kicker>
        <h1 className="text-2xl font-bold leading-snug text-[#0a0a0a] sm:text-3xl">
          人生のお金を、
          <br />
          自分で試算してみる。
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#0a0a0a]/70">
          年齢・収入・支出・資産を入れると、100歳までのお金の流れを1年ずつ計算します。
          入力は10分ほど。わからない所は初期値のままで大丈夫です。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { no: "01", title: "資産の推移", body: "現金・NISA・iDeCoなどが毎年どう増減するか" },
          { no: "02", title: "お金が尽きる年齢", body: "このままだと何歳で足りなくなるか" },
          { no: "03", title: "打ち手の比較", body: "積立・繰下げ・支出見直しの効果を並べて比較" },
        ].map((c) => (
          <div
            key={c.no}
            className="rounded-xl p-3"
            style={{ background: CREAM, border: `2px solid ${INK}20` }}
          >
            <p className="text-[10px] font-bold tracking-[0.18em]" style={{ color: RED }}>
              {c.no}
            </p>
            <p className="text-sm font-bold text-[#0a0a0a]">{c.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#0a0a0a]/65">{c.body}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-bold text-[#0a0a0a]">手元にあると正確になるもの</p>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: done === PREP_ITEMS.length ? GREEN : "#0a0a0a80" }}>
            {done} / {PREP_ITEMS.length}
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {PREP_ITEMS.map((p) => (
            <li key={p.key}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#f0f0ee]">
                <input
                  type="checkbox"
                  checked={!!checked[p.key]}
                  onChange={(e) => setChecked((c) => ({ ...c, [p.key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#22863a]"
                />
                <span className="flex flex-col">
                  <span className="text-[12px] font-bold text-[#0a0a0a]">{p.label}</span>
                  <span className="text-[10px] text-[#0a0a0a]/55">{p.hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-[#0a0a0a]/50">
          なくても始められます。あとから数字を入れ直せば、結果はすぐに変わります。
        </p>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────
// STEP 1: しくみ（ミニ・シミュレーター）
// ─────────────────────────────────────────
function StepHow() {
  const [age, setAge] = useState(40);
  const [savings, setSavings] = useState(500);
  const [monthly, setMonthly] = useState(5);
  const [ret, setRet] = useState(3);
  const [gap, setGap] = useState(6);

  const series = useMemo(() => {
    const pts: { age: number; v: number }[] = [];
    let a = savings * 10000;
    for (let x = age; x <= 95; x++) {
      pts.push({ age: x, v: a });
      if (x < 65) a = a * (1 + ret / 100) + monthly * 10000 * 12;
      else a = a * (1 + ret / 100) - gap * 10000 * 12 * Math.pow(1.015, x - age);
    }
    return pts;
  }, [age, savings, monthly, ret, gap]);

  const short = series.find((p) => p.v < 0);
  const peak = Math.max(...series.map((p) => p.v), 1);
  const minV = Math.min(0, ...series.map((p) => p.v));
  const W = 600;
  const H = 170;
  const x = (a: number) => ((a - age) / Math.max(1, 95 - age)) * W;
  const y = (v: number) => H - ((v - minV) / (peak - minV)) * H;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.age).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(95)},${y(0)} L${x(age)},${y(0)} Z`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Kicker>HOW IT WORKS</Kicker>
        <h2 className="text-xl font-bold text-[#0a0a0a]">働くあいだに貯めて、老後に取り崩す</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#0a0a0a]/70">
          ライフプランの骨格はこれだけです。スライダーを動かして、線がどう変わるか試してみてください。
          本番ではこれに税金・年金・教育費・住宅ローンなどが1年ずつ加わります。
        </p>
      </div>

      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">体験用のミニ版</span>
          <span className="text-sm font-bold" style={{ color: short ? RED : GREEN }}>
            {short ? `${short.age}歳でお金が尽きる` : `95歳時点で ${man(series[series.length - 1].v)}`}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full max-h-56" role="img" aria-label="資産推移のミニグラフ">
          <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke={INK} strokeWidth={1.5} />
          {age < 65 ? (
            <>
              <line x1={x(65)} x2={x(65)} y1={0} y2={H} stroke={INK} strokeOpacity={0.25} strokeDasharray="3 3" />
              <text x={x(65) + 3} y={11} fontSize={12} fill="#0a0a0a99" fontWeight={700}>65歳 退職</text>
            </>
          ) : null}
          <path d={area} fill={short ? "#c8383a22" : "#22863a22"} />
          <path d={line} fill="none" stroke={short ? RED : GREEN} strokeWidth={2.5} />
          {short ? <circle cx={x(short.age)} cy={y(0)} r={4} fill={RED} /> : null}
          <text x={0} y={H + 14} fontSize={12} fill="#0a0a0a99" fontWeight={700}>{age}歳</text>
          <text x={W} y={H + 14} fontSize={12} fill="#0a0a0a99" fontWeight={700} textAnchor="end">95歳</text>
        </svg>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Slider label="今の年齢" value={age} min={25} max={60} step={1} onChange={setAge} format={(v) => `${v}歳`} />
          <Slider label="今の貯蓄・投資" value={savings} min={0} max={3000} step={50} onChange={setSavings} format={(v) => `${v}万円`} />
          <Slider label="毎月の積立（65歳まで）" value={monthly} min={0} max={20} step={0.5} onChange={setMonthly} format={(v) => `${v}万円`} />
          <Slider label="運用利回り（年）" value={ret} min={0} max={7} step={0.5} onChange={setRet} format={(v) => `${v}%`} />
          <Slider label="老後、年金で足りない額（月）" value={gap} min={0} max={20} step={0.5} onChange={setGap} format={(v) => `${v}万円`} />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[#0a0a0a]/50">
          ※ 体験用の単純計算です（物価上昇1.5%・税金なし）。本番の計算とは一致しません。
        </p>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────
// STEP 2: 入力の4ステップ
// ─────────────────────────────────────────
const INPUT_TABS = [
  {
    no: "01",
    title: "基本設定",
    what: "生年月日（本人・配偶者）、配偶者の働き方、物価上昇率",
    where: "まずは生年月日だけでOK。年齢は自動で計算されます",
    tip: "税金は「詳細モード」がおすすめ。2026年の基礎控除（178万円の壁）や社会保険料率まで反映します",
  },
  {
    no: "02",
    title: "収入",
    what: "勤務先ごとの年収・昇給率・退職年齢・退職金、副業、公的年金",
    where: "年収は源泉徴収票の「支払金額」。年金はねんきん定期便の加入年数",
    tip: "退職金は「退職所得」として別枠で計算するので、額面のまま入れてください",
  },
  {
    no: "03",
    title: "資産",
    what: "現金、NISA口座、特定口座、iDeCo・企業型DC、暗号資産、金、不動産投資",
    where: "証券会社のアプリで「口座ごとの残高」を確認",
    tip: "投信か株かではなく「どの口座か」で入れます。NISAの年間枠・生涯枠、iDeCoの上限は自動でチェック",
  },
  {
    no: "04",
    title: "支出",
    what: "生活費、特別費、住居（家賃・ローン）、教育費、保険、介護、一時的な支出",
    where: "家計簿アプリの月平均。住宅ローンは返済予定表",
    tip: "子どもを追加すると、教育費と児童手当が年齢に応じて自動で入ります",
  },
];

function StepInput() {
  const [tab, setTab] = useState(0);
  const t = INPUT_TABS[tab];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Kicker>INPUT</Kicker>
        <h2 className="text-xl font-bold text-[#0a0a0a]">入力は上から4つのブロック</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#0a0a0a]/70">
          はじめは入力だけの画面です。4つのブロックを上から順に入れて「OK・次へ」を押していくと、最後にあなたの結果（グラフ・診断）が出ます。そのあとは入力を直すたびに結果がすぐ変わります。番号を押して、それぞれ何を入れるか見てみましょう。
        </p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {INPUT_TABS.map((it, i) => (
          <button
            key={it.no}
            type="button"
            onClick={() => setTab(i)}
            className="flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 transition-colors"
            style={{
              background: tab === i ? INK : "#fff",
              color: tab === i ? "#fff" : INK,
              border: `2px solid ${INK}`,
            }}
          >
            <span className="text-[10px] font-bold tracking-[0.14em]" style={{ color: tab === i ? "#ffffff99" : RED }}>
              {it.no}
            </span>
            <span className="text-[12px] font-bold">{it.title}</span>
          </button>
        ))}
      </div>
      <Card>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/50">入れるもの</dt>
            <dd className="text-sm font-bold leading-relaxed text-[#0a0a0a]">{t.what}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]/50">どこで調べる</dt>
            <dd className="text-[13px] leading-relaxed text-[#0a0a0a]/80">{t.where}</dd>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ background: "#fff8e7" }}>
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#a07900" }}>コツ</dt>
            <dd className="text-[12px] leading-relaxed text-[#0a0a0a]/80">{t.tip}</dd>
          </div>
        </dl>
      </Card>
      <p className="text-[11px] leading-relaxed text-[#0a0a0a]/55">
        入力内容はこのブラウザの中だけに保存され、外部には送信されません。「JSONでDL」で手元にバックアップできます。
      </p>
    </div>
  );
}

// ─────────────────────────────────────────
// STEP 3: 口座で分ける（NISA vs 特定口座 / iDeCo の節税）
// ─────────────────────────────────────────
const INCOME_RATES = [
  { label: "年収300万", rate: 0.15 },
  { label: "年収500万", rate: 0.2 },
  { label: "年収700万", rate: 0.3 },
  { label: "年収1,000万", rate: 0.43 },
];

// 新NISA（2024年〜）: 年360万円（つみたて投資枠120万＋成長投資枠240万）＝月30万円まで、生涯の非課税枠は1,800万円（買った金額で数える）
const NISA_LIFETIME = 1800 * 10000;
const TOKU_TAX = 0.20315;

// 毎月同じ額を積み立てて、最後にまとめて売ったときの手取り（途中で売らない前提）
function compareNisa(monthlyMan: number, years: number, retPct: number) {
  const m = monthlyMan * 10000;
  const r = retPct / 100 / 12;
  let nisa = 0;
  let nisaIn = 0;
  let toku = 0;
  let tokuIn = 0;
  let all = 0;
  let fullAt = 0; // 生涯枠がいっぱいになった月
  for (let i = 1; i <= years * 12; i++) {
    const toNisa = Math.max(0, Math.min(m, NISA_LIFETIME - nisaIn));
    if (toNisa < m && !fullAt) fullAt = i;
    nisa = (nisa + toNisa) * (1 + r);
    nisaIn += toNisa;
    toku = (toku + m - toNisa) * (1 + r);
    tokuIn += m - toNisa;
    all = (all + m) * (1 + r);
  }
  const principal = m * 12 * years;
  const tokuTax = Math.max(0, toku - tokuIn) * TOKU_TAX;
  const allTax = Math.max(0, all - principal) * TOKU_TAX;
  return { principal, nisa, nisaIn, toku, tokuIn, tokuTax, withNisa: nisa + toku - tokuTax, all, allTax, allNet: all - allTax, fullAt };
}

function StepAccount() {
  const [monthly, setMonthly] = useState(5);
  const [years, setYears] = useState(20);
  const [ret, setRet] = useState(4);
  const [inc, setInc] = useState(1);
  const [ideco, setIdeco] = useState(2.3);

  const c = compareNisa(monthly, years, ret);
  const gain = Math.max(0, c.all - c.principal);
  const maxV = Math.max(c.withNisa, c.allNet, 1);
  const saving = ideco * 10000 * 12 * INCOME_RATES[inc].rate;
  const fullY = Math.floor((c.fullAt - 1) / 12);
  const fullM = (c.fullAt - 1) % 12;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Kicker>ACCOUNTS</Kicker>
        <h2 className="text-xl font-bold text-[#0a0a0a]">税金は「何を買うか」より「どの口座か」で決まる</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#0a0a0a]/70">
          ver4 では投資を「投信／株」ではなく「新NISA／旧NISA／特定口座／iDeCo」で入力します。同じ投資信託を買っても、口座が違えば手取りが変わるからです。
        </p>
      </div>

      <Card>
        <p className="mb-2 text-sm font-bold text-[#0a0a0a]">同じ積立を、新NISAと特定口座でくらべる</p>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg px-3 py-2" style={{ background: "#f0fff4" }}>
            <p className="text-[11px] font-bold" style={{ color: GREEN }}>新NISA（2024年〜）</p>
            <p className="text-[11px] leading-relaxed text-[#0a0a0a]/75">
              利益に税金がかからない。1年に360万円まで（つみたて投資枠120万円＋成長投資枠240万円）＝毎月30万円まで。一生で使える枠は1,800万円（買った金額で数える。売ると翌年に枠が戻る）。
            </p>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ background: "#f3f4f6" }}>
            <p className="text-[11px] font-bold text-[#64748b]">特定口座</p>
            <p className="text-[11px] leading-relaxed text-[#0a0a0a]/75">
              いくらでも買える。売ったときの利益に20.315%（所得税15.315%＋住民税5%）。「源泉徴収あり」なら証券会社が税を払うので確定申告はいらない。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Slider label="毎月の積立" value={monthly} min={1} max={30} step={1} onChange={setMonthly} format={(v) => `${v}万円`} />
          <Slider label="積み立てる年数" value={years} min={1} max={40} step={1} onChange={setYears} format={(v) => `${v}年`} />
          <Slider label="想定利回り（年）" value={ret} min={0} max={8} step={0.5} onChange={setRet} format={(v) => `${v}%`} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#0a0a0a]/70">
          毎月{monthly}万円を{years}年＝元本 <b>{man(c.principal)}</b>。
          {c.fullAt
            ? `${fullY > 0 ? `${fullY}年` : ""}${fullM > 0 ? `${fullM}か月` : ""}で新NISAの生涯枠1,800万円がいっぱいになり、それ以降の${man(c.tokuIn)}は特定口座で積み立てる計算です。`
            : `すべて新NISAの枠に収まります（生涯枠の残り ${man(NISA_LIFETIME - c.nisaIn)}）。`}
          最後にまとめて売ったときの手取りをくらべます。
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {[
            {
              label: c.tokuIn > 0 ? "新NISA＋枠を超えた分は特定口座" : "新NISAで積み立てる",
              value: c.withNisa,
              color: GREEN,
              note: c.tokuIn > 0 ? `新NISA ${man(c.nisa)}（非課税）＋特定口座 ${man(c.toku)}（税 −${man(c.tokuTax)}）` : `運用益 ${man(gain)} に税金はかからない`,
            },
            { label: "全部を特定口座で積み立てる", value: c.allNet, color: "#64748b", note: `運用益 ${man(gain)} に20.315%（税 −${man(c.allTax)}）` },
          ].map((b) => (
            <div key={b.label}>
              <div className="mb-0.5 flex items-baseline justify-between text-[11px] font-bold">
                <span style={{ color: b.color }}>{b.label}</span>
                <span className="tabular-nums text-[#0a0a0a]">{man(b.value)}</span>
              </div>
              <div className="h-4 overflow-hidden rounded" style={{ background: "#0a0a0a10" }}>
                <div className="h-full rounded transition-all duration-300" style={{ width: `${(b.value / maxV) * 100}%`, background: b.color }} />
              </div>
              <p className="mt-0.5 text-[10px] text-[#0a0a0a]/50">{b.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-bold" style={{ color: RED }}>
          新NISAを使うと、手取りが {man(c.withNisa - c.allNet)} 多い
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-[#0a0a0a]/50">
          枠は1人ごと（夫婦なら2人で3,600万円）。2023年までに一般NISA・つみたてNISAで買った分（旧NISA）は新NISAとは別枠で、一般NISAは5年、つみたてNISAは20年まで非課税のまま持てます（新NISAへは移せず、期間が終わると特定口座などに移ります）。
          利回りは毎年同じとした計算で、実際の値動きは上下します。
        </p>
      </Card>

      <Card>
        <p className="mb-1 text-sm font-bold text-[#0a0a0a]">iDeCo は「出した掛金」がそのまま所得控除</p>
        <p className="mb-3 text-[11px] leading-relaxed text-[#0a0a0a]/60">
          年収が高いほど節税額が大きくなります。2027年からは会社員（企業年金なし）の上限が月2.3万→6.2万に上がります。
        </p>
        <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {INCOME_RATES.map((it, i) => (
            <button
              key={it.label}
              type="button"
              onClick={() => setInc(i)}
              className="rounded-lg px-2 py-1.5 text-[11px] font-bold"
              style={{
                background: inc === i ? INK : "#fff",
                color: inc === i ? "#fff" : INK,
                border: `2px solid ${INK}`,
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
        <Slider label="iDeCoの掛金（月）" value={ideco} min={0.5} max={6.2} step={0.1} onChange={setIdeco} format={(v) => `${v.toFixed(1)}万円`} />
        <p className="mt-3 text-sm font-bold text-[#0a0a0a]">
          毎年の税金が 約 <span style={{ color: GREEN }}>{man(saving)}</span> 減る
          <span className="ml-1 text-[10px] font-normal text-[#0a0a0a]/50">
            （所得税＋住民税 約{Math.round(INCOME_RATES[inc].rate * 100)}%の目安）
          </span>
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[#0a0a0a]/50">
          ただし60歳まで引き出せません。受け取るときは退職金と同じ控除を使えますが、退職金と受取時期が近いと控除が減ります。ver4 はこの調整まで計算します。
        </p>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────
// STEP 4: 結果の見方（ホットスポット）
// ─────────────────────────────────────────
const SPOTS = [
  { no: 1, title: "スコアと主要な数字", body: "100点満点の総合評価と、お金が尽きる年齢・最終的な純資産。まずここだけ見れば全体がつかめます。" },
  { no: 2, title: "資産推移グラフ", body: "現金・NISA・特定口座・DCなどの内訳が年ごとに積み上がります。赤い線は借入を差し引いた純資産。" },
  { no: 3, title: "制度チェック", body: "NISAの枠を超えた、iDeCoの上限を超えた、退職金とDC一時金の控除が重なった、などを自動で知らせます。" },
  { no: 4, title: "比較・もしも", body: "「NISAを月+2万」「年金を70歳に繰下げ」などを効果の大きい順に並べます。「もしも」タブでは、亡くなった場合の遺族年金・必要な死亡保障額・相続税と、家族に渡す引き継ぎ書がわかります。" },
];

function Spot({ no, active, onClick }: { no: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shadow"
      style={{
        background: active ? RED : "#fff",
        color: active ? "#fff" : RED,
        border: `2px solid ${RED}`,
        animation: active ? undefined : "lp-pulse 1.8s ease-in-out infinite",
      }}
      aria-label={`説明${no}を表示`}
    >
      {no}
    </button>
  );
}

function StepResult() {
  const [spot, setSpot] = useState(1);
  const s = SPOTS[spot - 1];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Kicker>RESULTS</Kicker>
        <h2 className="text-xl font-bold text-[#0a0a0a]">結果画面の見方</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#0a0a0a]/70">
          赤い丸を押すと、それぞれの見どころが表示されます。
        </p>
      </div>
      <div className="relative rounded-xl p-3" style={{ background: CREAM, border: `2.5px solid ${INK}` }}>
        {/* ミニ模型 */}
        <div className="flex items-center gap-3 rounded-lg bg-white p-2.5" style={{ border: `2px solid ${INK}20` }}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white" style={{ background: GREEN }}>
            78
          </div>
          <div className="grid flex-1 grid-cols-2 gap-1 text-[10px] text-[#0a0a0a]/70">
            <span>資金ショート: <b className="text-[#0a0a0a]">なし</b></span>
            <span>100歳純資産: <b className="text-[#0a0a0a]">3,200万</b></span>
          </div>
        </div>
        <div className="mt-2 rounded-lg bg-white p-2.5" style={{ border: `2px solid ${INK}20` }}>
          <svg viewBox="0 0 300 80" className="h-28 w-full" preserveAspectRatio="none" aria-hidden>
            <path d="M0,70 L40,62 L80,50 L120,38 L160,28 L200,26 L240,34 L300,46 L300,80 L0,80Z" fill="#94a3b8" />
            <path d="M0,74 L40,70 L80,64 L120,58 L160,52 L200,54 L240,60 L300,66 L300,80 L0,80Z" fill={GREEN} opacity={0.75} />
            <path d="M0,76 L40,74 L80,72 L120,70 L160,68 L200,70 L240,73 L300,75 L300,80 L0,80Z" fill="#64748b" />
            <path d="M0,72 L40,60 L80,46 L120,33 L160,22 L200,22 L240,30 L300,42" fill="none" stroke={RED} strokeWidth={2} />
          </svg>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg px-2.5 py-2 text-[10px]" style={{ background: "#fff8e7", border: "1.5px solid #d4a01760" }}>
            <b style={{ color: "#a07900" }}>制度チェック</b>
            <p className="text-[#0a0a0a]/60">● NISA生涯枠に56歳で到達…</p>
          </div>
          <div className="rounded-lg bg-white px-2.5 py-2 text-[10px]" style={{ border: `1.5px solid ${INK}20` }}>
            <b>比較</b>
            <p className="text-[#0a0a0a]/60">NISA月+2万 → +820万</p>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute" style={{ left: 6, top: 6 }}>
            <Spot no={1} active={spot === 1} onClick={() => setSpot(1)} />
          </div>
          <div className="pointer-events-auto absolute" style={{ right: 10, top: 74 }}>
            <Spot no={2} active={spot === 2} onClick={() => setSpot(2)} />
          </div>
          <div className="pointer-events-auto absolute" style={{ left: "calc(50% - 34px)", bottom: 30 }}>
            <Spot no={3} active={spot === 3} onClick={() => setSpot(3)} />
          </div>
          <div className="pointer-events-auto absolute" style={{ right: 10, bottom: 30 }}>
            <Spot no={4} active={spot === 4} onClick={() => setSpot(4)} />
          </div>
        </div>
      </div>
      <Card>
        <p className="text-[10px] font-bold tracking-[0.18em]" style={{ color: RED }}>
          {String(s.no).padStart(2, "0")}
        </p>
        <p className="text-sm font-bold text-[#0a0a0a]">{s.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#0a0a0a]/75">{s.body}</p>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────
// STEP 5: 同意してスタート
// ─────────────────────────────────────────
function StepStart({ onStart }: { onStart: () => void }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Kicker>BEFORE YOU START</Kicker>
        <h2 className="text-xl font-bold text-[#0a0a0a]">はじめる前に、これだけ確認を</h2>
      </div>
      <div className="overflow-hidden rounded-xl" style={{ background: "#fff8e7", border: `2.5px solid ${RED}` }}>
        <div className="px-4 py-2" style={{ background: RED }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">⚠ ご利用前に</p>
        </div>
        <ul className="flex flex-col gap-2 px-4 py-3 text-[12px] leading-relaxed text-[#0a0a0a]/85">
          <li>1. 個人が運営する計算ツールです。投資・保険・税務・法務の助言は行いません。運営者はFP・税理士等の有資格者ではありません。</li>
          <li>2. 入力データはお使いのブラウザ内にだけ保存され、サーバーには送信されません。</li>
          <li>3. 結果は前提条件のもとでの概算です。税制・年金制度は2026年10月時点のルールで計算しており、将来を保証しません。</li>
          <li>4. 個別の判断は、登録のある専門家（FP・税理士・社労士等）にご相談ください。</li>
          <li>5. 本サイトの利用で生じた損害について、運営者は責任を負いません。</li>
        </ul>
        <div className="flex gap-4 border-t px-4 py-2 text-[11px]" style={{ borderColor: "#0a0a0a20" }}>
          <Link href="/terms" className="font-bold underline hover:text-[#c8383a]">→ 利用規約</Link>
          <Link href="/privacy" className="font-bold underline hover:text-[#c8383a]">→ プライバシーポリシー</Link>
        </div>
      </div>
      <label
        className="flex cursor-pointer items-start gap-3 rounded-xl p-4"
        style={{ background: agreed ? "#f0fff4" : "#fff", border: `2.5px solid ${agreed ? GREEN : INK}` }}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#22863a]"
        />
        <span className="text-sm font-bold leading-snug text-[#0a0a0a]">上記の内容を理解し、同意して利用します</span>
      </label>
      <button
        type="button"
        onClick={onStart}
        disabled={!agreed}
        className="w-full py-4 text-sm font-bold uppercase tracking-[0.16em]"
        style={{
          background: agreed ? INK : "#d4d4d2",
          color: agreed ? "#fff" : "#0a0a0a55",
          border: `2.5px solid ${agreed ? INK : "#0a0a0a30"}`,
          borderRadius: 12,
          cursor: agreed ? "pointer" : "not-allowed",
        }}
      >
        同意してシミュレーターを開始 →
      </button>
      <p className="text-[11px] leading-relaxed text-[#0a0a0a]/50">
        以前のバージョンを使いたい方は <Link href="/v3/detail" className="font-bold underline">ver3</Link> もそのまま使えます（入力データは別々に保存されます。ver4 は初回に ver3 の入力を引き継ぎます）。
      </p>
    </div>
  );
}

// ─────────────────────────────────────────
// ページ本体
// ─────────────────────────────────────────
// mode="page": 初回訪問者向けの単独ページ。最後に免責へ同意してシミュレーターへ
// mode="modal": シミュレーターの上に重ねて開く。閉じれば元の画面にそのまま戻る（同意ステップなし）
export function GuideFlow({ mode, onClose }: { mode: "page" | "modal"; onClose?: () => void }) {
  const router = useRouter();
  const base = useVBase();
  const [step, setStep] = useState(0);
  const [returning, setReturning] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const steps = mode === "modal" ? STEPS.slice(0, STEPS.length - 1) : STEPS;
  const lastIdx = steps.length - 1;

  useEffect(() => {
    // 同意済みの人がページ版を開いたときは「シミュレーターに戻る」を出す
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (mode === "page" && localStorage.getItem(CONSENT_KEY)) setReturning(true);
    } catch {
      // localStorage 不可でも続行
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "modal") scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") setStep((s) => Math.min(lastIdx, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
      if (e.key === "Escape" && mode === "modal") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastIdx, mode, onClose]);

  // モーダル表示中は背面のスクロールを止める
  useEffect(() => {
    if (mode !== "modal") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mode]);

  const start = () => {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(CONSENT_KEY, now);
      localStorage.setItem(GUIDE_KEY, now);
    } catch {
      // localStorage が使えなくても遷移する
    }
    router.push(`${base}/detail`);
  };

  const last = step === lastIdx;
  const showBottomNav = mode === "modal" || !last;

  const body = (
    <>
      <style>{`@keyframes lp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(200,56,58,.45)}50%{box-shadow:0 0 0 6px rgba(200,56,58,0)}}`}</style>
      <div className="mx-auto max-w-2xl">
        {/* ヘッダー＋進捗 */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">
            LIFE PLAN SIMULATOR{" "}
            <span className="font-normal text-[#0a0a0a]/45">ver4 / 使い方</span>
          </span>
          {mode === "modal" ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
              style={{ border: `2px solid ${INK}`, background: "#fff" }}
              aria-label="使い方を閉じる"
            >
              ✕ 閉じる
            </button>
          ) : returning ? (
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push(`${base}/detail`))}
              className="text-[11px] font-bold text-[#0a0a0a] underline hover:text-[#c8383a]"
            >
              ← シミュレーターに戻る
            </button>
          ) : !last ? (
            <button
              type="button"
              onClick={() => setStep(lastIdx)}
              className="text-[11px] font-bold text-[#0a0a0a]/55 underline hover:text-[#c8383a]"
            >
              スキップ
            </button>
          ) : null}
        </div>
        <nav
          className="mb-6 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          aria-label="ガイドの進捗"
        >
          {steps.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(i)}
              className="flex flex-col items-start gap-1"
              aria-current={i === step ? "step" : undefined}
            >
              <span
                className="h-1.5 w-full rounded-full transition-colors"
                style={{ background: i <= step ? INK : "#0a0a0a20" }}
              />
              <span
                className="hidden text-[10px] font-bold sm:block"
                style={{ color: i === step ? INK : "#0a0a0a60" }}
              >
                {s.label}
              </span>
            </button>
          ))}
        </nav>

        {step === 0 && <StepHello />}
        {step === 1 && <StepHow />}
        {step === 2 && <StepInput />}
        {step === 3 && <StepAccount />}
        {step === 4 && <StepResult />}
        {step === 5 && mode === "page" && <StepStart onStart={start} />}
      </div>
    </>
  );

  const nav = showBottomNav ? (
    <div
      className={mode === "modal" ? "sticky bottom-0 z-10 px-4 py-3 sm:px-8" : "fixed inset-x-0 bottom-0 z-40 px-4 py-3 sm:px-8"}
      style={{ background: CREAM, borderTop: `2.5px solid ${INK}` }}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-xl px-4 py-3 text-xs font-bold disabled:opacity-30"
          style={{ border: `2.5px solid ${INK}`, background: "#fff" }}
        >
          ← 戻る
        </button>
        <span className="flex-1 text-center text-[11px] font-bold tabular-nums text-[#0a0a0a]/50">
          {step + 1} / {steps.length}
        </span>
        {mode === "modal" && last ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-3 text-xs font-bold text-white"
            style={{ border: `2.5px solid ${INK}`, background: INK }}
          >
            閉じて続ける
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(lastIdx, s + 1))}
            className="rounded-xl px-5 py-3 text-xs font-bold text-white"
            style={{ border: `2.5px solid ${INK}`, background: INK }}
          >
            次へ →
          </button>
        )}
      </div>
    </div>
  ) : null;

  if (mode === "modal") {
    return (
      <div
        className="fixed inset-0 z-[90] flex items-stretch justify-center p-0 sm:items-center sm:p-6"
        style={{ background: "rgba(10,10,10,0.55)" }}
        role="dialog"
        aria-modal="true"
        aria-label="使い方ガイド"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          ref={scrollRef}
          className="relative flex h-full w-full max-w-3xl flex-col overflow-y-auto sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
          style={{ background: CREAM, border: `2.5px solid ${INK}` }}
        >
          <div className="flex-1 px-4 pt-4 pb-6 sm:px-8 sm:pt-6">{body}</div>
          {nav}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-28 pt-4 sm:px-8 sm:pt-8" style={{ background: CREAM }}>
      {body}
      {nav}
    </main>
  );
}
