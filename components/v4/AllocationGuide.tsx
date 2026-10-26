"use client";

import { useState } from "react";

import type { PlanInput, SimulationSummary } from "@/lib/v4/calc/types";

const INK = "#0a0a0a";

// 年齢ごとの資産配分（リバランス）の一般的な考え方。
// 個別の推奨ではなく、よく挙げられる考え方と「このプランのまま進んだ場合の配分」を並べて見せる。
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
      "使う予定のない長期のお金は、株式中心で積み立てる考え方が一般的。下がっても取り戻す時間がある",
      "生活費の6〜12か月分は、運用とは別に預金で持っておく（生活防衛資金）",
      "リバランスは「年1回」か「目標の比率から±5%以上ずれたら」が目安。売らずに、毎月の積立の配分を変えて調整すれば税金もかからない",
      "NISAのつみたて投資枠・iDeCoの非課税枠を先に使う",
    ],
  },
  {
    key: "mid",
    label: "40代",
    from: 40,
    to: 49,
    title: "支出のピーク期：使う時期が決まったお金を分ける",
    points: [
      "教育費・住宅の頭金など、5年以内に使うお金は運用から外して預金などで確保する",
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
      "退職10年前ごろから、株式の比率を少しずつ下げていく考え方がある（ターゲットイヤー型の投信も同じ発想）",
      "退職直後に暴落が来ると影響が大きい。生活費の2〜3年分を預金・債券など値動きの小さい資産で持つ「バケット」の考え方",
      "iDeCo・企業型DCの受取方法（一時金・年金）と、退職金との受取時期を決めておく",
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
      "「毎年、資産の4%前後を取り崩す」などのルールで考える方法がよく紹介される（相場によって調整）",
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
      "相続の準備は「もしもの備え」タブの「相続の備え」を参照",
    ],
  },
];

function stageOf(age: number): Stage {
  return STAGES.find((s) => age >= s.from && age <= s.to) ?? STAGES[STAGES.length - 1];
}

