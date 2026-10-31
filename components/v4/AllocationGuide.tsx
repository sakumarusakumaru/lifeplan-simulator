"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CARD, INNER, note } from "@/components/v4/frame";
import { useVBase } from "@/components/v4/useVBase";

import type { PlanInput, SimulationSummary } from "@/lib/v4/calc/types";

const INK = "#0a0a0a";
const C_CASH = "#c5cdd6";
const C_RISKY = "#557593";
const C_GOLD = "#e2cfa6";
const C_BAND = "#d4a24c";

// 年齢ごとの資産配分。
// このプランで「現金」と「運用資産」の割合が年齢とともにどう動くかを1枚のグラフにし、
// よく挙げられる目安（運用の割合 100−年齢 〜 120−年齢）の帯を重ねる。
// 年齢を選ぶと、その年の割合・目安との差・その時期の考え方を出す。
// 個別の推奨ではなく、一般的な考え方と「このプランのまま進んだ場合」を並べて見せるもの

interface Stage {
  key: string;
  label: string;
  from: number;
  to: number;
  title: string;
  points: string[];
}

const STAGES: Stage[] = [
  {
    key: "build",
    label: "〜39歳",
    from: 0,
    to: 39,
    title: "積み立て期：時間を味方にする時期",
    points: [
      "使う予定のない長期のお金は株式中心で積み立てる考え方が一般的。下がっても取り戻す時間がある",
      "生活費の6〜12か月分は、運用とは別に預金で持つ（生活防衛資金）",
      "リバランスは年1回か、目標から±5%以上ずれたら。売らずに毎月の積立の配分を変えれば税金はかからない",
    ],
  },
  {
    key: "mid",
    label: "40代",
    from: 40,
    to: 49,
    title: "支出のピーク期：使う時期が決まったお金を分ける",
    points: [
      "教育費・住宅の頭金など5年以内に使うお金は、運用から外して預金などで確保する",
      "老後のためのお金は、引き続き長期の運用でよいとされることが多い",
      "収入が増えたら、生活費を上げる前に積立額を見直す",
    ],
  },
  {
    key: "pre",
    label: "50代",
    from: 50,
    to: 59,
    title: "退職準備期：少しずつ守りを厚くする",
    points: [
      "退職10年前ごろから株式の比率を少しずつ下げる考え方がある（ターゲットイヤー型の投信と同じ発想）",
      "退職直後の暴落に備え、生活費の2〜3年分を預金・債券など値動きの小さい資産で持つ（バケットの考え方）",
      "iDeCo・企業型DCの受取方法と、退職金との受取時期を決めておく",
    ],
  },
  {
    key: "bridge",
    label: "60〜64歳",
    from: 60,
    to: 64,
    title: "移行期：働き方と年金開始までのつなぎ",
    points: [
      "年金開始までの生活費をどこから出すか（給与・退職金・取り崩し）を年ごとに決める",
      "取り崩すときは、税金のかかる特定口座から先に、非課税のNISAは後に残すのが一般的",
      "年金を繰り下げるなら、その間の生活費は預金など値動きの小さい資産から",
    ],
  },
  {
    key: "draw",
    label: "65〜74歳",
    from: 65,
    to: 74,
    title: "取り崩し期：減らし方を決めて、年1回見直す",
    points: [
      "「毎年、資産の4%前後を取り崩す」などのルールで考える方法がよく紹介される（相場で調整）",
      "株式の比率を急に下げすぎると、長生きとインフレに負けやすい。一部は運用を続ける考え方も多い",
      "年1回、取り崩し額と配分を見直す日を決めておく",
    ],
  },
  {
    key: "late",
    label: "75歳〜",
    from: 75,
    to: 200,
    title: "管理期：わかりやすく、家族と共有する",
    points: [
      "口座や商品の数を減らし、管理しやすくする",
      "判断力が落ちたときに備え、家族と資産の一覧を共有する（任意後見・家族信託なども選択肢）",
      "相続の準備は「もしも」の「相続の備え」と「引き継ぎ」を参照",
    ],
  },
];

function stageOf(age: number): Stage {
  return STAGES.find((s) => age >= s.from && age <= s.to) ?? STAGES[STAGES.length - 1];
}

