"use client";

import { deathCoverAt, normalizeInsurance } from "@/lib/v4/calc/insurance";
import Link from "next/link";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { InheritanceGuide } from "@/components/v4/InheritanceGuide";
import { WarningsPanel } from "@/components/v4/WarningsPanel";
import { useIsNarrow } from "@/components/v4/useIsNarrow";
import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { ageOn } from "@/lib/v4/calc/age";
import { deflator } from "@/lib/v4/calc/realValue";
import { requiredCoverage, simulate } from "@/lib/v4/calc/simulate";
import { buildSurvivorPhases as buildPhases } from "@/lib/v4/calc/survivor";
import type { RiskInput, YearlyResult } from "@/lib/v4/calc/types";
import { usePlanStore } from "@/store/v4/plan-store";
import { useSimResult } from "@/store/v4/useSimResult";
import { useUiStore } from "@/store/v4/ui-store";

const INK = "#0a0a0a";
const RED = "#c8383a";
const GREEN = "#22863a";

const man = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(2)}億円`;
  return `${sign}${abs.toLocaleString()}万円`;
};
const axisFmt = (yen: number) =>
  Math.abs(yen) >= 100_000_000 ? `${(yen / 100_000_000).toFixed(1)}億` : `${Math.round(yen / 10000)}万`;

const financial = (r: YearlyResult) => r.ass.c + r.ass.nisa + r.ass.toku + r.ass.k + r.ass.g + r.ass.dc;

const WHO_OPTIONS: { value: RiskInput["who"]; label: string }[] = [
  { value: "self", label: "本人が亡くなった場合" },
  { value: "spouse", label: "配偶者が亡くなった場合" },
];
const SEX_OPTIONS: { value: RiskInput["spouseSex"]; label: string }[] = [
  { value: "female", label: "妻" },
  { value: "male", label: "夫" },
];

function Section({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-flex h-5 items-center px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white"
          style={{ background: INK, borderRadius: 4 }}
        >
          {no}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">{title}</p>
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-white p-3" style={{ border: `2px solid ${INK}18` }}>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/55">{label}</span>
      <span className="text-xl font-bold tabular-nums" style={{ color: color ?? INK }}>
        {value}
      </span>
      {sub ? <span className="text-[10px] leading-relaxed text-[#0a0a0a]/55">{sub}</span> : null}
    </div>
  );
}

export default function RiskPage() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const risk = plan.risk;
  const update = (patch: Partial<RiskInput>) => setField("risk", { ...risk, ...patch });

  const hasSpouse = ageOn(plan.spouseBirth, plan.baseDate) !== null;
  const who = hasSpouse ? risk.who : "self";
  const deathAge = Math.min(plan.endAge - 1, Math.max(plan.curAge, risk.deathAge));
  const effPlan = useMemo(
    () => ({ ...plan, risk: { ...risk, who, deathAge } }),
    [plan, risk, who, deathAge],
  );

  const real = useUiStore((s) => s.realValue);
  const compact = useIsNarrow();
  const base = useSimResult(effPlan);
  const death = useSimResult(effPlan, { death: true });
  const needNominal = useMemo(() => requiredCoverage(effPlan), [effPlan]);
  // 相続の計算は名目の金額で行い、最後に「今の価値」に割り戻す（換算済みの行を渡すと二重に割り戻してしまう）
  const baseNominal = useMemo(() => simulate(effPlan), [effPlan]);
  // 保険金は死亡時に受け取る額。「今の価値」表示なら死亡時点までの物価で割り戻す
  const need = needNominal === null ? null : real ? needNominal / deflator(effPlan, deathAge) : needNominal;

  if (!hydrated) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/60">
        読み込み中…
      </main>
    );
  }

  const deathRow = death.rows.find((r) => r.age === deathAge);
  // 保険の一覧（入力 → 支出 → 保険）のうち、亡くなる人にかかっている分
  const listCover = deathCoverAt(
    (plan.ins ?? []).map((p) => normalizeInsurance(p as never, plan.curAge, plan.endAge)),
    who === "self" ? "本人" : "配偶者",
    deathAge,
  );
  const insLumpTotal = (risk.deathInsurance || 0) + listCover.lump;
  const incomeProtTotalM = (risk.incomeProtM || 0) + listCover.incomeProtM;
  const lumpOther = (deathRow?.deathLump ?? 0) - insLumpTotal / (real ? deflator(effPlan, deathAge) : 1);
  const survTotal = death.rows.reduce((a, r) => a + r.survKiso + r.survKosei + r.survChukorei, 0);
  const firstSurv = death.rows.find((r) => r.dead && r.survKiso + r.survKosei + r.survChukorei > 0);
  const phases = buildPhases(death.rows);
  const spouseAgeAt = (selfAge: number) => {
    const sa = ageOn(plan.spouseBirth, plan.baseDate);
    return sa === null ? null : sa + (selfAge - plan.curAge);
  };
  const survivorAge = (selfAge: number) => (who === "self" ? spouseAgeAt(selfAge) : selfAge);
  const survivorLabel = who === "self" ? (risk.spouseSex === "female" ? "妻" : "夫") : risk.spouseSex === "female" ? "夫" : "妻";
  const noSurvivor = !hasSpouse && plan.kids.length === 0;

  // 亡くなった場合は、年下の配偶者が最終年齢になるまで計算が続く（本人の年齢の軸で、最終年齢より先まで）
  const chartData = death.rows.map((r) => {
    const b = base.rows.find((x) => x.age === r.age);
    return {
      age: r.age,
      いまのプラン: b ? Math.round(financial(b)) : null,
      亡くなった場合: Math.round(financial(r)),
    };
  });

  const covered = need === 0;
  // 本人が亡くなる試算は、年下の配偶者が最終年齢になるまで続ける
  const untilText = who === "self" && death.rows.length > base.rows.length ? `配偶者が${plan.endAge}歳になるまで` : `${plan.endAge}歳（本人の年齢換算）まで`;

  return (
    <main className="px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 border-b-2 border-[#0a0a0a] pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0a0a0a]/50">もしも</p>
          <h1 className="text-2xl font-bold text-[#0a0a0a]">
            もしも、{who === "self" ? "本人" : "配偶者"}が亡くなったら
          </h1>
          <p className="mt-1 text-[12px] leading-relaxed text-[#0a0a0a]/65">
            遺族年金・死亡退職金・団信・保険を織り込んで、残された家族が最後まで暮らせるかを試算します。足りない分が「必要保障額」です。下には、年代ごとの「相続の備え」もまとめています。
          </p>
        </div>

        {/* 引き継ぎ書への入口。濃い緑のべた塗りで、ほかのカードと違う特別な扱いに */}
        <Link
          href="/v5/handover"
          className="mb-6 flex items-center gap-3 rounded-xl px-4 py-4 transition-opacity hover:opacity-90"
          style={{ background: "#1d5c30", border: "2.5px solid #14401f", boxShadow: "0 3px 0 #14401f" }}
        >
          <span className="text-2xl" aria-hidden>✉</span>
          <span className="flex flex-1 flex-col">
            <span className="text-sm font-bold text-white">家族に渡す「お金の引き継ぎ書」をつくる</span>
            <span className="text-[11px] leading-relaxed text-white/75">
              資産・負債・保険・毎月の契約・デジタル・重要書類の場所・手続きを、入力済みの内容から自動でまとめ、A4のPDFで保存・印刷できます
            </span>
          </span>
          <span className="text-sm font-bold text-white" aria-hidden>→</span>
        </Link>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr]">
          {/* 条件 */}
          <aside className="flex flex-col gap-2 self-start rounded-xl bg-white p-4" style={{ border: `2.5px solid ${INK}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a]">条件</p>
            {hasSpouse ? (
              <SelectField label="誰が" value={who} onChange={(v) => update({ who: v })} options={WHO_OPTIONS} />
            ) : (
              <p className="text-[11px] text-[#0a0a0a]/60">配偶者の生年月日が未入力のため、本人が亡くなった場合で計算します。</p>
            )}
            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">
                <span>いつ（本人の年齢）</span>
                <span style={{ color: RED }}>{deathAge}歳</span>
              </span>
              <input
                type="range"
                min={plan.curAge}
                max={Math.max(plan.curAge, Math.min(plan.endAge - 1, 85))}
                value={deathAge}
                onChange={(e) => update({ deathAge: Number(e.target.value) })}
                className="w-full accent-[#c8383a]"
              />
              <span className="text-[10px] text-[#0a0a0a]/50">FPは「今亡くなったら」を基準に考えるのが一般的</span>
            </label>
            {hasSpouse ? (
              <SelectField
                label="配偶者は"
                value={risk.spouseSex}
                onChange={(v) => update({ spouseSex: v })}
                options={SEX_OPTIONS}
                hint="遺族年金の条件が妻と夫で違うため"
              />
            ) : null}
            <PercentField
              label="亡くなった後の生活費"
              value={risk.livingRate}
              onChange={(v) => update({ livingRate: v })}
              step={5}
              min={0}
              max={100}
              hint="今の生活費・特別費に対する割合。目安は子あり7割、夫婦のみ6割"
            />
            {plan.useHomeLoan && who === "self" ? (
              <CheckboxField
                label="住宅ローンに団信あり"
                value={risk.danshin}
                onChange={(v) => update({ danshin: v })}
                hint="亡くなると残債が0になる"
              />
            ) : null}
            <div className="rounded-lg bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ border: `1.5px solid ${INK}20` }}>
              <p className="font-bold">保険の一覧から（{deathAge}歳で亡くなった場合）</p>
              <p className="tabular-nums">
                死亡保険金 {man(listCover.lump)}
                {listCover.incomeProtM > 0 ? `／収入保障 月${(listCover.incomeProtM / 10000).toFixed(1)}万円` : ""}
              </p>
              <p className="text-[10px] text-[#0a0a0a]/55">「入力」→「支出」→「保険」で、被保険者が{who === "self" ? "本人" : "配偶者"}の保険を集計しています。</p>
            </div>
            <NumberField
              label="一覧に入れていない死亡保険金"
              value={risk.deathInsurance}
              onChange={(v) => update({ deathInsurance: v })}
              unit="円"
              hint="勤務先の団体保険など、保険の一覧に入れていないものがあれば"
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="一覧にない収入保障(月)"
                value={risk.incomeProtM}
                onChange={(v) => update({ incomeProtM: v })}
                unit="円"
              />
              <NumberField
                label="受取終了"
                value={risk.incomeProtEndAge}
                onChange={(v) => update({ incomeProtEndAge: v })}
                unit="歳"
                hint="本人の年齢で"
              />
            </div>
          </aside>

          {/* 結果 */}
          <div>
            {noSurvivor ? (
              <div className="mb-6 rounded-xl bg-white p-4 text-[12px] leading-relaxed" style={{ border: `2px solid ${INK}20` }}>
                配偶者・子どもが入力されていないため、遺族年金や死亡保障を考える対象の家族がいません。
                「入力」の基本設定で配偶者の生年月日、支出の教育費で子どもを登録すると試算できます。
              </div>
            ) : (
              <>

            <Section no="01" title="必要保障額">
              <div
                className="mb-3 rounded-xl p-4"
                style={{ background: covered ? "#f0fff4" : "#fff1f1", border: `2.5px solid ${covered ? GREEN : RED}` }}
              >
                <p className="text-[11px] font-bold" style={{ color: covered ? GREEN : RED }}>
                  {need === null ? "必要保障額は出していません" : covered ? "今の備えで足りています" : "今の備えに上乗せして必要な死亡保障"}
                </p>
                <p className="text-3xl font-bold tabular-nums" style={{ color: covered ? GREEN : RED }}>
                  {need === null ? "―" : covered ? "0円" : need === Infinity ? "20億円を超える" : man(need)}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#0a0a0a]/65">
                  {need === null
                    ? `亡くならなくても${base.shortfallAge}歳でお金が足りなくなるプランのため、死亡保障で埋める額としては出していません。`
                    : covered
                      ? `遺族は${untilText}資金ショートしない見込みです。`
                      : need === Infinity
                        ? "保険金をいくら足しても、遺族の暮らしが最後まで続かない計算です。生活費の割合などの条件を確かめてください。"
                        : `この金額の保険金が${deathAge}歳で入れば、遺族が${untilText}資金ショートしない計算です。`}
                </p>

              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kpi
                  label="遺族年金の総額"
                  value={man(survTotal)}
                  sub={firstSurv ? `最初の年 月${Math.round((firstSurv.survKiso + firstSurv.survKosei + firstSurv.survChukorei) / 12 / 1000) / 10}万円` : "対象外"}
                />
                <Kpi
                  label="死亡時の一時金"
                  value={man(Math.max(0, lumpOther))}
                  sub="死亡退職金（勤続年数で按分）・DC死亡一時金"
                />
                <Kpi
                  label="加入中の保険"
                  value={man(insLumpTotal)}
                  sub={incomeProtTotalM > 0 ? `＋収入保障 月${(incomeProtTotalM / 10000).toFixed(1)}万` : "死亡保険金"}
                />
                <Kpi
                  label="資金ショート"
                  value={death.shortfallAge !== null ? `${death.shortfallAge}歳` : "なし"}
                  sub={base.shortfallAge !== null ? `いまのプランは ${base.shortfallAge}歳` : "いまのプランはなし"}
                  color={death.shortfallAge !== null ? RED : GREEN}
                />
              </div>
              {who === "self" && plan.useHomeLoan && risk.danshin ? (
                <p className="mt-2 text-[11px] text-[#0a0a0a]/60">
                  団信で住宅ローン残高 {man(base.rows.find((r) => r.age === deathAge)?.hlBal ?? 0)} が0になる前提です。
                </p>
              ) : null}
            </Section>

            <Section no="02" title="遺族年金の内訳">
              {phases.length ? (
                <div className="overflow-hidden rounded-xl bg-white" style={{ border: `2px solid ${INK}18` }}>
                  <table className="w-full text-[10px] sm:text-[11px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-[#0a0a0a]/55" style={{ background: "#f0f0ee" }}>
                        <th className="px-3 py-2">期間（{survivorLabel}の年齢）</th>
                        <th className="px-2 py-2 text-right">遺族基礎</th>
                        <th className="px-2 py-2 text-right">遺族厚生</th>
                        <th className="px-2 py-2 text-right">寡婦加算</th>
                        <th className="px-3 py-2 text-right">月額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phases.map((p) => {
                        const a = survivorAge(p.from);
                        const b = survivorAge(p.to);
                        const total = p.kiso + p.kosei + p.chukorei + p.prot;
                        return (
                          <tr key={p.from} className="border-t" style={{ borderColor: "#0a0a0a12" }}>
                            <td className="px-3 py-2 font-bold">
                              {a !== null && b !== null ? `${a}〜${b}歳` : `本人${p.from}〜${p.to}歳`}
                              {p.prot > 0 ? <span className="ml-1 text-[9px] font-normal text-[#0a0a0a]/50">＋収入保障</span> : null}
                            </td>
                            <td className="whitespace-nowrap px-1.5 py-2 text-right tabular-nums sm:px-2">{p.kiso ? man(p.kiso) : "—"}</td>
                            <td className="whitespace-nowrap px-1.5 py-2 text-right tabular-nums sm:px-2">{p.kosei ? man(p.kosei) : "—"}</td>
                            <td className="whitespace-nowrap px-1.5 py-2 text-right tabular-nums sm:px-2">{p.chukorei ? man(p.chukorei) : "—"}</td>
                            <td className="whitespace-nowrap px-2 py-2 text-right font-bold tabular-nums sm:px-3" style={{ color: GREEN }}>
                              {(total / 12 / 10000).toFixed(1)}万円
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="px-3 py-2 text-[10px] leading-relaxed text-[#0a0a0a]/55" style={{ background: "#f0f0ee" }}>
                    各期間の最初の年の年額。遺族年金は非課税。65歳以降は{survivorLabel}自身の老齢年金（この表には含めない）が優先され、遺族厚生年金は差額だけになります。
                  </p>
                </div>
              ) : (
                <p className="rounded-xl bg-white p-4 text-[12px] text-[#0a0a0a]/65" style={{ border: `2px solid ${INK}18` }}>
                  この条件では遺族年金は出ません（18歳年度末までの子がいない、亡くなる人が厚生年金に加入していない、夫が遺族で55歳未満 など）。
                </p>
              )}
            </Section>

            <Section no="03" title="金融資産の推移">
              <div className="rounded-xl bg-white p-3" style={{ border: `2px solid ${INK}18` }}>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
                      <CartesianGrid stroke="rgba(10,10,10,0.08)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="age" tick={{ fill: INK, fontSize: 11 }} tickLine={false} />
                      <YAxis tickFormatter={axisFmt} tick={{ fill: INK, fontSize: 11 }} width={56} tickLine={false} />
                      <Tooltip
                        formatter={(v) => man(Number(v))}
                        labelFormatter={(l) => `本人${l}歳`}
                        position={compact ? { y: 0 } : undefined}
                        wrapperStyle={{ pointerEvents: "none", zIndex: 5 }}
                        contentStyle={compact ? { fontSize: 10, padding: "4px 8px" } : undefined}
                      />
                      <ReferenceLine y={0} stroke={INK} />
                      <ReferenceLine x={deathAge} stroke={RED} strokeDasharray="4 3" label={{ value: "死亡", fill: RED, fontSize: 10, position: "top" }} />
                      <Line type="monotone" dataKey="いまのプラン" stroke="#94a3b8" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="亡くなった場合" stroke={RED} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-[10px] text-[#0a0a0a]/55">
                  現金・NISA・特定口座・DC等の合計。ローン残高は差し引いていません。
                </p>
              </div>
              <div className="mt-3">
                <WarningsPanel warnings={death.warnings} />
              </div>
            </Section>

              </>
            )}

            <InheritanceGuide plan={plan} base={baseNominal} real={real} no={noSurvivor ? "01" : "04"} />



            <Section no={noSurvivor ? "02" : "05"} title="計算の前提">
              <ul className="flex flex-col gap-1.5 rounded-xl bg-white p-4 text-[11px] leading-relaxed text-[#0a0a0a]/70" style={{ border: `2px solid ${INK}18` }}>
                <li>遺族年金は令和8年度の額（遺族基礎847,300円、子の加算243,800円・3人目以降81,300円、中高齢寡婦加算635,500円）。毎年「年金額の改定率」で改定。</li>
                <li>遺族厚生年金は報酬比例部分の3/4。在職中の死亡は加入300月とみなす。夫は妻の死亡時55歳以上が条件で、支給は60歳から（子がいる間は例外）。</li>
                <li>亡くなった人の給与・年金は止まり、生活費は上の割合に。亡くなった人が被保険者の保険料も止まる。新しい積立（NISA・iDeCo等）は止めて計算。</li>
                <li>在職中なら退職金を勤続年数で按分して死亡退職金に。死亡退職金・死亡保険金は相続税の非課税枠（500万円×法定相続人）の範囲とみなし、税は引いていない。</li>
                <li>遺族の税金は、ひとり親控除（子あり）または寡婦控除（子のない妻）を反映。国民年金の第3号だった配偶者は第1号として保険料を払う計算。</li>
                <li>含めていないもの: 寡婦年金・死亡一時金、経過的寡婦加算、2028年4月からの遺族年金の見直し。上の資産の推移では相続税を差し引いていない（相続税は「相続の備え」で別に計算）。</li>
              </ul>
            </Section>

            <div className="flex flex-wrap justify-between gap-2 text-[12px] font-bold">
              <Link href="/v5/suggest" className="underline hover:text-[#c8383a]">← 比較</Link>
              <Link href="/v5/handover" className="underline hover:text-[#c8383a]">家族に渡す引き継ぎ書 →</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