export function AllocationGuide({ plan, base }: { plan: PlanInput; base: SimulationSummary }) {
  const stages = STAGES.filter((s) => s.to >= plan.curAge);
  const [key, setKey] = useState(stageOf(plan.curAge).key);
  const stage = STAGES.find((s) => s.key === key) ?? stages[0];
  // そのステージの代表年齢（現在のステージなら今の年齢）
  const repAge = Math.min(plan.endAge, Math.max(plan.curAge, stage.from === 0 ? plan.curAge : Math.round((stage.from + Math.min(stage.to, stage.from + 9)) / 2)));
  const row = base.rows.find((r) => r.age === repAge) ?? base.rows[0];

  const cash = Math.max(0, row?.ass.c ?? 0);
  const risky = (row?.ass.nisa ?? 0) + (row?.ass.toku ?? 0) + (row?.ass.dc ?? 0) + (row?.ass.k ?? 0);
  const gold = row?.ass.g ?? 0;
  const total = cash + risky + gold;
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  // よく挙げられる目安「100−年齢」〜「120−年齢」（%）を運用資産の比率の参考帯として表示
  const lo = Math.max(0, Math.min(100, 100 - repAge));
  const hi = Math.max(0, Math.min(100, 120 - repAge));
  const myRisky = pct(risky);
  const position =
    total <= 0 ? null : myRisky > hi ? "参考帯より運用の比率が高め" : myRisky < lo ? "参考帯より運用の比率が低め（守り寄り）" : "参考帯の範囲内";

  return (
    <section className="mt-10">
      <div className="mb-3 border-b-2 border-[#0a0a0a] pb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">Allocation by age</p>
        <h2 className="text-lg font-bold text-[#0a0a0a]">年齢ごとの資産配分の考え方</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#0a0a0a]/60">
          一般によく挙げられる考え方と、このプランのまま進んだときの「現金」と「運用資産」の割合を並べています。
          特定の商品や配分をすすめるものではありません。
        </p>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {stages.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setKey(s.key)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold"
            style={{
              background: s.key === key ? INK : "#fff",
              color: s.key === key ? "#fff" : INK,
              border: `2px solid ${INK}`,
            }}
          >
            {s.label}
            {s.key === stageOf(plan.curAge).key ? <span className="ml-1 text-[9px] opacity-70">いま</span> : null}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-white p-4" style={{ border: `2.5px solid ${INK}` }}>
        <p className="text-sm font-bold text-[#0a0a0a]">{stage.title}</p>

        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between text-[11px]">
            <span className="font-bold">{repAge}歳時点のあなたの配分（このプランの見込み）</span>
            <span className="text-[10px] text-[#0a0a0a]/55">運用 {myRisky}%</span>
          </div>
          <div className="relative h-6 w-full overflow-hidden rounded" style={{ background: "#0a0a0a10" }}>
            {total > 0 ? (
              <div className="flex h-full w-full">
                <div style={{ width: `${pct(cash)}%`, background: "#64748b" }} title={`現金 ${pct(cash)}%`} />
                <div style={{ width: `${myRisky}%`, background: "#22863a" }} title={`運用 ${myRisky}%`} />
                <div style={{ width: `${pct(gold)}%`, background: "#c9aa7c" }} title={`金 ${pct(gold)}%`} />
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#0a0a0a]/65">
            <span><span className="mr-1 inline-block h-2 w-2" style={{ background: "#64748b" }} />現金 {pct(cash)}%</span>
            <span><span className="mr-1 inline-block h-2 w-2" style={{ background: "#22863a" }} />運用（NISA・特定口座・DC等） {myRisky}%</span>
            {gold > 0 ? <span><span className="mr-1 inline-block h-2 w-2" style={{ background: "#c9aa7c" }} />金 {pct(gold)}%</span> : null}
          </div>
          {total > 0 ? (
            <div className="mt-3">
              <p className="mb-1 text-[10px] font-bold text-[#0a0a0a]/60">運用資産の割合（0〜100%）と参考帯</p>
              <div className="relative h-4 w-full rounded" style={{ background: "#0a0a0a10" }}>
                <div
                  className="absolute inset-y-0 rounded"
                  style={{ left: `${lo}%`, width: `${Math.max(1, hi - lo)}%`, background: "#22863a30", border: "1.5px dashed #22863a" }}
                />
                <div className="absolute -top-1 -bottom-1 w-[3px] rounded" style={{ left: `calc(${myRisky}% - 1.5px)`, background: INK }} />
              </div>
              <div className="relative mt-0.5 h-3 text-[9px] text-[#0a0a0a]/55">
                <span className="absolute" style={{ left: 0 }}>0%</span>
                <span className="absolute -translate-x-1/2" style={{ left: `${lo}%` }}>{lo}%</span>
                <span className="absolute -translate-x-1/2" style={{ left: `${hi}%` }}>{hi}%</span>
                <span className="absolute right-0">100%</span>
              </div>
            </div>
          ) : null}
          <p className="mt-2 rounded-md px-2.5 py-1.5 text-[11px] leading-relaxed" style={{ background: "#f0f0ee" }}>
            参考：よく挙げられる目安「100−年齢」〜「120−年齢」でいうと、{repAge}歳の運用資産の割合は
            <b> {lo}〜{hi}%</b>。
            {position ? <>このプランは<b>{position}</b>です。</> : null}
            <span className="text-[#0a0a0a]/55">（目安は人によって大きく変わります。持っている運用資産の中の株式・債券の比率までは見ていません）</span>
          </p>
        </div>

        <ul className="mt-3 flex flex-col gap-1.5">
          {stage.points.map((p) => (
            <li key={p} className="flex gap-2 text-[12px] leading-relaxed text-[#0a0a0a]/80">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: INK }} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-relaxed text-[#0a0a0a]/50">
          ※ このシミュレーターは自動でリバランスしません（入力した利回りで各口座を運用し、不足時に取り崩す計算）。
          一般的な考え方の紹介であり、個別の投資助言ではありません。判断の前に登録のある専門家にご相談ください。
        </p>
      </div>
    </section>
  );
}