const bandOf = (age: number) => ({ lo: Math.max(0, Math.min(100, 100 - age)), hi: Math.max(0, Math.min(100, 120 - age)) });

export function AllocationGuide({ plan, base }: { plan: PlanInput; base: SimulationSummary }) {
  const jp = useVBase() === "/v5";
  const [age, setAge] = useState(plan.curAge);

  // 年ごとの割合（%）と目安の帯
  const data = useMemo(
    () =>
      base.rows.map((r) => {
        const cash = Math.max(0, r.ass.c);
        const risky = Math.max(0, r.ass.nisa + r.ass.toku + r.ass.dc + (r.ass.k || 0));
        const gold = Math.max(0, r.ass.g || 0);
        const total = cash + risky + gold;
        const pct = (v: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
        const band = bandOf(r.age);
        return { age: r.age, 現金: pct(cash), 運用: pct(risky), 金: pct(gold), 目安下: band.lo, 目安上: band.hi, total };
      }),
    [base.rows],
  );
  const shownAge = Math.min(plan.endAge, Math.max(plan.curAge, age));
  const row = data.find((d) => d.age === shownAge) ?? data[0];
  const stage = stageOf(shownAge);
  const band = bandOf(shownAge);
  const position =
    !row || row.total <= 0 ? null : row.運用 > band.hi ? "high" : row.運用 < band.lo ? "low" : "in";
  const positionText =
    position === "high" ? "目安の帯より運用の割合が高め" : position === "low" ? "目安の帯より運用の割合が低め（守り寄り）" : position === "in" ? "目安の帯の範囲内" : null;

  // 目安から外れる最初の年齢（「ここから見直しの候補」として示す）
  const firstOut = data.find((d) => d.age >= plan.curAge && d.total > 0 && (d.運用 > d.目安上 || d.運用 < d.目安下));

  return (
    <section className="mt-10">
      <div className="mb-3 border-b-2 border-[#0a0a0a] pb-2">
        {jp ? null : <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">Allocation by age</p>}
        <h2 className="text-lg font-bold text-[#0a0a0a]">年齢ごとの資産配分</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#0a0a0a]/60">
          このプランのまま進んだとき、「現金」と「運用資産（NISA・特定口座・iDeCo/DC・暗号資産）」の割合が年齢とともにどう動くか。
          橙の点線は、よく挙げられる目安（運用の割合 100−年齢 〜 120−年齢）。グラフに乗せるか、下のスライダーで年齢を選べます。
          特定の商品や配分をすすめるものではありません。
        </p>
      </div>

      <div className="p-4" style={CARD}>
        <div className="h-[220px] w-full sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onMouseMove={(st) => {
                const a = st?.activeLabel;
                if (typeof a === "number") setAge(a);
                else if (typeof a === "string" && a) setAge(Number(a));
              }}
            >
              <CartesianGrid stroke="rgba(10,10,10,0.08)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="age" tick={{ fill: INK, fontSize: 10 }} tickLine={false} minTickGap={16} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: INK, fontSize: 10 }} width={40} tickLine={false} />
              <Tooltip
                offset={40}
                wrapperStyle={{ pointerEvents: "none", zIndex: 5 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="min-w-[150px] rounded-lg bg-white px-2.5 py-1.5 text-[10px] leading-relaxed shadow" style={{ border: "1.5px solid #0a0a0a30" }}>
                      <p className="mb-0.5 font-bold">{label}歳</p>
                      <p className="flex justify-between gap-3"><span><span className="mr-1 inline-block h-2 w-2" style={{ background: C_RISKY }} />運用</span><b>{d.運用}%</b></p>
                      <p className="flex justify-between gap-3"><span><span className="mr-1 inline-block h-2 w-2" style={{ background: C_CASH }} />現金</span><b>{d.現金}%</b></p>
                      {d.金 > 0 ? <p className="flex justify-between gap-3"><span><span className="mr-1 inline-block h-2 w-2" style={{ background: C_GOLD }} />金</span><b>{d.金}%</b></p> : null}
                      <p className="mt-0.5 flex justify-between gap-3 border-t pt-0.5 text-[#0a0a0a]/60" style={{ borderColor: "#0a0a0a15" }}><span>運用の目安</span><span>{d.目安下}〜{d.目安上}%</span></p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="運用" stackId="a" stroke={C_RISKY} fill={C_RISKY} fillOpacity={0.85} strokeWidth={0.5} isAnimationActive={false} />
              <Area type="monotone" dataKey="金" stackId="a" stroke={C_GOLD} fill={C_GOLD} fillOpacity={0.85} strokeWidth={0.5} isAnimationActive={false} />
              <Area type="monotone" dataKey="現金" stackId="a" stroke={C_CASH} fill={C_CASH} fillOpacity={0.6} strokeWidth={0.5} isAnimationActive={false} />
              <Line type="monotone" dataKey="目安下" stroke={C_BAND} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="目安上" stroke={C_BAND} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              <ReferenceLine x={shownAge} stroke={INK} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#0a0a0a]/65">
          <span><span className="mr-1 inline-block h-2 w-2" style={{ background: C_RISKY }} />運用（NISA・特定口座・DC等）</span>
          <span><span className="mr-1 inline-block h-2 w-2" style={{ background: C_CASH }} />現金</span>
          <span><span className="mr-1 inline-block h-0 w-4 border-t-2 border-dashed align-middle" style={{ borderColor: C_BAND }} />運用の割合の目安（100−年齢〜120−年齢）</span>
        </div>

        <input
          type="range"
          min={plan.curAge}
          max={plan.endAge}
          step={1}
          value={shownAge}
          onChange={(e) => setAge(Number(e.target.value))}
          className="mt-3 w-full accent-[#557593]"
          aria-label="配分を見る年齢"
        />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {STAGES.filter((s) => s.to >= plan.curAge && s.from <= plan.endAge).map((s) => {
            const a = Math.max(plan.curAge, s.from);
            const on = s.key === stage.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setAge(a)}
                className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                style={{ background: on ? "var(--lp-primary)" : "#f0f0ee", color: on ? "#fff" : INK }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* 選んだ年齢の読み取り */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
          <div className="px-3 py-2" style={INNER}>
            <p className="text-[10px] font-bold text-[#0a0a0a]/55">{shownAge}歳の配分（このプランの見込み）</p>
            {row && row.total > 0 ? (
              <p className="mt-0.5 text-[13px] font-bold tabular-nums">
                運用 {row.運用}% ／ 現金 {row.現金}%{row.金 > 0 ? ` ／ 金 ${row.金}%` : ""}
                <span className="ml-2 text-[10px] font-normal text-[#0a0a0a]/55">目安 {band.lo}〜{band.hi}%</span>
              </p>
            ) : (
              <p className="mt-0.5 text-[12px] text-[#0a0a0a]/55">この年は金融資産がありません</p>
            )}
          </div>
          <div className="px-3 py-2 text-[11px] leading-relaxed" style={note(position === "in" ? "green" : position ? "yellow" : "blue")}>
            {positionText ? (
              <>
                <b>{positionText}。</b>
                {position === "high"
                  ? " 使う時期が近いお金（教育費・住宅・退職後数年の生活費）を預金などに分けておくと、下落のときの影響が小さくなります。"
                  : position === "low"
                    ? " 守り寄りです。長期で使わないお金があれば、NISAの積立を増やす余地があります（インフレで現金の価値は目減りします）。"
                    : " このまま進めて問題のない範囲です。年1回、割合がずれていないか見直します。"}
                {firstOut && firstOut.age > plan.curAge && position === "in" ? ` ${firstOut.age}歳ごろから目安を外れるので、その前に見直すのが目安です。` : ""}
              </>
            ) : (
              "年齢を選ぶと、その年の割合と目安との差を出します。"
            )}
          </div>
        </div>

        <p className="mt-3 text-[12px] font-bold text-[#0a0a0a]">{stage.title}</p>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {stage.points.map((p) => (
            <li key={p} className="flex gap-2 text-[12px] leading-relaxed text-[#0a0a0a]/80">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--lp-primary)" }} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-relaxed text-[#0a0a0a]/50">
          ※ このシミュレーターは自動でリバランスしません（入力した利回りで各口座を運用し、不足時に取り崩す計算）。目安は人によって大きく変わり、
          運用資産の中の株式・債券の比率までは見ていません。一般的な考え方の紹介であり、個別の投資助言ではありません。
        </p>
      </div>
    </section>
  );
}
