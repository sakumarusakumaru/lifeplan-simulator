"use client";

import { useState } from "react";

import { ageOn } from "@/lib/v4/calc/age";
import { DEFAULT_INHERIT, basicDeduction, legalHeirs, legalSharesPct, planInheritance } from "@/lib/v4/calc/inheritance";
import { deflator } from "@/lib/v4/calc/realValue";
import type { InheritSettings, PlanInput, SimulationSummary } from "@/lib/v4/calc/types";
import { usePlanStore } from "@/store/v4/plan-store";

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
      "自分の資産を一覧にして、相続税の基礎控除（3,000万円＋600万円×法定相続人）と比べてみる。夫婦の財産は名義ごとに分けて考える",
      "生命保険金・死亡退職金には、それぞれ「500万円×法定相続人」の非課税枠がある",
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

  const setField = usePlanStore((st) => st.setField);
  const set = { ...DEFAULT_INHERIT, ...(plan.inheritSet ?? {}) };
  const updSet = (p: Partial<InheritSettings>) => setField("inheritSet", { ...set, ...p });
  const [showDetail, setShowDetail] = useState(false);

  const at = (age: number) => {
    const a = Math.min(plan.endAge, Math.max(plan.curAge, age));
    const row = base.rows.find((r) => r.age === a) ?? base.rows[0];
    const p = planInheritance(plan, row, hasSpouse, kids, real ? deflator(plan, a) : 1);
    return { age: a, estate: p.breakdown.total, deduction: p.first.deduction, p };
  };
  const repAge = stage.key === current.key ? plan.curAge : stage.rep;
  const est = at(repAge);
  const P = est.p;
  const timeline = stages.map((s) => at(s.key === current.key ? plan.curAge : s.rep));
  const maxEstate = Math.max(basicDeduction(heirs.count), ...timeline.map((t) => t.estate), 1);
  const pct = (r: number) => `${Math.round(r * 100)}%`;
  const b = P.breakdown;
  const twoStep = hasSpouse && kids > 0;
  const best = P.scan.find((x) => x.ratio === P.bestRatio);
  // 分け方を選べるのは、配偶者と子がいる場合と、子が2人以上いる場合
  const canSplit = twoStep || (!hasSpouse && !noFamily && kids >= 2);
  const isCustom = set.spouseMode === "custom" && canSplit;
  const nameOf = (x: { who: string; kid: number }) =>
    x.who === "spouse" ? "配偶者" : noFamily ? "親または兄弟姉妹" : plan.kids[x.kid]?.name || `子${x.kid + 1}`;
  const legalPct = legalSharesPct(hasSpouse, kids);
  const shares = set.shares && set.shares.length === legalPct.length ? set.shares : legalPct;
  const sharesSum = shares.reduce((a, x) => a + x, 0);
  const setMode = (m: InheritSettings["spouseMode"]) => {
    // 「自分で決める」に切り替えたときは、いまの分け方から始める
    if (m === "custom" && !(set.shares && set.shares.length === legalPct.length)) {
      updSet({ spouseMode: m, shares: P.first.people.map((x) => Math.round(x.ratio * 1000) / 10) });
    } else updSet({ spouseMode: m });
  };
  const setShare = (i: number, v: number) => updSet({ shares: shares.map((x, j) => (j === i ? Math.max(0, Math.min(100, v)) : x)) });
  // 二次相続で子がそれぞれ受け取る額と税（子で等分）
  const secondOf = (kid: number) => P.second?.people.find((x) => x.kid === kid);

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
        {/* 試算の条件 */}
        <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg p-2.5 sm:grid-cols-3" style={{ background: "#f7f7f5" }}>
          {hasSpouse ? (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[#0a0a0a]/70">本人名義の財産の割合</span>
              <span className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={set.selfSharePct}
                  onChange={(e) => updSet({ selfSharePct: Number(e.target.value) })}
                  className="flex-1"
                />
                <b className="w-10 text-right text-[12px] tabular-nums">{set.selfSharePct}%</b>
              </span>
              <span className="text-[9px] leading-snug text-[#0a0a0a]/55">現金・運用資産・自宅のうち本人名義の分。残りは配偶者の財産（二次相続で使う）</span>
            </label>
          ) : null}
          {canSplit ? (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[#0a0a0a]/70">{twoStep ? "一次相続の分け方" : "子の分け方"}</span>
              <select
                value={canSplit && !twoStep && set.spouseMode !== "custom" ? "legal" : set.spouseMode}
                onChange={(e) => setMode(e.target.value as InheritSettings["spouseMode"])}
                className="rounded-md bg-white px-2 py-1.5 text-[12px] font-bold"
                style={{ border: `2px solid ${INK}` }}
              >
                {twoStep ? (
                  <>
                    <option value="legal">法定相続分（配偶者1/2・子で1/2を等分）</option>
                    <option value="all">配偶者が全部</option>
                    <option value="cap16">配偶者は1億6,000万円まで</option>
                    <option value="none">配偶者は相続しない（子だけ）</option>
                    <option value="best">一次＋二次の税が最も少ない割合</option>
                  </>
                ) : (
                  <option value="legal">法定相続分（子で等分）</option>
                )}
                <option value="custom">自分で決める（一人ずつ）</option>
              </select>
            </label>
          ) : null}
          {plan.homeOwned ? (
            <label className="flex items-start gap-2 self-center text-[11px] font-bold">
              <input type="checkbox" checked={set.smallLand} onChange={(e) => updSet({ smallLand: e.target.checked })} className="mt-0.5" />
              <span>
                自宅の土地に小規模宅地等の特例を使う
                <span className="block text-[9px] font-normal text-[#0a0a0a]/55">配偶者が相続すると330㎡まで評価が8割減</span>
              </span>
            </label>
          ) : null}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg p-2.5" style={{ background: "#f0f0ee" }}>
            <p className="text-[10px] font-bold text-[#0a0a0a]/55">{est.age}歳で亡くなった場合の相続財産</p>
            <p className="text-base font-bold tabular-nums">{man(b.total)}</p>
            <p className="text-[9px] text-[#0a0a0a]/50">基礎控除 {man(P.first.deduction)}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: "#f0f0ee" }}>
            <p className="text-[10px] font-bold text-[#0a0a0a]/55">相続税の総額（軽減の前）</p>
            <p className="text-base font-bold tabular-nums">{P.first.taxable > 0 ? man(P.first.totalTax) : "0円"}</p>
            <p className="text-[9px] text-[#0a0a0a]/50">分け方に関係なく決まる、家族全体の税</p>
          </div>
          <div className="col-span-2 rounded-lg p-2.5 sm:col-span-1" style={{ background: P.first.payable > 0 ? "#fff1f1" : "#f0fff4" }}>
            <p className="text-[10px] font-bold text-[#0a0a0a]/55">{twoStep ? "一次相続で払う税" : "実際に払う税"}</p>
            <p className="text-base font-bold tabular-nums" style={{ color: P.first.payable > 0 ? RED : GREEN }}>
              {P.first.taxable <= 0 ? "かからない見込み" : P.first.payable > 0 ? man(P.first.payable) : "0円（軽減で）"}
            </p>
            {P.first.spouseRelief > 0 || P.first.minorRelief > 0 ? (
              <p className="text-[9px] text-[#0a0a0a]/50">
                {P.first.spouseRelief > 0 ? `配偶者の税額軽減 −${man(P.first.spouseRelief)}` : ""}
                {P.first.minorRelief > 0 ? `　未成年者控除 −${man(P.first.minorRelief)}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        {isCustom ? (
          <div className="mt-2 rounded-lg p-2.5" style={{ background: "#f7f7f5" }}>
            <p className="text-[10px] font-bold text-[#0a0a0a]/70">一人ずつの割合（%）</p>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {P.first.people.map((x, i) => (
                <label key={`${x.who}${x.kid}`} className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="min-w-0 flex-1 truncate">{nameOf(x)}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={5}
                    value={shares[i] ?? 0}
                    onChange={(e) => setShare(i, Number(e.target.value) || 0)}
                    className="w-16 rounded-md bg-white px-1.5 py-1 text-right tabular-nums"
                    style={{ border: `2px solid ${INK}` }}
                  />
                </label>
              ))}
            </div>
            <p className="mt-1 text-[9px] text-[#0a0a0a]/55">
              合計 {Math.round(sharesSum * 10) / 10}%
              {Math.abs(sharesSum - 100) > 0.05 ? "（100%になっていないので、入れた比率で分けて計算しています）" : ""}
              <button type="button" onClick={() => updSet({ shares: legalPct })} className="ml-2 font-bold underline">
                法定相続分に戻す
              </button>
            </p>
          </div>
        ) : null}

        {P.first.people.length > 0 ? (
          <div className="mt-2 overflow-x-auto rounded-lg p-2.5" style={{ border: `2px solid ${INK}18` }}>
            <p className="text-[11px] font-bold">一人ずつの相続額と税</p>
            <table className="mt-1 w-full min-w-[480px] text-[10px] tabular-nums">
              <thead>
                <tr className="text-[#0a0a0a]/55">
                  <th className="py-1 text-left font-bold">相続する人</th>
                  <th className="py-1 text-right font-bold">割合</th>
                  <th className="py-1 text-right font-bold">{twoStep ? "一次で受け取る" : "受け取る額"}</th>
                  <th className="py-1 text-right font-bold">{twoStep ? "一次の税" : "納める税"}</th>
                  {twoStep ? (
                    <>
                      <th className="py-1 text-right font-bold">二次で受け取る</th>
                      <th className="py-1 text-right font-bold">二次の税</th>
                      <th className="py-1 text-right font-bold">税の合計</th>
                    </>
                  ) : null}
                  <th className="py-1 text-right font-bold">手元に残る</th>
                </tr>
              </thead>
              <tbody>
                {P.first.people.map((x) => {
                  const s2 = x.who === "kid" ? secondOf(x.kid) : undefined;
                  const taxSum = x.payable + (s2?.payable ?? 0);
                  const kept = x.take + (s2?.take ?? 0) - taxSum;
                  const age = x.who === "kid" ? est.age - (plan.kids[x.kid]?.offset ?? 0) : null;
                  return (
                    <tr key={`${x.who}${x.kid}`} className="border-t" style={{ borderColor: "#0a0a0a15" }}>
                      <td className="py-1 font-bold">
                        {nameOf(x)}
                        {age !== null && !noFamily ? <span className="ml-1 font-normal text-[#0a0a0a]/50">{age}歳</span> : null}
                      </td>
                      <td className="py-1 text-right">{Math.round(x.ratio * 1000) / 10}%</td>
                      <td className="py-1 text-right">{man(x.take)}</td>
                      <td className="py-1 text-right">
                        <span style={{ color: x.payable > 0 ? RED : undefined }}>{man(x.payable)}</span>
                        {x.relief > 0 ? (
                          <span className="block text-[9px] text-[#0a0a0a]/50">
                            {x.who === "spouse" ? "配偶者の軽減" : "未成年者控除"} −{man(x.relief)}
                          </span>
                        ) : null}
                      </td>
                      {twoStep ? (
                        <>
                          <td className="py-1 text-right">{s2 ? man(s2.take) : "—"}</td>
                          <td className="py-1 text-right" style={{ color: (s2?.payable ?? 0) > 0 ? RED : undefined }}>
                            {s2 ? man(s2.payable) : "—"}
                          </td>
                          <td className="py-1 text-right font-bold">{man(taxSum)}</td>
                        </>
                      ) : null}
                      <td className="py-1 text-right font-bold">{man(kept)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-1 text-[9px] leading-relaxed text-[#0a0a0a]/55">
              税は「相続税の総額」を受け取る割合で分けたあと、配偶者の税額軽減・未成年者控除（10万円×18歳までの年数）を引いた額です。
              {twoStep ? "配偶者が受け取った分は、配偶者自身の財産と合わせて二次相続で子に等分で引き継ぐとしています（配偶者の「手元に残る」は、二次相続の前の額）。" : ""}
            </p>
          </div>
        ) : null}

        {twoStep ? (
          <div className="mt-2 rounded-lg p-3" style={{ border: `2px solid ${RED}50`, background: "#fffafa" }}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold text-[#0a0a0a]/55">二次相続（配偶者がその後亡くなったとき）</p>
                <p className="text-base font-bold tabular-nums" style={{ color: (P.second?.payable ?? 0) > 0 ? RED : GREEN }}>
                  {(P.second?.payable ?? 0) > 0 ? man(P.second?.payable ?? 0) : "かからない見込み"}
                </p>
                <p className="text-[9px] text-[#0a0a0a]/50">
                  配偶者の財産 {man(P.secondEstate)}・相続人は子{kids}人
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#0a0a0a]/55">一次＋二次の合計</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: P.total > 0 ? RED : GREEN }}>
                  {man(P.total)}
                </p>
                <p className="text-[9px] text-[#0a0a0a]/50">配偶者が {pct(P.spouseRatio)} 相続した場合</p>
              </div>
              {best && P.scan.some((x) => x.total > 0) ? (
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-[#0a0a0a]/55">合計が最も少ない分け方</p>
                  <p className="text-base font-bold tabular-nums" style={{ color: GREEN }}>
                    配偶者 {pct(best.ratio)}：{man(best.total)}
                  </p>
                  {best.total < P.total ? <p className="text-[9px] text-[#0a0a0a]/50">いまの分け方より {man(P.total - best.total)} 少ない</p> : null}
                </div>
              ) : null}
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[10px] tabular-nums">
                <thead>
                  <tr className="text-[#0a0a0a]/55">
                    <th className="py-1 text-left font-bold">配偶者が相続する割合</th>
                    {P.scan.filter((_, i) => i % 5 === 0).map((x) => (
                      <th key={x.ratio} className="py-1 text-right font-bold">
                        {pct(x.ratio)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["first", "second", "total"] as const).map((k) => (
                    <tr key={k} className="border-t" style={{ borderColor: "#0a0a0a15" }}>
                      <td className="py-1 font-bold">{k === "first" ? "一次相続" : k === "second" ? "二次相続" : "合計"}</td>
                      {P.scan.filter((_, i) => i % 5 === 0).map((x) => (
                        <td key={x.ratio} className="py-1 text-right" style={{ fontWeight: k === "total" ? 700 : 400 }}>
                          {man(x[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[9px] leading-relaxed text-[#0a0a0a]/55">
              一次相続で配偶者が多く相続するほど一次の税は軽くなりますが、その分が二次相続で子にかかります。二次相続は、配偶者の財産がその後増えも減りもしない前提の目安です（実際は生活費で減ったり、運用で増えたりします）。
            </p>
          </div>
        ) : null}

        <button type="button" onClick={() => setShowDetail((v) => !v)} className="mt-2 text-[11px] font-bold underline">
          {showDetail ? "計算の内訳を閉じる" : "計算の内訳を見る"}
        </button>
        {showDetail ? (
          <table className="mt-1 w-full text-[11px] tabular-nums">
            <tbody>
              {[
                ["現金・運用資産（本人名義）", b.financial],
                [`自宅${b.homeLandCut > 0 ? `（小規模宅地等の特例 −${man(b.homeLandCut)} の後）` : ""}`, b.home],
                ["投資用不動産", b.realEstate],
                [`死亡保険金 ${man(b.insuranceGross)} のうち非課税枠（500万円×${heirs.count}人）を超える分`, b.insurance],
                [`死亡退職金・DC死亡一時金 ${man(b.retirementGross)} のうち非課税枠を超える分`, b.retirement],
                [`ローン（債務）${plan.risk?.danshin && plan.useHomeLoan ? "。住宅ローンは団信で0になるので含めない" : ""}`, -b.loans],
                ["＝ 相続財産（課税価格）", b.total],
                [`− 基礎控除（3,000万円＋600万円×${heirs.count}人）`, -P.first.deduction],
                ["＝ 課税遺産総額", P.first.taxable],
                ["相続税の総額（法定相続分で分けたと仮定して計算）", P.first.totalTax],
                ["− 配偶者の税額軽減", -P.first.spouseRelief],
                ["− 未成年者控除", -P.first.minorRelief],
                ["＝ 一次相続で払う税", P.first.payable],
              ].map(([label, v]) => (
                <tr key={label as string} className="border-t" style={{ borderColor: "#0a0a0a10" }}>
                  <td className="py-1 pr-2">{label as string}</td>
                  <td className="whitespace-nowrap py-1 text-right font-bold">{man(v as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <ul className="mt-3 flex flex-col gap-1.5">
          {stage.points.map((p) => (
            <li key={p} className="flex gap-2 text-[12px] leading-relaxed text-[#0a0a0a]/80">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: INK }} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-relaxed text-[#0a0a0a]/50">
          ※ 自宅・不動産は購入価格から築年数で減価した目安で、実際の相続税評価（土地は路線価、建物は固定資産税評価額）とは違います。
          小規模宅地等の特例は面積330㎡以内・配偶者が相続する前提です。子がいない場合の親・兄弟姉妹の相続、生前贈与の足し戻し、葬式費用、相次相続控除は含めていない概算です。実際の判断は税理士にご相談ください。
        </p>
      </div>
    </section>
  );
}
