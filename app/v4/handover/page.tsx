"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FieldInput, FieldView, manYen as man } from "@/components/v4/handover/HandoverFields";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { TextField } from "@/components/v4/inputs/TextField";
import { ageOn } from "@/lib/v4/calc/age";
import {
  autoContacts,
  autoSources,
  buildAfterDeathSteps,
  insuranceRows,
  itemAmount,
  monthlyPayments,
  newItemId,
  syncHandoverItems,
} from "@/lib/v4/calc/handover";
import {
  CAT_STATUS,
  CATEGORIES,
  DOCUMENTS,
  LOOKUP_GUIDE,
  INSURANCE_EXTRA,
  PENSION_FIELDS,
  PROFILE_FIELDS,
  SIDE_TITLE,
  WISH_FIELDS,
  type CategoryDef,
  type FieldDef,
  type Side,
} from "@/lib/v4/calc/handoverSchema";
import { DEFAULT_INHERIT, inheritanceTax, legalHeirs, planInheritance, realEstateEval } from "@/lib/v4/calc/inheritance";
import { normalizeInsurance } from "@/lib/v4/calc/insurance";
import { requiredCoverage, simulate } from "@/lib/v4/calc/simulate";
import { buildSurvivorPhases } from "@/lib/v4/calc/survivor";
import type { HandoverContact, HandoverInput, HandoverItem, HandoverPolicy } from "@/lib/v4/calc/types";
import { usePlanStore } from "@/store/v4/plan-store";
import { useSecretStore } from "@/store/v4/secret-store";

const INK = "#0a0a0a";
const RED = "#c8383a";
const GREEN = "#22863a";
const GOLD = "#b8860b";

const WILL_OPTIONS: { value: HandoverInput["will"]; label: string }[] = [
  { value: "none", label: "まだ用意していない" },
  { value: "self", label: "自筆の遺言書がある（自宅などで保管）" },
  { value: "hokan", label: "自筆の遺言書を法務局に預けている" },
  { value: "notary", label: "公正証書遺言がある（公証役場）" },
];

const CONTACT_ROLES = [
  "勤務先（総務・人事）",
  "親族",
  "友人・知人（訃報を知らせる人）",
  "税理士",
  "弁護士・司法書士",
  "保険の担当者",
  "証券会社・銀行の担当者",
  "菩提寺・宗教者",
  "かかりつけ医",
  "ケアマネジャー・施設",
  "その他",
];

const SIDES: Side[] = ["asset", "debt", "contract", "digital"];

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5 sm:col-span-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-white px-2 py-1.5 text-xs leading-relaxed outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[#c8383a]"
        style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
      />
    </label>
  );
}

// 入力欄の章（開閉できる）
function FormCard({ no, title, note, children, defaultOpen = false }: { no: string; title: string; note?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-white" style={{ border: `2.5px solid ${INK}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-2 p-4 text-left">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: INK }}>
          {no}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-[#0a0a0a]">{title}</span>
          {note ? <span className="block text-[11px] leading-relaxed text-[#0a0a0a]/60">{note}</span> : null}
        </span>
        <span className="text-base font-bold">{open ? "▴" : "▾"}</span>
      </button>
      {open ? <div className="flex flex-col gap-3 px-4 pb-4">{children}</div> : null}
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-lg py-2 text-[12px] font-bold" style={{ border: `2px dashed ${INK}50` }}>
      + {label}
    </button>
  );
}

// 印刷用の1章。長い章は次の紙に続く
function DocPage({ no, total, title, children }: { no: number; total: number; title: string; children: React.ReactNode }) {
  return (
    <section className="handover-page mx-auto mb-6 w-full max-w-[210mm] bg-white px-5 py-6 shadow-sm sm:px-10 sm:py-10" style={{ border: "1px solid #0a0a0a20", color: INK }}>
      <div className="mb-4 flex items-baseline justify-between border-b-2 pb-2" style={{ borderColor: INK }}>
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-[10px] tabular-nums text-[#0a0a0a]/50">
          {no} / {total}
        </span>
      </div>
      {children}
    </section>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`border-b px-2 py-1.5 text-[11px] font-bold ${right ? "text-right" : "text-left"}`} style={{ borderColor: `${INK}40` }}>
      {children}
    </th>
  );
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`border-b px-2 py-1.5 align-top text-[12px] ${right ? "whitespace-nowrap text-right tabular-nums" : ""}`} style={{ borderColor: `${INK}15` }}>
      {children}
    </td>
  );
}

// 手書き用の空欄（行）
function WriteLines({ n = 2, label }: { n?: number; label?: string }) {
  return (
    <div className="mt-2">
      {label ? <p className="text-[9px] font-bold text-[#0a0a0a]/50">{label}</p> : null}
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-[26px] border-b" style={{ borderColor: `${INK}40`, borderBottomStyle: "dotted" }} />
      ))}
    </div>
  );
}

