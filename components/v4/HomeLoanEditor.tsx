"use client";

import { useMemo } from "react";

import { note } from "@/components/v4/frame";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { LoanPartsEditor, mixParts, pairParts } from "@/components/v4/LoanPartsEditor";
import { useVBase } from "@/components/v4/useVBase";
import { pmt } from "@/lib/v4/calc/finance";
import { loanParts, loanTotals, scheduleLoans } from "@/lib/v4/calc/homeLoan";
import type { HomeLoanPart, LoanPrepay, PlanInput } from "@/lib/v4/calc/types";

// 住宅ローンの入力。ふだんは1本の簡単な欄だけ。
// 「くわしく設定」を開くと、ミックスローン（固定＋変動）・返済方法・繰上返済の予定を入れられる。
// どの組み合わせでも、下に「毎月いくら・何歳で返し終わるか」をその場で出して、入力の意味が見えるようにする


const man = (yen: number) => `${Math.round(yen / 10000).toLocaleString()}万円`;

export function HomeLoanEditor({
  plan,
  setField,
  patch,
  fixedStart,
}: {
  plan: PlanInput;
  setField: <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => void;
  patch: (p: Partial<PlanInput>) => void;
  fixedStart?: number; // 家を買う予定の人: 返済開始は買う年齢に固定（欄を出さない）
}) {
  // ver6.3: 配偶者がいれば、ローンの名義（本人／配偶者）を選べる。ペアローンは1本ずつ
  const owners = useVBase() === "/v6" && !!plan.spouseBirth;
  // 画面には入力中の中身をそのまま出す（残高0でも消さない）。計算側（loanParts）は残高のある分だけ使う
  const detailed = !!plan.hlParts?.length;
  const parts = detailed ? plan.hlParts! : loanParts(plan);
  const prepays = plan.hlPrepays ?? [];

  // 返済予定のまとめ（毎月の返済額・返し終わる年齢・利息の合計）
  const sched = useMemo(() => (loanParts(plan).length ? scheduleLoans(plan) : null), [plan]);
  const monthlyNow = sched ? sched.summaries.reduce((a, x) => a + x.firstMonthly, 0) : 0;
  const totalInterest = sched ? sched.summaries.reduce((a, x) => a + x.totalInterest, 0) : 0;

  const setParts = (next: HomeLoanPart[]) => {
    // 合計の欄（ほかの画面の表示・Liteとの互換に使う）も一緒に合わせる。
    // くわしい設定では名義を1本ごとに持つので、1本のときの名義（hlOwner）は消しておく
    patch({ hlParts: next, ...loanTotals(next), hlOwner: undefined });
  };
  // 1本のときに選んでいた名義を、分けたあとのローンに引き継ぐ
  const keepOwner = (list: HomeLoanPart[]) => (plan.hlOwner === "spouse" ? list.map((p) => ({ ...p, owner: "spouse" as const })) : list);

  const toDetailed = () => {
    // 今の1本の入力を、そのまま「変動・元利均等」の1本として詳しい設定に引き継ぐ
    setParts([{ label: "ローン1", bal: plan.hlBal, years: plan.hlTerm, rate: plan.hlRate, rateType: "variable", method: "annuity", rule5y: true, ...(plan.hlOwner === "spouse" ? { owner: "spouse" as const } : {}) }]);
  };
  const toPair = () => setParts(pairParts(plan.hlBal, plan.hlTerm, plan.hlRate));
  // 固定と変動のミックス: 今の残高を半分ずつに分けた2本ですぐ始められるようにする（割合はあとでスライダーで）
  const toMix = () => setParts(keepOwner(mixParts(plan.hlBal, plan.hlTerm, plan.hlRate)));

  // 毎月の返済額（元利均等）。入れると借入額を逆算する
  const r12 = plan.hlRate / 100 / 12;
  const n = Math.max(1, plan.hlTerm * 12);
  const monthlyOf = (bal: number) => (bal > 0 ? pmt(r12, n, bal) : 0);
  const balOf = (monthly: number) => (r12 === 0 ? monthly * n : (monthly * (1 - Math.pow(1 + r12, -n))) / r12);
  const danshin = plan.risk?.danshin ?? true;
  const toSimple = () => {
    if (parts.length > 1 && !confirm(`くわしい設定（2本目以降・返済方法${owners ? "・ローンごとの名義" : ""}など）を消して、1本の簡単な入力に戻しますか？`)) return;
    // 1本に戻すときの名義: 全部が配偶者名義なら配偶者、そうでなければ本人
    patch({ hlParts: undefined, ...loanTotals(parts), hlOwner: parts.length > 0 && parts.every((p) => p.owner === "spouse") ? "spouse" : undefined });
  };

  const setPrepays = (next: LoanPrepay[]) => setField("hlPrepays", next.length ? next : undefined);

  return (
    <div className="flex flex-col gap-2">
      {!detailed ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label={fixedStart !== undefined ? "借入額" : "ローン残高"} value={plan.hlBal} onChange={(v) => setField("hlBal", v)} unit="円" />
            <PercentField label="金利" value={plan.hlRate} onChange={(v) => setField("hlRate", v)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fixedStart !== undefined ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">返済開始</span>
                <div className="flex h-[34px] items-center justify-end px-2 text-xs font-bold tabular-nums text-[#0a0a0a]/55" style={{ background: "#f0f0ee", borderRadius: 8 }}>
                  {fixedStart}歳（買う年齢）
                </div>
              </div>
            ) : (
              <NumberField label="返済開始" value={plan.hlStart} onChange={(v) => setField("hlStart", v)} unit="歳" hint="すでに返済中なら、残高は今の額・年数は残りで" />
            )}
            <NumberField label={fixedStart !== undefined ? "返済年数" : "残りの返済年数"} value={plan.hlTerm} onChange={(v) => setField("hlTerm", v)} unit="年" />
          </div>
          <NumberField
            label="毎月の返済額（自動計算）"
            value={Math.round(monthlyOf(plan.hlBal))}
            onChange={(v) => setField("hlBal", Math.round(balOf(v) / 10000) * 10000)}
            unit="円"
            hint="借入額・金利・年数から計算します。毎月の返済額を入れると、借入額を逆算します（元利均等）"
          />
          {owners ? (
            <SelectField
              label="名義（誰のローンか）"
              value={plan.hlOwner ?? "self"}
              onChange={(v) => setField("hlOwner", v === "spouse" ? "spouse" : undefined)}
              options={[
                { value: "self" as const, label: "本人" },
                { value: "spouse" as const, label: "配偶者" },
              ]}
              hint="住宅ローン控除はこの人の税金から引きます。夫婦で1本ずつ借りている（ペアローン）なら、下の「ペアローンにする」へ"
            />
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {owners ? (
              <button type="button" onClick={toPair} className="text-[11px] font-bold underline underline-offset-4 hover:text-[#cf7a4a]">
                ペアローンにする（本人と配偶者で1本ずつ）
              </button>
            ) : null}
            <button type="button" onClick={toMix} className="text-[11px] font-bold underline underline-offset-4 hover:text-[#cf7a4a]">
              固定と変動のミックスにする
            </button>
            <button type="button" onClick={toDetailed} className="text-[11px] font-bold underline underline-offset-4 hover:text-[#cf7a4a]">
              くわしく設定する（元金均等・当初固定・繰上返済の予定）
            </button>
          </div>
        </>
      ) : (
        <LoanPartsEditor parts={parts} setParts={setParts} prepays={prepays} setPrepays={setPrepays} curAge={plan.curAge} start={fixedStart ?? plan.hlStart} onSimple={toSimple} owners={owners} />
      )}

      <CheckboxField
        label="団体信用生命保険（団信）に入っている"
        value={danshin}
        onChange={(v) => patch({ risk: { ...plan.risk, danshin: v } })}
        hint={
          owners
            ? "名義の人が亡くなると、その人の名義のローンが0になります（ペアローンは、それぞれが自分のローンの団信に入っている前提）。「もしも」の試算と引き継ぎ書に連動します"
            : "本人が亡くなると、残りの住宅ローンが0になります。「もしも」の試算と引き継ぎ書に連動します"
        }
      />
      {owners && parts.some((p) => p.owner === "spouse") ? (
        <div className="px-3 py-2 text-[11px] leading-relaxed" style={note("blue")}>
          住宅ローン控除は、名義の人それぞれの年末残高 × 0.7% を、その人の所得税・住民税から引きます（借入限度額は1人ずつ）。
          収入のない人の名義の分は控除を受けられません。控除を受けられるのは、家の持分がある人だけです。
          <br />
          団信は「名義の人が亡くなると、その人の名義の分が0になる」計算です。次の契約は、この計算と違う結果になります:
          連帯債務で主な債務者だけが団信に入っている（その人が亡くなると全額が0、もう1人のときは0にならない）／
          夫婦連生団信（どちらが亡くなっても2人分が0）／片方だけ団信がない。
          連帯債務は持分の割合で2本に分けて入れると控除は近い結果になりますが、団信の金額は契約に合わせて読み替えてください。
          収入合算で保証人になっているだけ（連帯保証）なら、1本・借りた人の名義で入れます。
        </div>
      ) : null}

      {!owners && plan.spouseBirth && loanParts(plan).some((p) => p.owner === "spouse") ? (
        <div className="px-3 py-2 text-[11px] leading-relaxed" style={note("yellow")}>
          ver6 でローンの名義を配偶者に設定しています。住宅ローン控除と団信は名義ごとに計算しています（直すときは ver6（/v6）の画面で）。
        </div>
      ) : null}

      {/* どの入力でも、意味がすぐ分かるように「毎月いくら・いつ返し終わるか」をその場で出す */}
      {!detailed && sched && parts.length ? (
        <div className="px-3 py-2 text-[11px] leading-relaxed" style={note("blue")}>
          この入力だと: 毎月の返済 約{Math.round(monthlyNow / 1000) / 10}万円
          {parts.length > 1 ? `（${sched.summaries.map((x, i) => `ローン${i + 1} ${Math.round(x.firstMonthly / 1000) / 10}万`).join("・")}）` : ""}
          ／ {sched.payoffAge !== null ? `${sched.payoffAge}歳ごろ返し終わる` : "この期間では返し終わらない"}
          ／ これから払う利息の合計 約{man(totalInterest)}
          {prepays.length ? "（繰上返済込み）" : ""}
        </div>
      ) : null}
    </div>
  );
}
