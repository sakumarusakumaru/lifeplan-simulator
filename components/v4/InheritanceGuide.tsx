"use client";

import { useState } from "react";

import { ageOn } from "@/lib/v4/calc/age";
import { basicDeduction, estateAt, estimateInheritanceTax, legalHeirs } from "@/lib/v4/calc/inheritance";
import { deflator } from "@/lib/v4/calc/realValue";
import type { PlanInput, SimulationSummary } from "@/lib/v4/calc/types";

const INK = "#0a0a0a";
const RED = "#c8383a";
const GREEN = "#22863a";

const man = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(2)}億円`;
  return `${sign}${abs.toLocaleString()}万円`;
};

interface Stage {
  key: string;
  label: string;
  from: number;
  to: number;
  rep: number; // 試算に使う年齢
  title: string;
  points: string[];
}

// ステージごとの「相続の備え」（一般的な制度とよく挙げられる準備）
const STAGES: Stage[] = [
  {
    key: "young",
    label: "〜49歳",
    from: 0,
    to: 49,
    rep: 45,
    title: "現役・子育て期：残された家族が困らない準備",
    points: [
      "まずは死亡保障（上の「必要保障額」）。生命保険の受取人が今の家族になっているかを確認",
      "夫婦で、口座・保険・ローン・サブスクの一覧を共有する（ネット証券やスマホ決済などのデジタル資産も）",
      "未成年の子がいる場合、遺言で後見人を指定しておく方法もある",
    ],
  },
  {
    key: "fifty",
    label: "50代",
    from: 50,
    to: 59,
    rep: 55,
    title: "親の相続と、自分の資産の棚卸し",
    points: [
      "親の相続が先に来ることが多い時期。実家や親の口座・保険の把握、相続人どうしの話し合いを早めに",
      "自分の資産を一覧にして、相続税の基礎控除（3,000万円＋600万円×法定相続人）と比べてみる",
      "生命保険金には「500万円×法定相続人」の非課税枠がある",
    ],
  },
  {
    key: "sixty",
    label: "60代",
    from: 60,
    to: 69,
    rep: 65,
    title: "意思を形にする時期：遺言と生前贈与",
    points: [
      "遺言書を用意する。自筆の遺言は法務局で預かってもらえる（自筆証書遺言書保管制度）。公証役場で作る公正証書遺言も確実",
      "暦年贈与は年110万円まで非課税。ただし亡くなる前7年以内の贈与は相続財産に足し戻される（2024年以降の贈与から段階的に延長）",
      "相続時精算課税は2024年から年110万円の基礎控除ができ、その分は足し戻されない。どちらを使うかは税理士に相談を",
      "エンディングノートに、資産の一覧・連絡先・希望を書いておく",
    ],
  },
  {
    key: "seventy",
    label: "70代",
    from: 70,
    to: 79,
    rep: 75,
    title: "判断力が落ちる前の備え",
    points: [
      "認知症になると、預金の引き出しや自宅の売却が難しくなる。任意後見や家族信託を元気なうちに検討",
      "口座や証券会社をまとめて、家族が把握しやすくする",
      "自宅の土地は、配偶者や同居の家族が相続すると評価が下がる特例（小規模宅地等の特例：330㎡まで80%減）がある。要件を確認",
    ],
  },
  {
    key: "eighty",
    label: "80歳〜",
    from: 80,
    to: 200,
    rep: 85,
    title: "一次相続と二次相続をあわせて考える",
    points: [
      "夫婦の一方が亡くなる（一次相続）と、配偶者の税額軽減で税は軽くなりやすい。でも残った配偶者が亡くなる二次相続では相続人が減り、税が重くなりがち",
      "誰が何を相続するかで、二次相続の税額が大きく変わる。両方を通して考える",
      "相続税の申告・納付は、亡くなったことを知った日の翌日から10か月以内",
    ],
  },
];

export function InheritanceGuide({ plan, base, real }: { plan: PlanInput; base: SimulationSummary; real: boolean }) {
  const hasSpouse = ageOn(plan.spouseBirth, plan.baseDate) !== null;
  // 配偶者も子もいない場合は、親または兄弟姉妹の1人が相続すると仮定する
  const noFamily = !hasSpouse && plan.kids.length === 0;
  const kids = noFamily ? 1 : plan.kids.length;
  const heirs = legalHeirs(hasSpouse, kids);
  const stages = STAGES.filter((s) => s.to >= plan.curAge);
  const current = STAGES.find((s) => plan.curAge >= s.from && plan.curAge <= s.to) ?? STAGES[0];
  const [key, setKey] = useState(current.key);
  const stage = STAGES.find((s) => s.key === key) ?? current;

  const at = (age: number) => {
    const a = Math.min(plan.endAge, Math.max(plan.curAge, age));
    const row = base.rows.find((r) => r.age === a) ?? base.rows[0];
    const estate = row ? estateAt(plan, row, heirs.count, real ? deflator(plan, a) : 1) : 0;
    return { age: a, ...estimateInheritanceTax(estate, hasSpouse, kids) };
  };
  const repAge = stage.key === current.key ? plan.curAge : stage.rep;
  const est = at(repAge);
  const timeline = stages.map((s) => at(s.key === current.key ? plan.curAge : s.rep));
  const maxEstate = Math.max(basicDeduction(heirs.count), ...timeline.map((t) => t.estate), 1);

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-flex h-5 items-center px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white"
          style={{ background: INK, borderRadius: 4 }}
        >
          04
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">相続の備え ／ INHERITANCE</p>
      </div>

      <div className="rounded-xl bg-white p-4" style={{ border: `2px solid ${INK}18` }}>
        <p className="text-[12px] leading-relaxed text-[#0a0a0a]/75">
          このプランのまま進んだときの財産（現金・運用資産・自宅や不動産 − ローン）と、相続税の基礎控除を比べています。
          法定相続人は {noFamily ? "親または兄弟姉妹の1人（配偶者・子が未入力のため仮定）" : `${hasSpouse ? "配偶者" : ""}${hasSpouse && kids ? "＋" : ""}${kids ? `子${kids}人` : ""}の${heirs.count}人`} として計算
          （基礎控除 {man(basicDeduction(heirs.count))}）。
        </p>

        {/* 年代ごとの財産と基礎控除 */}
        <div className="mt-3 flex flex-col gap-1.5">
          {timeline.map((t, i) => {
            const over = t.estate > t.deduction;
            return (
              <button
                key={stages[i].key}
                type="button"
                onClick={() => setKey(stages[i].key)}
                className="flex items-center gap-2 text-left"
              >
                <span className="w-12 shrink-0 text-[11px] font-bold tabular-nums" style={{ color: stages[i].key === key ? INK : "#0a0a0a99" }}>
                  {t.age}歳
                </span>
                <span className="relative h-4 flex-1 overflow-hidden rounded" style={{ background: "#0a0a0a0d" }}>
                  <span
                    className="absolute inset-y-0 left-0 rounded"
                    style={{ width: `${Math.max(0, (t.estate / maxEstate) * 100)}%`, background: over ? `${RED}cc` : `${GREEN}aa` }}
                  />
                  <span
                    className="absolute -top-0.5 -bottom-0.5 w-[2px]"
                    style={{ left: `${(t.deduction / maxEstate) * 100}%`, background: INK }}
                    title="基礎控除"
                  />
                </span>
                <span className="w-20 shrink-0 text-right text-[11px] tabular-nums">{man(t.estate)}</span>
              </button>
            );
          })}
          <p className="text-[10px] text-[#0a0a0a]/55">
            黒い線＝基礎控除。棒が線を超える（赤）と相続税がかかる可能性があります。行を押すと下の内容が切り替わります。
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {stages.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setKey(s.key)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold"
            style={{ background: s.key === key ? INK : "#fff", color: s.key === key ? "#fff" : INK, border: `2px solid ${INK}` }}
          >
            {s.label}
            {s.key === current.key ? <span className="ml-1 text-[9px] opacity-70">いま</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-2 rounded-xl bg-white p-4" style={{ border: `2.5px solid ${INK}` }}>
        <p className="text-sm font-bold text-[#0a0a0a]">{stage.title}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg p-2.5" style={{ background: "#f0f0ee" }}>
            <p className="text-[10px] font-bold text-[#0a0a0a]/55">{est.age}歳時点の財産の目安</p>
            <p className="text-base font-bold tabular-nums">{man(est.estate)}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: "#f0f0ee" }}>
            <p className="text-[10px] font-bold text-[#0a0a0a]/55">基礎控除</p>
            <p className="text-base font-bold tabular-nums">{man(est.deduction)}</p>
          </div>
          <div className="col-span-2 rounded-lg p-2.5 sm:col-span-1" style={{ background: est.payable > 0 ? "#fff1f1" : "#f0fff4" }}>
            <p className="text-[10px] font-bold text-[#0a0a0a]/55">相続税の目安（家族全体）</p>
            <p className="text-base font-bold tabular-nums" style={{ color: est.payable > 0 ? RED : GREEN }}>
              {est.taxable > 0 ? man(est.payable) : "かからない見込み"}
            </p>
            {est.taxable > 0 && hasSpouse ? (
              <p className="text-[9px] text-[#0a0a0a]/50">配偶者が法定相続分を相続した場合（税額軽減後）</p>
            ) : null}
          </div>
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
          ※ 自宅・不動産は購入価格から築年数で減価した目安で、実際の相続税評価（路線価・固定資産税評価額）や小規模宅地等の特例は入れていません。
          子がいない場合の親・兄弟姉妹の相続、生前贈与の足し戻し、二次相続も含めていない概算です。実際の判断は税理士にご相談ください。
        </p>
      </div>
    </section>
  );
}