export default function HandoverPage() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const h: HandoverInput = plan.handover;
  const upd = (p: Partial<HandoverInput>) => setField("handover", { ...usePlanStore.getState().plan.handover, ...p });
  const [showForm, setShowForm] = useState(true);

  const secretOn = useSecretStore((s) => s.enabled);
  const secrets = useSecretStore((s) => s.values);
  const setSecret = useSecretStore((s) => s.set);
  const setSecretOn = useSecretStore((s) => s.setEnabled);
  const clearSecrets = useSecretStore((s) => s.clear);
  const maskPrint = useSecretStore((s) => s.maskPrint);
  const setMaskPrint = useSecretStore((s) => s.setMaskPrint);
  const sec = (key: string) => (secretOn ? secrets[key] ?? "" : "");

  // シミュレーターの入力にある財産・ローンを、引き継ぎ書の項目に足す（前の形式からの移行も）
  useEffect(() => {
    if (!hydrated) return;
    const next = syncHandoverItems(plan);
    if (next) upd({ items: next, version: 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, plan]);

  const sources = useMemo(() => autoSources(plan), [plan]);
  const insList = useMemo(() => plan.ins.map((p) => normalizeInsurance(p as never, plan.curAge, plan.endAge)), [plan.ins, plan.curAge, plan.endAge]);
  const insRows = useMemo(() => insuranceRows(plan), [plan]);
  const contactsAuto = useMemo(() => autoContacts(plan, insList), [plan, insList]);
  const base = useMemo(() => simulate(plan), [plan]);
  const payments = useMemo(() => monthlyPayments(plan, base.rows[0], insList), [plan, base, insList]);
  // 「今、私に万一のことがあったら」の試算（もしも・相続と同じ計算）
  const effPlan = useMemo(() => ({ ...plan, risk: { ...plan.risk, who: "self" as const, deathAge: plan.curAge } }), [plan]);
  const death = useMemo(() => simulate(effPlan, { death: true }), [effPlan]);
  const need = useMemo(() => requiredCoverage(effPlan), [effPlan]);

  if (!hydrated) {
    return <main className="flex min-h-[60vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/60">loading...</main>;
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const selfAge = ageOn(plan.selfBirth, null) ?? plan.curAge;
  const spouseAge = ageOn(plan.spouseBirth, null);
  const hasSpouse = spouseAge !== null;
  const survivorLabel = plan.risk.spouseSex === "male" ? "夫" : "妻";

  const items = h.items ?? [];
  // シミュレーターから作った項目で、金額が0になり中身も書いていないものは出さない
  const visible = items.filter((it) => !it.src || itemAmount(plan, it, sources) > 0 || Object.values(it.f).some(Boolean));
  const byCat = (cat: string) => visible.filter((it) => it.cat === cat);
  const amountOf = (it: HandoverItem) => itemAmount(plan, it, sources);
  const sideTotal = (side: Side) => CATEGORIES.filter((c) => c.side === side).reduce((a, c) => a + byCat(c.id).reduce((b, it) => b + amountOf(it), 0), 0);
  const totalAssets = sideTotal("asset");
  const totalDebts = sideTotal("debt");
  // 区分の状況: 書いた項目があれば「ある」。なければ本人が選んだ「ない・わからない」（未選択は空）
  const statusOf = (catId: string) => (byCat(catId).length ? "ある" : h.catStatus?.[catId] ?? "");

  // 別紙（パスワードなど手書きする欄）の通し番号。章の順に振る
  const handList: { no: number; key: string; cat: string; item: string; label: string }[] = [];
  for (const side of SIDES)
    for (const c of CATEGORIES.filter((x) => x.side === side))
      for (const it of byCat(c.id))
        for (const d of c.fields.filter((x) => x.type === "hand"))
          handList.push({ no: handList.length + 1, key: `${it.id}.${d.key}`, cat: c.title.replace(/（.*$/, ""), item: it.f[c.nameKey] || it.f.label || it.f.kind || "（名前未記入）", label: d.label });
  const handNo = (key: string) => handList.find((x) => x.key === key)?.no;

  const sameAsAuto = (p: HandoverPolicy) => insRows.some((x) => x.company === p.company && x.kind === p.kind);
  const extraPolicies = h.policies.map((p, i) => ({ p, i })).filter(({ p }) => !sameAsAuto(p));
  const extraContacts = h.contacts.map((c, i) => ({ c, i })).filter(({ c }) => !contactsAuto.some((a) => a.name && a.name === c.name));
  const whereOf = (key: string) => h.where[key] ?? "";

  const heirKids = !hasSpouse && plan.kids.length === 0 ? 1 : plan.kids.length;
  const heirs = legalHeirs(hasSpouse, heirKids);
  const insuranceTotal =
    insRows.reduce((a, x) => a + x.deathBenefit, 0) + extraPolicies.reduce((a, { p }) => a + (p.benefit || 0), 0) + (plan.risk.deathInsurance || 0);
  // 引き継ぎ書に書いた財産・負債で計算（配偶者の取得割合・名義の割合は「もしも・相続」の設定を使う）
  const inh = planInheritance(plan, base.rows[0], hasSpouse, heirKids);
  // 相続税では、不動産は時価ではなく相続税評価額（シミュレーターから作った物件だけ置き換える。手で足した物件は書いた額のまま）
  const inhSet = { ...DEFAULT_INHERIT, ...(plan.inheritSet ?? {}) };
  const reEvals = realEstateEval(plan, today.getFullYear(), inhSet);
  let reAdjust = 0;
  for (const it of byCat("realestate")) {
    const ev = reEvals.find((p) => p.key === it.src);
    if (!ev || ev.market <= 0) continue;
    const amt = amountOf(it);
    reAdjust += amt * (ev.value / ev.market) - amt;
    // 自宅の土地の小規模宅地等の特例（配偶者が相続する前提）
    if (ev.key === "home" && inhSet.smallLand && hasSpouse) reAdjust -= ev.land * (amt / ev.market) * 0.8;
  }
  // 団信のある住宅ローンは亡くなると0になるので、債務から外す
  const danshinDebt = byCat("housingLoan").filter((it) => it.f.danshin === "あり").reduce((a, it) => a + amountOf(it), 0);
  const estate = Math.max(0, totalAssets + reAdjust - (totalDebts - danshinDebt) + Math.max(0, insuranceTotal - 5_000_000 * heirs.count));
  const tax = inheritanceTax(estate * ((plan.inheritSet?.selfSharePct ?? 100) / 100), hasSpouse, heirKids, inh.spouseRatio, plan.kids.map((k) => plan.curAge - k.offset), inh.kidShares);

  const phases = buildSurvivorPhases(death.rows);
  const deathRow = death.rows.find((r) => r.age === plan.curAge);
  const hasFamily = hasSpouse || plan.kids.length > 0;
  const steps = buildAfterDeathSteps(plan, { hasFamily, inheritanceTaxable: tax.taxable > 0 });

  const setWhere = (key: string, v: string) => upd({ where: { ...h.where, [key]: v } });
  const updItem = (id: string, p: Partial<HandoverItem>) => upd({ items: (usePlanStore.getState().plan.handover.items ?? []).map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const setItemField = (it: HandoverItem, key: string, v: string) => updItem(it.id, { f: { ...it.f, [key]: v } });
  const addItem = (cat: string) => upd({ items: [...items, { id: newItemId(), cat, f: {} }] });
  const removeItem = (it: HandoverItem) => {
    if (it.src) {
      // シミュレーターから作った項目は消すと次に開いたときまた出るので、中身を空にして金額0にする
      updItem(it.id, { f: {}, amount: 0 });
      return;
    }
    upd({ items: items.filter((x) => x.id !== it.id) });
  };
  const updPolicy = (i: number, p: Partial<HandoverPolicy>) => upd({ policies: h.policies.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const updContact = (i: number, p: Partial<HandoverContact>) => upd({ contacts: h.contacts.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const setMap = (k: "docs" | "profile" | "wish", key: string, v: string) => upd({ [k]: { ...(h[k] ?? {}), [key]: v } });
  const setNested = (k: "insExtra" | "pension", id: string, key: string, v: string) =>
    upd({ [k]: { ...(h[k] ?? {}), [id]: { ...(h[k]?.[id] ?? {}), [key]: v } } });
  const setBeneficiary = (index: number, v: string) => setField("ins", insList.map((p, i) => (i === index ? { ...p, beneficiary: v } : p)));

  // 1欄の入力（項目・保険・年金・本人情報で共通）
  const renderField = (def: FieldDef, value: string, onChange: (v: string) => void, secretKey: string, autoAmount?: number) => (
    <FieldInput
      key={def.key}
      def={def}
      value={value}
      onChange={onChange}
      secretOn={secretOn}
      secretValue={secrets[secretKey] ?? ""}
      onSecret={(v) => setSecret(secretKey, v)}
      autoAmount={autoAmount}
    />
  );

  const itemTitle = (c: CategoryDef, it: HandoverItem) => it.f[c.nameKey] || it.f.label || it.f.kind || "（名前未記入）";

  const categoryForm = (c: CategoryDef) => {
    const list = byCat(c.id);
    const simTotal = sources.filter((s) => s.cat === c.id).reduce((a, s) => a + s.amount, 0);
    const written = list.reduce((a, it) => a + amountOf(it), 0);
    return (
      <div key={c.id} className="rounded-lg p-3" style={{ background: "#f7f7f5", border: `1.5px solid ${INK}15` }}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-bold">{c.title}</p>
          {list.length ? (
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: INK }}>
              ある（{list.length}件）
            </span>
          ) : (
            <select
              className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold"
              style={{ border: `1.5px solid ${INK}` }}
              value={h.catStatus?.[c.id] ?? ""}
              onChange={(e) => upd({ catStatus: { ...(h.catStatus ?? {}), [c.id]: e.target.value } })}
              aria-label={`${c.title}はあるか`}
            >
              <option value="">まだ確認していない</option>
              {CAT_STATUS.filter((x) => x !== "ある").map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="mb-2 text-[10px] leading-relaxed text-[#0a0a0a]/60">{c.hint}</p>
        {simTotal > 0 && Math.abs(simTotal - written) >= 10_000 ? (
          <p className="mb-2 text-[10px] font-bold text-[#a07900]">
            シミュレーターの金額 {man(simTotal)}／ここに書いた合計 {man(written)}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {list.map((it) => {
            const auto = it.src ? sources.find((s) => s.src === it.src)?.amount : undefined;
            return (
              <div key={it.id} className="rounded-lg bg-white p-3" style={{ border: `2px solid ${INK}` }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold">
                    {itemTitle(c, it)}
                    {it.src ? (
                      <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: GREEN }}>
                        入力から自動
                      </span>
                    ) : null}
                  </p>
                  <button type="button" onClick={() => removeItem(it)} className="text-[11px] font-bold text-[#c8383a]">
                    削除
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {c.fields.map((def) =>
                    def.type === "amount"
                      ? renderField(def, typeof it.amount === "number" ? String(it.amount) : "", (v) => updItem(it.id, { amount: Number(v) || 0 }), "", auto)
                      : renderField(def, it.f[def.key] ?? "", (v) => setItemField(it, def.key, v), `${it.id}.${def.key}`),
                  )}
                </div>
                {it.src && typeof it.amount === "number" ? (
                  <button type="button" onClick={() => updItem(it.id, { amount: undefined })} className="mt-1 text-[10px] font-bold underline">
                    金額を入力の金額に戻す
                  </button>
                ) : null}
              </div>
            );
          })}
          <AddBtn label={c.addLabel} onClick={() => addItem(c.id)} />
        </div>
      </div>
    );
  };

  // 印刷: 1項目
  const itemView = (c: CategoryDef, it: HandoverItem) => (
    <div key={it.id} className="handover-item mb-2 rounded-md p-2.5" style={{ border: `1px solid ${INK}30` }}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-bold">{itemTitle(c, it)}</p>
        {amountOf(it) > 0 ? <p className="text-[13px] font-bold tabular-nums">{man(amountOf(it))}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {c.fields
          .filter((d) => d.type !== "amount" && d.key !== c.nameKey)
          .map((d) => (
            <FieldView key={d.key} def={d} value={it.f[d.key] ?? ""} secretValue={sec(`${it.id}.${d.key}`)} handNo={handNo(`${it.id}.${d.key}`)} maskPrint={maskPrint} />
          ))}
      </div>
    </div>
  );

  const sideView = (side: Side) => {
    const cats = CATEGORIES.filter((c) => c.side === side);
    const used = cats.filter((c) => byCat(c.id).length > 0);
    const unused = cats.filter((c) => byCat(c.id).length === 0);
    return (
      <>
        {used.map((c) => (
          <div key={c.id} className="mb-4">
            <div className="mb-1.5 flex items-baseline justify-between border-b pb-1" style={{ borderColor: `${INK}30` }}>
              <p className="text-[12px] font-bold">{c.title}</p>
              {side === "asset" || side === "debt" ? <p className="text-[11px] font-bold tabular-nums">{man(byCat(c.id).reduce((a, it) => a + amountOf(it), 0))}</p> : null}
            </div>
            {c.warn ? <p className="mb-1.5 text-[10px] leading-relaxed text-[#c8383a]">{c.warn}</p> : null}
            {byCat(c.id).map((it) => itemView(c, it))}
          </div>
        ))}
        {!used.length ? <p className="text-[12px] text-[#0a0a0a]/55">（記入なし）</p> : null}
        {unused.length ? (
          <div className="handover-item mt-3 rounded-md p-2.5" style={{ background: "#f7f7f5" }}>
            <p className="mb-1 text-[11px] font-bold">書いていない区分（あれば余白に書き足す）</p>
            <ul className="flex flex-col gap-0.5">
              {unused.map((c) => {
                const st = statusOf(c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[11px]">
                    <span>{c.title}</span>
                    {st ? (
                      <b>{st}</b>
                    ) : (
                      <span className="whitespace-nowrap">□ある　□ない　□わからない</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <WriteLines n={2} />
          </div>
        ) : null}
      </>
    );
  };

  const pensionWho = hasSpouse ? (["self", "spouse"] as const) : (["self"] as const);

  // 書類の章（この順で番号を振る）
  const pages: { title: string; body: React.ReactNode }[] = [
    {
      title: "お金の引き継ぎ書",
      body: (
        <>
          <p className="text-[12px] leading-relaxed">
            この書類は、{h.author || "わたし"}に万一のことがあったとき、家族が困らないように、 財産と負債のありか、毎月の契約、当面のお金の流れ、やることをまとめたものです。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-3">
            <div>
              <p className="text-[9px] font-bold text-[#0a0a0a]/55">作成日</p>
              <p className="font-bold">{todayStr}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#0a0a0a]/55">名前</p>
              <p className="font-bold">
                {h.author || "（未記入）"}
                {h.profile?.kana ? <span className="ml-1 text-[10px] font-normal">（{h.profile.kana}）</span> : null}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#0a0a0a]/55">年齢</p>
              <p className="font-bold">{selfAge}歳</p>
            </div>
            {PROFILE_FIELDS.filter((d) => d.key !== "kana").map((d) => (
              <FieldView key={d.key} def={d} value={h.profile?.[d.key] ?? ""} />
            ))}
          </div>
          <div className="mt-4">
            <p className="mb-1 text-[11px] font-bold">家族</p>
            <ul className="text-[12px] leading-relaxed">
              {hasSpouse ? <li>配偶者：{spouseAge}歳</li> : null}
              {plan.kids.map((k, i) => (
                <li key={i}>
                  子：{k.name || `子${i + 1}`}（{Math.max(0, selfAge - k.offset)}歳）
                </li>
              ))}
              {!hasSpouse && !plan.kids.length ? <li>（未入力）</li> : null}
            </ul>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg p-3" style={{ background: "#f0f0ee" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">資産（プラス）</p>
              <p className="text-lg font-bold tabular-nums">{man(totalAssets)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#f0f0ee" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">負債（マイナス）</p>
              <p className="text-lg font-bold tabular-nums">{man(totalDebts)}</p>
              <p className="text-[9px] text-[#0a0a0a]/55">差し引き {man(totalAssets - totalDebts)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: tax.payable > 0 ? "#fff1f1" : "#f0fff4" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">相続税の目安</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: tax.payable > 0 ? RED : GREEN }}>
                {tax.taxable > 0 ? man(tax.payable) : "かからない見込み"}
              </p>
              <p className="text-[9px] text-[#0a0a0a]/55">
                総額 {man(tax.totalTax)}・基礎控除 {man(tax.deduction)}
                {reAdjust !== 0 ? `。不動産は相続税評価額で計算（時価より${man(-reAdjust)}低い）` : ""}
                {hasSpouse && heirKids > 0 && inh.second && inh.second.payable > 0 ? `。配偶者がその後亡くなると、二次相続でさらに約${man(inh.second.payable)}` : ""}
              </p>
            </div>
          </div>
          <p className="mb-1 mt-5 text-[11px] font-bold">財産と負債の一覧（{todayStr}時点）</p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>区分</Th>
                <Th>あるか</Th>
                <Th right>金額の目安</Th>
              </tr>
            </thead>
            <tbody>
              {(["asset", "debt"] as const).map((side) =>
                CATEGORIES.filter((c) => c.side === side).map((c) => {
                  const st = statusOf(c.id);
                  const sum = byCat(c.id).reduce((a, it) => a + amountOf(it), 0);
                  return (
                    <tr key={c.id}>
                      <Td>
                        <span className="text-[10px] text-[#0a0a0a]/55">{side === "asset" ? "資産" : "負債"}　</span>
                        {c.title.replace(/（.*$/, "")}
                      </Td>
                      <Td>{st ? (st === "ある" ? `ある（${byCat(c.id).length}件）` : st) : "□ある □ない □わからない"}</Td>
                      <Td right>{sum > 0 ? man(sum) : ""}</Td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
          <div className="mt-4 rounded-lg p-3 text-[11px] leading-relaxed" style={{ border: `1.5px solid ${GOLD}` }}>
            <p className="mb-1 font-bold">この書類の扱い</p>
            <ul className="list-disc pl-4">
              <li>この書類に法的な効力はありません（遺言書の代わりにはなりません）。</li>
              <li>番号を書き込んだら、この書類は現金と同じように扱ってください。パスワードは巻末の別紙に書き、切り離して封をして別に保管します。</li>
              <li>キャッシュカードの暗証番号は書いていません。亡くなった後に故人の預金を引き出す前に、相続放棄をするかどうかを確かめてください（引き出すと放棄できなくなることがあります）。</li>
              <li>写しを渡した相手：{h.givenTo || <span className="inline-block min-w-[10em] border-b" style={{ borderColor: `${INK}60`, borderBottomStyle: "dotted" }}>&nbsp;</span>}</li>
              <li>
                この書類の保管場所：
                <span className="inline-block min-w-[12em] border-b" style={{ borderColor: `${INK}60`, borderBottomStyle: "dotted" }}>
                  &nbsp;
                </span>
              </li>
              <li>年に1回、誕生日などに見直してください。見直した日：＿＿年＿＿月＿＿日／＿＿年＿＿月＿＿日</li>
            </ul>
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-[#0a0a0a]/55">
            金額は作成日時点の目安です（自宅・不動産は購入価格から築年数で減価した概算）。相続税の目安は法定相続分で分けた場合の概算で、実際の評価（路線価・小規模宅地等の特例など）で大きく変わります。手続きは税理士・司法書士にご相談ください。
          </p>
        </>
      ),
    },
    { title: "資産（プラスの財産）", body: sideView("asset") },
    {
      title: "負債（マイナスの財産）・保証",
      body: (
        <>
          {sideView("debt")}
          <p className="mt-3 text-[11px] leading-relaxed text-[#0a0a0a]/75">
            負債は相続の対象です。マイナスの財産がプラスより多いときは、亡くなったことを知ってから3か月以内に、家庭裁判所で相続放棄・限定承認を申し立てられます。
            {plan.useHomeLoan && plan.hlBal > 0 && plan.risk.danshin ? "住宅ローンは団信で返済される想定です（銀行に連絡すると手続きが始まります）。" : ""}
          </p>
        </>
      ),
    },
    {
      title: "保険・年金",
      body: (
        <>
          {insRows.map((x) => {
            const ex = h.insExtra?.[`ins-${x.index}`] ?? {};
            return (
              <div key={x.index} className="handover-item mb-2 rounded-md p-2.5" style={{ border: `1px solid ${INK}30` }}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-bold">
                    {x.company || "（未記入）"} <span className="text-[11px] font-normal">{x.kind}</span>
                  </p>
                  {x.deathBenefit ? <p className="text-[13px] font-bold tabular-nums">死亡 {man(x.deathBenefit)}</p> : null}
                </div>
                {x.benefit ? <p className="text-[11px] text-[#0a0a0a]/70">{x.benefit}</p> : null}
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <FieldView def={{ key: "who", label: "契約者・被保険者 → 受取人", type: "text" }} value={`${x.contractor}・${x.insured} → ${x.beneficiary || "（未記入）"}`} />
                  {x.premiumM > 0 ? <FieldView def={{ key: "prem", label: "保険料", type: "text" }} value={`月${Math.round(x.premiumM).toLocaleString()}円`} /> : null}
                  {INSURANCE_EXTRA.map((d) => (
                    <FieldView key={d.key} def={d} value={ex[d.key] ?? (d.key === "place" ? whereOf(`ins-${x.index}`) : "")} secretValue={sec(`ins-${x.index}.${d.key}`)} maskPrint={maskPrint} />
                  ))}
                </div>
              </div>
            );
          })}
          {extraPolicies.length || plan.risk.deathInsurance > 0 ? (
            <table className="mt-2 w-full border-collapse">
              <thead>
                <tr>
                  <Th>そのほかの保険</Th>
                  <Th>種類</Th>
                  <Th>被保険者 → 受取人</Th>
                  <Th right>死亡保険金</Th>
                </tr>
              </thead>
              <tbody>
                {extraPolicies.map(({ p, i }) => (
                  <tr key={i}>
                    <Td>
                      {p.company || "（未記入）"}
                      {p.contact ? <div className="text-[10px] text-[#0a0a0a]/60">{p.contact}</div> : null}
                    </Td>
                    <Td>{p.kind}</Td>
                    <Td>
                      {p.insured || "—"} → {p.beneficiary || "—"}
                    </Td>
                    <Td right>{p.benefit ? man(p.benefit) : "—"}</Td>
                  </tr>
                ))}
                {plan.risk.deathInsurance > 0 && !extraPolicies.length ? (
                  <tr>
                    <Td>（一覧にない保険）</Td>
                    <Td>勤務先の団体保険など</Td>
                    <Td>本人 → —</Td>
                    <Td right>{man(plan.risk.deathInsurance)}</Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
          {!insRows.length && !extraPolicies.length && !(plan.risk.deathInsurance > 0) ? <p className="text-[12px] text-[#0a0a0a]/55">（記入なし）</p> : null}
          <p className="mt-2 text-[11px] leading-relaxed text-[#0a0a0a]/70">
            保険金の請求は保険会社に連絡して行います（請求できる期限は一般に3年）。死亡保険金のうち「500万円 × 法定相続人の数」までは相続税がかかりません。
            本人が受け取る前に亡くなった医療保険などの給付金も請求できます。
          </p>
          <p className="mb-1.5 mt-4 border-b pb-1 text-[12px] font-bold" style={{ borderColor: `${INK}30` }}>
            公的年金
          </p>
          {pensionWho.map((who) => (
            <div key={who} className="handover-item mb-2 rounded-md p-2.5" style={{ border: `1px solid ${INK}30` }}>
              <p className="mb-1 text-[12px] font-bold">{who === "self" ? "本人" : "配偶者"}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {PENSION_FIELDS.map((d) => (
                  <FieldView key={d.key} def={d} value={h.pension?.[who]?.[d.key] ?? ""} secretValue={sec(`pension-${who}.${d.key}`)} maskPrint={maskPrint} />
                ))}
              </div>
            </div>
          ))}
        </>
      ),
    },
    {
      title: "当面のお金はどうなるか",
      body: hasFamily ? (
        <>
          <p className="text-[12px] leading-relaxed">
            {todayStr}時点で{h.author || "わたし"}が亡くなった場合の試算です。
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg p-3" style={{ background: "#f0f0ee" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">すぐに入るお金（目安）</p>
              <p className="text-lg font-bold tabular-nums">{man(deathRow?.deathLump ?? 0)}</p>
              <p className="text-[9px] text-[#0a0a0a]/55">死亡保険金・死亡退職金・iDeCo等</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#f0f0ee" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">毎月の遺族年金（最初）</p>
              <p className="text-lg font-bold tabular-nums">{phases[0] ? `${((phases[0].kiso + phases[0].kosei + phases[0].chukorei) / 12 / 10000).toFixed(1)}万円` : "対象外"}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: need > 0 ? "#fff1f1" : "#f0fff4" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">暮らしの見通し</p>
              <p className="text-[13px] font-bold" style={{ color: need > 0 ? RED : GREEN }}>
                {need > 0 ? `あと${man(need)}の備えがあると安心` : `${plan.endAge}歳まで資金は足りる見込み`}
              </p>
            </div>
          </div>
          {phases.length ? (
            <table className="mt-4 w-full border-collapse">
              <thead>
                <tr>
                  <Th>期間（{hasSpouse ? `${survivorLabel}の年齢` : "本人の年齢換算"}）</Th>
                  <Th>受け取れる年金</Th>
                  <Th right>月額の目安</Th>
                </tr>
              </thead>
              <tbody>
                {phases.map((p) => {
                  const sa = (age: number) => (spouseAge !== null ? spouseAge + (age - plan.curAge) : age);
                  const names = [p.kiso ? "遺族基礎年金" : null, p.kosei ? "遺族厚生年金" : null, p.chukorei ? "中高齢寡婦加算" : null, p.prot ? "収入保障保険" : null].filter(Boolean).join("・");
                  return (
                    <tr key={p.from}>
                      <Td>{p.from === p.to ? `${sa(p.from)}歳` : `${sa(p.from)}〜${sa(p.to)}歳`}</Td>
                      <Td>{names}</Td>
                      <Td right>{((p.kiso + p.kosei + p.chukorei + p.prot) / 12 / 10000).toFixed(1)}万円</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
          <ul className="mt-4 list-disc pl-5 text-[11px] leading-relaxed text-[#0a0a0a]/75">
            <li>遺族年金は年金事務所で請求します（非課税）。請求するまで振り込まれません。</li>
            {plan.useHomeLoan && plan.risk.danshin ? <li>住宅ローンは団信で返済され、毎月の返済はなくなる想定です。</li> : null}
            <li>銀行が名義人の死亡を知ると、その口座は止まります。当面の生活費は家族名義の口座にも置いておくと安心です（遺産分割の前でも、一定額までは引き出せる制度があります）。</li>
            <li>生活費は今の{plan.risk.livingRate}%で暮らす前提で試算しています。</li>
          </ul>
        </>
      ) : (
        <p className="text-[12px] text-[#0a0a0a]/60">配偶者・子どもが未入力のため、遺族年金の試算は省略しています。</p>
      ),
    },
    {
      title: "毎月の契約・支払い",
      body: (
        <>
          {payments.length ? (
            <>
              <p className="mb-1.5 text-[12px] font-bold">シミュレーターに入れている支払い</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>内容</Th>
                    <Th>手続きのめやす</Th>
                    <Th right>月額</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((x) => (
                    <tr key={x.label}>
                      <Td>{x.label}</Td>
                      <Td>{x.note}</Td>
                      <Td right>{Math.round(x.monthly).toLocaleString()}円</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
          <div className="mt-4">{sideView("contract")}</div>
        </>
      ),
    },
    {
      title: "デジタル（スマホ・ネットのアカウント）",
      body: (
        <>
          {sideView("digital")}
          <p className="mt-3 text-[11px] leading-relaxed text-[#0a0a0a]/75">
            iPhoneは「故人アカウント管理連絡先」、Googleは「アカウント無効化管理ツール」を設定しておくと、家族がデータを受け取れます。ネット銀行・ネット証券は、ログインできなくても金融機関名が分かれば相続の手続きができます。
          </p>
        </>
      ),
    },
    {
      title: "重要書類・印鑑の保管場所",
      body: (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>書類・もの</Th>
              <Th>保管場所</Th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((d) => (
              <tr key={d.key}>
                <Td>{d.label}</Td>
                <Td>
                  {h.docs?.[d.key] || (d.key === "will" && h.willPlace) || (
                    <span className="inline-block w-full border-b" style={{ borderColor: `${INK}40`, borderBottomStyle: "dotted" }}>
                      &nbsp;
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
    {
      title: "いつまでに何をするか",
      body: (
        <>
          <p className="mb-3 text-[11px] text-[#0a0a0a]/65">
            亡くなった日からの一般的な期限の目安です。入力内容（証券口座・住宅ローン・DCなど）に合わせて、必要な手続きを足しています。済んだら □ に印を付けてください。
          </p>
          <div className="flex flex-col gap-3">
            {steps.map((s) => (
              <section key={s.when} className="handover-item">
                <p className="mb-1 inline-block rounded px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: INK }}>
                  {s.when}
                </p>
                <ul className="flex flex-col gap-1">
                  {s.items.map((it) => (
                    <li key={it} className="flex gap-2 text-[12px] leading-relaxed">
                      <span className="mt-[3px] inline-block h-3.5 w-3.5 shrink-0" style={{ border: `1.5px solid ${INK}` }} />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "見つからないときの調べ方",
      body: (
        <>
          <p className="mb-3 text-[11px] leading-relaxed text-[#0a0a0a]/70">この書類に書いていないもの、書き忘れたものがあっても、家族は次の窓口で調べられます。</p>
          <table className="w-full border-collapse">
            <tbody>
              {LOOKUP_GUIDE.map((x) => (
                <tr key={x.what}>
                  <Td>
                    <b>{x.what}</b>
                  </Td>
                  <Td>{x.how}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[10px] leading-relaxed text-[#0a0a0a]/55">手数料・期限は2026年10月時点の目安です。窓口で最新の条件を確認してください。</p>
        </>
      ),
    },
    {
      title: "連絡先",
      body: (
        <>
          {contactsAuto.length || extraContacts.length ? (
            <table className="w-full border-collapse">
              <tbody>
                {contactsAuto.map((c) => (
                  <tr key={c.key}>
                    <Td>{c.role}</Td>
                    <Td>
                      {c.name}
                      <div className="text-[10px] text-[#0a0a0a]/60">{c.why}</div>
                    </Td>
                    <Td right>{whereOf(c.key) || <span className="text-[#0a0a0a]/35">（未記入）</span>}</Td>
                  </tr>
                ))}
                {extraContacts.map(({ c, i }) => (
                  <tr key={i}>
                    <Td>{c.role}</Td>
                    <Td>{c.name}</Td>
                    <Td right>{c.phone}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[12px] text-[#0a0a0a]/55">（記入なし）</p>
          )}
          <WriteLines n={3} label="書き足し用" />
        </>
      ),
    },
    {
      title: "医療・介護・葬儀・遺言・家族へ",
      body: (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {WISH_FIELDS.map((d) => (
              <FieldView key={d.key} def={d} value={h.wish?.[d.key] ?? (d.key === "funeral" ? h.wishes : "")} />
            ))}
          </div>
          <p className="mb-1 mt-5 text-[12px] font-bold">遺言書</p>
          <p className="text-[12px]">
            {WILL_OPTIONS.find((w) => w.value === h.will)?.label}
            {h.will !== "none" && h.willPlace ? `：${h.willPlace}` : ""}
          </p>
          {h.will === "self" ? <p className="text-[10px] text-[#0a0a0a]/55">自宅で保管している自筆の遺言は、開封せずに家庭裁判所で「検認」を受けてください。</p> : null}
          <div className="handover-item mt-6 rounded-lg p-4" style={{ border: `1.5px solid ${INK}40` }}>
            <p className="mb-1 text-[12px] font-bold">家族へ</p>
            <p className="min-h-[4em] whitespace-pre-wrap text-[13px] leading-relaxed">{h.message || ""}</p>
            <p className="mt-3 text-right text-[11px]">
              {todayStr}　{h.author || ""}
            </p>
          </div>
        </>
      ),
    },
    {
      title: "別紙　パスワードなど（切り離して封をする）",
      body: (
        <>
          <div className="mb-3 rounded-md p-2.5 text-[11px] leading-relaxed" style={{ border: `1.5px solid ${RED}`, color: "#7a1f20" }}>
            このページは、本体から切り離して封筒に入れ、封をして、本体とは別の場所（金庫・貸金庫など）に保管してください。
            封筒には「{h.author || "わたし"}が亡くなったら開けてください」と書いておくと安心です。キャッシュカードの暗証番号は書かないでください。
          </div>
          {handList.length ? (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>No.</Th>
                  <Th>どれの</Th>
                  <Th>何を書くか</Th>
                  <Th>手書き欄</Th>
                </tr>
              </thead>
              <tbody>
                {handList.map((x) => (
                  <tr key={x.key}>
                    <Td>{x.no}</Td>
                    <Td>
                      {x.item}
                      <div className="text-[9px] text-[#0a0a0a]/55">{x.cat}</div>
                    </Td>
                    <Td>{x.label}</Td>
                    <td className="w-[40%] border-b px-2 py-1.5" style={{ borderColor: `${INK}15` }}>
                      <span className="block h-[26px]" style={{ border: `1px solid ${INK}60`, borderRadius: 3 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[12px] text-[#0a0a0a]/55">パスワードを書く項目はありません。</p>
          )}
          <WriteLines n={4} label="そのほか（スマホのロック解除・パスワード管理アプリのマスターパスワードなど）" />
        </>
      ),
    },
  ];

  return (
    <main className="px-4 py-6 sm:px-8">
      {/* 印刷時: A4縦・等倍、入力フォームとアプリの飾りは出さない */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html { zoom: 1 !important; }
          .lp-banner { display: none !important; }
          .lp-root, main { background: #ffffff !important; }
          main { padding: 0 !important; }
          .handover-page { break-after: page; box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important; }
          .handover-page:last-of-type { break-after: auto; }
          .handover-item, .handover-page table, .handover-page tr { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mx-auto mb-6 max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/50">Handover</p>
        <h1 className="text-2xl font-bold text-[#0a0a0a]">家族に渡す お金の引き継ぎ書</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-[#0a0a0a]/65">
          もしものとき、家族が「どこに何があるか」「プラスとマイナスの財産はいくらか」「何を止めて、何をいつまでにやるか」がわかる書類です。
          エンディングノートと家庭裁判所の財産目録の項目をもとに、資産・負債・毎月の契約・デジタル・保険・重要書類に分けています。シミュレーターに入れた財産・ローン・保険・勤務先は自動で入ります。
        </p>

        {/* セキュリティの設定 */}
        <div className="mt-3 rounded-lg px-3 py-3 text-[11px] leading-relaxed" style={{ background: "#fff8e7", border: `1.5px solid ${GOLD}80` }}>
          <p className="font-bold">番号・ID・パスワードの扱い</p>
          <ul className="mt-1 list-disc pl-4">
            <li>
              <b>🔒 パスワード・暗証番号</b>は、画面に入力欄がありません。印刷した紙の枠に、手で書いてください。
            </li>
            <li>
              <b>🔑 口座番号・ログインID・証券番号</b>は、既定では印刷後に手書きです。画面で入れることもできます。その場合は、この端末の中だけに保存されます（シミュレーターの入力とは別の場所。JSONの保存や検証用の書き出しには含まれません）。
            </li>
            <li>
              パスワード・ロック解除コードは、本体ではなく巻末の<b>別紙</b>に書きます。別紙は切り離して封をし、本体とは別の場所（金庫など）に保管してください。パスワード管理アプリを使っているなら、マスターパスワードだけで足ります。
            </li>
            <li>
              <b>🚫 キャッシュカードの暗証番号・カード番号の全桁</b>は書きません。家族の手続きには使わず、亡くなった後に預金を引き出すと相続放棄ができなくなるおそれがあります。
            </li>
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2.5 py-1.5 font-bold" style={{ border: `2px solid ${secretOn ? GOLD : INK}` }}>
              <input type="checkbox" checked={secretOn} onChange={(e) => setSecretOn(e.target.checked)} />
              口座番号・ログインIDを画面で入力する
            </label>
            {Object.keys(secrets).length ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm("この端末に保存した口座番号・ログインIDなどをすべて消しますか？")) clearSecrets();
                }}
                className="rounded-md bg-white px-2.5 py-1.5 font-bold text-[#c8383a]"
                style={{ border: `2px solid ${RED}` }}
              >
                番号・IDをこの端末から消す（{Object.keys(secrets).length}件）
              </button>
            ) : null}
          </div>
          {secretOn ? (
            <>
              <label className="mt-2 flex cursor-pointer items-center gap-2 font-bold">
                <input type="checkbox" checked={maskPrint} onChange={(e) => setMaskPrint(e.target.checked)} />
                印刷するときも番号を伏せる（家族に渡す写し用。原本は外して印刷）
              </label>
              <p className="mt-1 text-[10px] text-[#7a5a00]">
                画面のプレビューでは下4桁以外を伏せ字にしています。共用のパソコンでは入力しないでください。
              </p>
            </>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-lg px-4 py-2.5 text-[13px] font-bold text-white" style={{ background: INK }}>
            ⎙ PDFで保存・印刷する
          </button>
          <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-lg px-4 py-2.5 text-[13px] font-bold" style={{ border: `2px solid ${INK}` }}>
            {showForm ? "入力欄を閉じてプレビューだけ見る" : "入力欄を開く"}
          </button>
          <Link href="/v4/risk" className="self-center text-[12px] font-bold underline">
            ← もしも・相続に戻る
          </Link>
        </div>
        <p className="mt-2 text-[10px] text-[#0a0a0a]/50">
          印刷画面で「送信先：PDFに保存」を選ぶとPDFになります（iPhoneは共有ボタン →「プリント」→ 2本指で広げるとPDF）。番号を画面で入れた場合はPDFにも番号が入るので、保存先に注意してください。
        </p>
      </div>

      {/* ── 入力欄（画面だけ） ── */}
      {showForm ? (
        <div className="no-print mx-auto mb-10 flex max-w-3xl flex-col gap-3">
          <FormCard no="1" title="本人・作成者" note="相続の手続きで戸籍を集めるときに、本籍地が必要になります。" defaultOpen>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <TextField label="名前" value={h.author} onChange={(v) => upd({ author: v })} placeholder="例：佐藤 太郎" />
              <TextField label="写しを渡した相手" value={h.givenTo ?? ""} onChange={(v) => upd({ givenTo: v })} placeholder="例：妻、長男" />
              {PROFILE_FIELDS.map((d) => renderField(d, h.profile?.[d.key] ?? "", (v) => setMap("profile", d.key, v), `profile.${d.key}`))}
            </div>
          </FormCard>

          {SIDES.map((side, si) => (
            <FormCard
              key={side}
              no={String(si + 2)}
              title={SIDE_TITLE[side]}
              note={
                side === "asset"
                  ? "口座・財産を1つずつ。シミュレーターの入力から作った項目には「入力から自動」と出ます。銀行が2つあるなら、口座を追加して分けてください。"
                  : side === "debt"
                    ? "ローン・クレジットカード・保証人になっているもの。マイナスの財産が多いと相続放棄を考えることになるので、もれなく。"
                    : side === "contract"
                      ? "シミュレーターにある支払い（住宅ローン・保険料・積立など）は書類に自動で出ます。ここではそれ以外（公共料金・携帯・サブスクなど）を足してください。"
                      : "ロック解除やログインができないと、家族はネットの財産にたどり着けません。"
              }
            >
              {CATEGORIES.filter((c) => c.side === side).map((c) => categoryForm(c))}
            </FormCard>
          ))}

          <FormCard no="6" title="保険・公的年金" note="保険の中身は「入力 → 支出 → 保険」から自動で入ります。受取人・証券の保管場所・担当者を足してください。">
            {insRows.map((x) => (
              <div key={x.index} className="rounded-lg bg-white p-3" style={{ border: `2px solid ${INK}` }}>
                <p className="text-[12px] font-bold">
                  {x.company || "（保険名未記入）"}　<span className="font-normal text-[#0a0a0a]/60">{x.kind}</span>
                </p>
                <p className="mb-2 text-[11px] leading-relaxed text-[#0a0a0a]/70">
                  契約者 {x.contractor}・被保険者 {x.insured}
                  {x.benefit ? `／${x.benefit}` : ""}
                  {x.premiumM > 0 ? `／保険料 月${Math.round(x.premiumM).toLocaleString()}円` : ""}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <TextField label="受取人" value={x.beneficiary} onChange={(v) => setBeneficiary(x.index, v)} placeholder="例：妻、長男" />
                  {INSURANCE_EXTRA.map((d) =>
                    renderField(
                      d,
                      h.insExtra?.[`ins-${x.index}`]?.[d.key] ?? (d.key === "place" ? whereOf(`ins-${x.index}`) : ""),
                      (v) => setNested("insExtra", `ins-${x.index}`, d.key, v),
                      `ins-${x.index}.${d.key}`,
                    ),
                  )}
                </div>
              </div>
            ))}
            {!insRows.length ? <p className="text-[11px] text-[#0a0a0a]/55">「入力」→「支出」→「保険」に保険を入れると、ここに自動で出ます。</p> : null}
            <p className="mt-1 text-[11px] font-bold">一覧にない保険（勤務先の団体保険・クレジットカード付帯の保険・共済など）</p>
            {extraPolicies.map(({ p, i }) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg p-2 sm:grid-cols-2" style={{ background: "#f0f0ee" }}>
                <TextField label="保険会社・商品名" value={p.company} onChange={(v) => updPolicy(i, { company: v })} />
                <TextField label="種類" value={p.kind} onChange={(v) => updPolicy(i, { kind: v })} placeholder="例：団体定期保険" />
                <TextField label="被保険者" value={p.insured} onChange={(v) => updPolicy(i, { insured: v })} />
                <TextField label="受取人" value={p.beneficiary} onChange={(v) => updPolicy(i, { beneficiary: v })} />
                <NumberField label="死亡保険金" value={p.benefit} unit="円" onChange={(v) => updPolicy(i, { benefit: v })} />
                <TextField label="連絡先・証券の保管場所" value={p.contact} onChange={(v) => updPolicy(i, { contact: v })} />
                <button type="button" onClick={() => upd({ policies: h.policies.filter((_, j) => j !== i) })} className="text-left text-[11px] font-bold text-[#c8383a]">
                  削除
                </button>
              </div>
            ))}
            <AddBtn label="一覧にない保険を追加" onClick={() => upd({ policies: [...h.policies, { company: "", kind: "", insured: "本人", beneficiary: "", benefit: 0, contact: "" }] })} />
            <p className="mt-2 text-[12px] font-bold">公的年金</p>
            {pensionWho.map((who) => (
              <div key={who} className="rounded-lg p-3" style={{ background: "#f7f7f5" }}>
                <p className="mb-2 text-[11px] font-bold">{who === "self" ? "本人" : "配偶者"}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PENSION_FIELDS.map((d) => renderField(d, h.pension?.[who]?.[d.key] ?? "", (v) => setNested("pension", who, d.key, v), `pension-${who}.${d.key}`))}
                </div>
              </div>
            ))}
          </FormCard>

          <FormCard no="7" title="重要書類・印鑑の保管場所" note="手続きで必ず使うもの。番号は書かず、どこにあるかだけ。">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DOCUMENTS.map((d) => (
                <TextField key={d.key} label={d.label} value={h.docs?.[d.key] ?? ""} onChange={(v) => setMap("docs", d.key, v)} placeholder={d.note ? `保管場所（${d.note}）` : "保管場所"} />
              ))}
            </div>
          </FormCard>

          <FormCard no="8" title="連絡先" note="勤務先と保険会社は入力済みの内容から出しています。電話番号などを足してください。">
            {contactsAuto.map((c) => (
              <TextField key={c.key} label={`${c.role}：${c.name}`} value={whereOf(c.key)} onChange={(v) => setWhere(c.key, v)} placeholder="電話番号・部署・担当者名など" hint={c.why} />
            ))}
            {h.contacts.map((c, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg p-2 sm:grid-cols-3" style={{ background: "#f0f0ee" }}>
                <SelectField
                  label="どんな相手か"
                  value={CONTACT_ROLES.includes(c.role) ? c.role : "その他"}
                  onChange={(v) => updContact(i, { role: v })}
                  options={CONTACT_ROLES.map((r) => ({ value: r, label: r }))}
                />
                <TextField label="名前・会社名" value={c.name} onChange={(v) => updContact(i, { name: v })} />
                <TextField label="電話番号など" value={c.phone} onChange={(v) => updContact(i, { phone: v })} />
                <button type="button" onClick={() => upd({ contacts: h.contacts.filter((_, j) => j !== i) })} className="text-left text-[11px] font-bold text-[#c8383a]">
                  削除
                </button>
              </div>
            ))}
            <AddBtn label="連絡先を追加" onClick={() => upd({ contacts: [...h.contacts, { role: CONTACT_ROLES[1], name: "", phone: "" }] })} />
          </FormCard>

          <FormCard no="9" title="医療・介護・葬儀・遺言・家族へ">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WISH_FIELDS.map((d) =>
                d.type === "note" ? (
                  <TextArea key={d.key} label={d.label} value={h.wish?.[d.key] ?? (d.key === "funeral" ? h.wishes : "")} onChange={(v) => setMap("wish", d.key, v)} placeholder={d.placeholder} />
                ) : (
                  renderField(d, h.wish?.[d.key] ?? "", (v) => setMap("wish", d.key, v), `wish.${d.key}`)
                ),
              )}
              <SelectField label="遺言書" value={h.will} onChange={(v) => upd({ will: v })} options={WILL_OPTIONS} />
              {h.will !== "none" ? (
                <TextField label="遺言書の保管場所" value={h.willPlace} onChange={(v) => upd({ willPlace: v })} placeholder="例：自宅の書斎の金庫／○○法務局／○○公証役場" />
              ) : null}
              <TextArea label="家族へのひとこと" value={h.message} onChange={(v) => upd({ message: v })} placeholder="例：この書類を見れば、当面のお金は心配いりません。" />
            </div>
          </FormCard>
        </div>
      ) : null}

      {/* ── 書類（印刷対象） ── */}
      <div>
        {pages.map((p, i) => (
          <DocPage key={p.title} no={i + 1} total={pages.length} title={p.title}>
            {p.body}
          </DocPage>
        ))}
      </div>
    </main>
  );
}
