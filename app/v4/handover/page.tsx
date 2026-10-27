"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { NumberField } from "@/components/v4/inputs/NumberField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { TextField } from "@/components/v4/inputs/TextField";
import { ageOn } from "@/lib/v4/calc/age";
import { autoContacts, buildAfterDeathSteps, buildInventory, insuranceRows, monthlyPayments } from "@/lib/v4/calc/handover";
import { normalizeInsurance } from "@/lib/v4/calc/insurance";
import { estimateInheritanceTax, legalHeirs } from "@/lib/v4/calc/inheritance";
import { requiredCoverage, simulate } from "@/lib/v4/calc/simulate";
import { buildSurvivorPhases } from "@/lib/v4/calc/survivor";
import type { HandoverContact, HandoverInput, HandoverPolicy } from "@/lib/v4/calc/types";
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

const WILL_OPTIONS: { value: HandoverInput["will"]; label: string }[] = [
  { value: "none", label: "まだ用意していない" },
  { value: "self", label: "自筆の遺言書がある（自宅などで保管）" },
  { value: "hokan", label: "自筆の遺言書を法務局に預けている" },
  { value: "notary", label: "公正証書遺言がある（公証役場）" },
];

const CONTACT_ROLES = ["勤務先（総務・人事）", "税理士", "保険の担当者", "証券会社・銀行の担当者", "親族", "その他"];

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
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

function FormCard({ no, title, note, children }: { no: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4" style={{ border: `2.5px solid ${INK}` }}>
      <div className="mb-3 flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: INK }}>
          {no}
        </span>
        <div>
          <p className="text-sm font-bold text-[#0a0a0a]">{title}</p>
          {note ? <p className="text-[11px] leading-relaxed text-[#0a0a0a]/60">{note}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg py-2 text-[12px] font-bold"
      style={{ border: `2px dashed ${INK}50` }}
    >
      + {label}
    </button>
  );
}

// 印刷用の1ページ（A4縦）
function DocPage({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <section
      className="handover-page mx-auto mb-6 w-full max-w-[210mm] bg-white px-5 py-6 shadow-sm sm:px-10 sm:py-10"
      style={{ border: "1px solid #0a0a0a20", color: INK }}
    >
      <div className="mb-4 flex items-baseline justify-between border-b-2 pb-2" style={{ borderColor: INK }}>
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-[10px] tabular-nums text-[#0a0a0a]/50">{no} / 6</span>
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

export default function HandoverPage() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);
  const h: HandoverInput = plan.handover;
  const upd = (p: Partial<HandoverInput>) => setField("handover", { ...h, ...p });
  const [showForm, setShowForm] = useState(true);

  const today = new Date();
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const selfAge = ageOn(plan.selfBirth, null) ?? plan.curAge;
  const spouseAge = ageOn(plan.spouseBirth, null);
  const hasSpouse = spouseAge !== null;
  const survivorLabel = plan.risk.spouseSex === "male" ? "夫" : "妻";

  const inventory = useMemo(() => buildInventory(plan), [plan]);
  const assets = inventory.filter((r) => r.kind === "asset" && r.amount > 0);
  const debts = inventory.filter((r) => r.kind === "debt" && r.amount > 0);
  const totalAssets = assets.reduce((a, r) => a + r.amount, 0);
  const totalDebts = debts.reduce((a, r) => a + r.amount, 0);

  // 保険は「入力 → 支出 → 保険」の一覧から自動で入る。ここで足すのは一覧にない保険だけ
  const insList = useMemo(() => plan.ins.map((p) => normalizeInsurance(p as never, plan.curAge, plan.endAge)), [plan.ins, plan.curAge, plan.endAge]);
  const insRows = useMemo(() => insuranceRows(plan), [plan]);
  const sameAsAuto = (p: HandoverPolicy) => insRows.some((x) => x.company === p.company && x.kind === p.kind);
  const extraPolicies = h.policies.map((p, i) => ({ p, i })).filter(({ p }) => !sameAsAuto(p));
  const contactsAuto = useMemo(() => autoContacts(plan, insList), [plan, insList]);
  const extraContacts = h.contacts.filter((c) => !contactsAuto.some((a) => a.name && a.name === c.name));
  const base = useMemo(() => simulate(plan), [plan]);
  const payments = useMemo(() => monthlyPayments(plan, base.rows[0], insList), [plan, base, insList]);
  const whereOf = (key: string, prefill?: string) => h.where[key] ?? prefill ?? "";

  const heirKids = !hasSpouse && plan.kids.length === 0 ? 1 : plan.kids.length;
  const heirs = legalHeirs(hasSpouse, heirKids);
  const insuranceTotal =
    insRows.reduce((a, x) => a + x.deathBenefit, 0) +
    extraPolicies.reduce((a, { p }) => a + (p.benefit || 0), 0) +
    (plan.risk.deathInsurance || 0);
  const estate = totalAssets - totalDebts + Math.max(0, insuranceTotal - 5_000_000 * heirs.count);
  const tax = estimateInheritanceTax(estate, hasSpouse, heirKids);

  // 「今、私に万一のことがあったら」の試算（もしも・相続と同じ計算）
  const effPlan = useMemo(() => ({ ...plan, risk: { ...plan.risk, who: "self" as const, deathAge: plan.curAge } }), [plan]);
  const death = useMemo(() => simulate(effPlan, { death: true }), [effPlan]);
  const need = useMemo(() => requiredCoverage(effPlan), [effPlan]);
  const phases = buildSurvivorPhases(death.rows);
  const deathRow = death.rows.find((r) => r.age === plan.curAge);
  const hasFamily = hasSpouse || plan.kids.length > 0;
  const steps = buildAfterDeathSteps(plan, { hasFamily, inheritanceTaxable: tax.taxable > 0 });

  const setWhere = (key: string, v: string) => upd({ where: { ...h.where, [key]: v } });
  const updPolicy = (i: number, p: Partial<HandoverPolicy>) =>
    upd({ policies: h.policies.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const updContact = (i: number, p: Partial<HandoverContact>) =>
    upd({ contacts: h.contacts.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  // 受取人は保険そのものの情報なので、入力画面の保険に書き戻す
  const setBeneficiary = (index: number, v: string) =>
    setField("ins", insList.map((p, i) => (i === index ? { ...p, beneficiary: v } : p)));

  if (!hydrated) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/60">
        loading...
      </main>
    );
  }

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
          .handover-page section, .handover-page table, .handover-page tr { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mx-auto mb-6 max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/50">Handover</p>
        <h1 className="text-2xl font-bold text-[#0a0a0a]">家族に渡す お金の引き継ぎ書</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-[#0a0a0a]/65">
          もしものとき、家族が「どこに何があるか」「当面のお金はどうなるか」「何をいつまでにやるか」がわかる書類です。
          財産・ローン・保険・毎月の引き落とし・勤務先などは、シミュレーターに入れた内容から自動で入ります。
          足りないところ（金融機関名・受取人・電話番号など）を下の欄に足して、PDFで保存・印刷してください。
        </p>
        <div className="mt-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#fff8e7", border: "1.5px solid #d4a01760" }}>
          <b>口座番号・暗証番号・パスワードは書かないでください。</b>
          「どの金融機関にあるか」が家族に伝われば、手続きはできます。入力内容はこのブラウザの中だけに保存され、外部には送信されません。
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg px-4 py-2.5 text-[13px] font-bold text-white"
            style={{ background: INK }}
          >
            ⎙ PDFで保存・印刷する
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg px-4 py-2.5 text-[13px] font-bold"
            style={{ border: `2px solid ${INK}` }}
          >
            {showForm ? "入力欄を閉じてプレビューだけ見る" : "入力欄を開く"}
          </button>
          <Link href="/v4/risk" className="self-center text-[12px] font-bold underline">
            ← もしも・相続に戻る
          </Link>
        </div>
        <p className="mt-2 text-[10px] text-[#0a0a0a]/50">
          印刷画面で「送信先：PDFに保存」を選ぶとPDFになります（iPhoneは共有ボタン →「プリント」→ 2本指で広げるとPDF）。
        </p>
      </div>

      {/* ── 入力欄（画面だけ） ── */}
      {showForm ? (
        <div className="no-print mx-auto mb-10 flex max-w-3xl flex-col gap-3">
          <FormCard no="1" title="作成者">
            <TextField label="あなたの名前" value={h.author} onChange={(v) => upd({ author: v })} placeholder="例：佐藤 太郎" />
          </FormCard>

          <FormCard no="2" title="財産・ローンの保管場所" note="金額と内訳は入力済みの内容から自動で入ります。どこの金融機関にあるかを書いてください。">
            {inventory.filter((r) => r.amount > 0 && !r.key.startsWith("extra-")).map((r) => (
              <TextField
                key={r.key}
                label={`${r.label}（${man(r.amount)}）`}
                value={whereOf(r.key, r.prefill)}
                onChange={(v) => setWhere(r.key, v)}
                placeholder={r.placeholder}
                hint={r.detail || undefined}
              />
            ))}
            {inventory.every((r) => r.amount <= 0) ? (
              <p className="text-[11px] text-[#0a0a0a]/55">入力で資産を入れると、ここに一覧が出ます。</p>
            ) : null}
            <p className="mt-1 text-[11px] font-bold">そのほかの財産（貴金属・車・貸しているお金など）</p>
            {h.extraAssets.map((x, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg p-2 sm:grid-cols-3" style={{ background: "#f0f0ee" }}>
                <TextField label="名前" value={x.label} onChange={(v) => upd({ extraAssets: h.extraAssets.map((y, j) => (j === i ? { ...y, label: v } : y)) })} />
                <TextField label="保管場所" value={x.where} onChange={(v) => upd({ extraAssets: h.extraAssets.map((y, j) => (j === i ? { ...y, where: v } : y)) })} />
                <NumberField label="金額の目安" value={x.amount} unit="円" onChange={(v) => upd({ extraAssets: h.extraAssets.map((y, j) => (j === i ? { ...y, amount: v } : y)) })} />
                <button type="button" onClick={() => upd({ extraAssets: h.extraAssets.filter((_, j) => j !== i) })} className="text-left text-[11px] font-bold text-[#c8383a]">
                  削除
                </button>
              </div>
            ))}
            <AddBtn label="財産を追加" onClick={() => upd({ extraAssets: [...h.extraAssets, { label: "", where: "", amount: 0 }] })} />
          </FormCard>

          <FormCard no="3" title="保険" note="「入力」→「支出」→「保険」の内容が自動で入ります。受取人と、証券の保管場所・担当者を足してください。">
            {insRows.map((x) => (
              <div key={x.index} className="flex flex-col gap-2 rounded-lg p-2" style={{ background: "#f0f0ee" }}>
                <p className="text-[12px] font-bold">
                  {x.company || "（保険名未記入）"}　<span className="font-normal text-[#0a0a0a]/60">{x.kind}</span>
                </p>
                <p className="text-[11px] leading-relaxed text-[#0a0a0a]/70">
                  契約者 {x.contractor}・被保険者 {x.insured}
                  {x.benefit ? `／${x.benefit}` : ""}
                  {x.premiumM > 0 ? `／保険料 月${Math.round(x.premiumM).toLocaleString()}円` : ""}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <TextField label="受取人" value={x.beneficiary} onChange={(v) => setBeneficiary(x.index, v)} placeholder="例：妻、長男" />
                  <TextField
                    label="証券の保管場所・担当者"
                    value={whereOf(`ins-${x.index}`)}
                    onChange={(v) => setWhere(`ins-${x.index}`, v)}
                    placeholder="例：書斎の引き出し。担当 ○○さん"
                  />
                </div>
              </div>
            ))}
            {!insRows.length ? (
              <p className="text-[11px] text-[#0a0a0a]/55">「入力」→「支出」→「保険」に保険を入れると、ここに自動で出ます。</p>
            ) : null}
            <p className="mt-1 text-[11px] font-bold">一覧にない保険（勤務先の団体保険・クレジットカード付帯の保険など）</p>
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
          </FormCard>

          <FormCard no="4" title="連絡先" note="勤務先と保険会社は入力済みの内容から出しています。電話番号などを足してください。">
            {contactsAuto.map((c) => (
              <TextField
                key={c.key}
                label={`${c.role}：${c.name}`}
                value={whereOf(c.key)}
                onChange={(v) => setWhere(c.key, v)}
                placeholder="電話番号・部署・担当者名など"
                hint={c.why}
              />
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
            <AddBtn label="連絡先を追加" onClick={() => upd({ contacts: [...h.contacts, { role: CONTACT_ROLES[0], name: "", phone: "" }] })} />
          </FormCard>

          <FormCard no="5" title="遺言書・希望・メッセージ">
            <SelectField label="遺言書" value={h.will} onChange={(v) => upd({ will: v })} options={WILL_OPTIONS} />
            {h.will !== "none" ? (
              <TextField label="保管場所" value={h.willPlace} onChange={(v) => upd({ willPlace: v })} placeholder="例：自宅の書斎の金庫／○○法務局／○○公証役場" />
            ) : null}
            <TextArea label="葬儀・お墓・形見などの希望" value={h.wishes} onChange={(v) => upd({ wishes: v })} placeholder="例：葬儀は家族だけで。腕時計は長男に。" />
            <TextArea label="家族へのひとこと" value={h.message} onChange={(v) => upd({ message: v })} placeholder="例：この書類を見れば、当面のお金は心配いりません。" />
          </FormCard>
        </div>
      ) : null}

      {/* ── 書類（印刷対象） ── */}
      <div>
        <DocPage no={1} title="お金の引き継ぎ書">
          <p className="text-[12px] leading-relaxed">
            この書類は、{h.author ? `${h.author}` : "わたし"}に万一のことがあったとき、家族が困らないように、
            お金のありかと、当面のお金の流れ、やることをまとめたものです。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">作成日</p>
              <p className="font-bold">{todayStr}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">作成者</p>
              <p className="font-bold">{h.author || "（未記入）"}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-1 text-[11px] font-bold">家族</p>
            <ul className="text-[12px] leading-relaxed">
              <li>本人：{selfAge}歳</li>
              {hasSpouse ? <li>配偶者：{spouseAge}歳</li> : null}
              {plan.kids.map((k, i) => (
                <li key={i}>
                  子：{k.name || `子${i + 1}`}（{Math.max(0, selfAge - k.offset)}歳）
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg p-3" style={{ background: "#f0f0ee" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">財産の合計（目安）</p>
              <p className="text-lg font-bold tabular-nums">{man(totalAssets)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#f0f0ee" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">ローンなどの残り</p>
              <p className="text-lg font-bold tabular-nums">{man(totalDebts)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: tax.payable > 0 ? "#fff1f1" : "#f0fff4" }}>
              <p className="text-[10px] font-bold text-[#0a0a0a]/55">相続税の目安</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: tax.payable > 0 ? RED : GREEN }}>
                {tax.taxable > 0 ? man(tax.payable) : "かからない見込み"}
              </p>
              <p className="text-[9px] text-[#0a0a0a]/55">基礎控除 {man(tax.deduction)}</p>
            </div>
          </div>
          <div className="mt-5 rounded-lg p-3 text-[12px] leading-relaxed" style={{ border: `1.5px solid ${INK}30` }}>
            <p className="mb-1 font-bold">この書類の見かた</p>
            <ol className="list-decimal pl-5">
              <li>2ページ：お金がどこにあるか・毎月の引き落とし</li>
              <li>3ページ：入っている保険</li>
              <li>4ページ：当面の生活費はどうなるか（遺族年金など）</li>
              <li>5ページ：いつまでに何をするか</li>
              <li>6ページ：連絡先・遺言書・伝えたいこと</li>
            </ol>
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-[#0a0a0a]/55">
            金額は作成日時点の目安です（自宅・不動産は購入価格から築年数で減価した概算）。口座番号・暗証番号は記載していません。
            相続税の目安は法定相続分で分けた場合の概算で、実際の評価（路線価・小規模宅地等の特例など）で大きく変わります。手続きは税理士・司法書士にご相談ください。
          </p>
        </DocPage>

        <DocPage no={2} title="お金のありか">
          <p className="mb-2 text-[12px] font-bold">財産</p>
          {assets.length ? (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>種類</Th>
                  <Th>金融機関・保管場所</Th>
                  <Th right>金額の目安</Th>
                </tr>
              </thead>
              <tbody>
                {assets.map((r) => (
                  <tr key={r.key}>
                    <Td>
                      {r.label}
                      {r.detail ? <div className="text-[10px] text-[#0a0a0a]/60">{r.detail}</div> : null}
                    </Td>
                    <Td>{(r.key.startsWith("extra-") ? h.extraAssets[Number(r.key.slice(6))]?.where : whereOf(r.key, r.prefill)) || <span className="text-[#0a0a0a]/35">（未記入）</span>}</Td>
                    <Td right>{man(r.amount)}</Td>
                  </tr>
                ))}
                <tr>
                  <Td><b>合計</b></Td>
                  <Td>{""}</Td>
                  <Td right><b>{man(totalAssets)}</b></Td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-[12px] text-[#0a0a0a]/55">（記入なし）</p>
          )}
          <p className="mb-2 mt-6 text-[12px] font-bold">ローン・借入</p>
          {debts.length ? (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>種類</Th>
                  <Th>借入先</Th>
                  <Th right>残りの目安</Th>
                </tr>
              </thead>
              <tbody>
                {debts.map((r) => (
                  <tr key={r.key}>
                    <Td>
                      {r.label}
                      {r.detail ? <div className="text-[10px] text-[#0a0a0a]/60">{r.detail}</div> : null}
                    </Td>
                    <Td>{whereOf(r.key, r.prefill) || <span className="text-[#0a0a0a]/35">（未記入）</span>}</Td>
                    <Td right>{man(r.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[12px] text-[#0a0a0a]/55">ローン・借入はありません。</p>
          )}
          {plan.useHomeLoan && plan.hlBal > 0 && plan.risk.danshin ? (
            <p className="mt-3 text-[11px] leading-relaxed">
              住宅ローンには団体信用生命保険（団信）が付いている想定です。亡くなった場合、銀行に連絡すると残りのローンは保険で返済されます。
            </p>
          ) : null}
          {payments.length ? (
            <>
              <p className="mb-2 mt-6 text-[12px] font-bold">毎月の引き落とし・積立（止める・名義を変える手続きが必要）</p>
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
        </DocPage>

        <DocPage no={3} title="入っている保険">
          {insRows.length || extraPolicies.length || plan.risk.deathInsurance > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>保険会社・商品</Th>
                  <Th>種類・保障</Th>
                  <Th>被保険者 → 受取人</Th>
                  <Th right>死亡保険金</Th>
                </tr>
              </thead>
              <tbody>
                {insRows.map((x) => (
                  <tr key={`a-${x.index}`}>
                    <Td>
                      {x.company || "（未記入）"}
                      {whereOf(`ins-${x.index}`) ? <div className="text-[10px] text-[#0a0a0a]/60">{whereOf(`ins-${x.index}`)}</div> : null}
                    </Td>
                    <Td>
                      {x.kind}
                      {x.benefit ? <div className="text-[10px] text-[#0a0a0a]/60">{x.benefit}</div> : null}
                      {x.premiumM > 0 ? <div className="text-[10px] text-[#0a0a0a]/60">保険料 月{Math.round(x.premiumM).toLocaleString()}円（契約者 {x.contractor}）</div> : null}
                    </Td>
                    <Td>
                      {x.insured} → {x.beneficiary || "—"}
                    </Td>
                    <Td right>{x.deathBenefit ? man(x.deathBenefit) : "—"}</Td>
                  </tr>
                ))}
                {extraPolicies.map(({ p, i }) => (
                  <tr key={`m-${i}`}>
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
          ) : (
            <p className="text-[12px] text-[#0a0a0a]/55">（記入なし）</p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-[#0a0a0a]/70">
            保険金の請求は保険会社に連絡して行います（請求できる期限は一般に3年）。
            死亡保険金のうち「500万円 × 法定相続人の数」までは相続税がかかりません。
            医療保険などの給付金で、本人が受け取る前に亡くなった分も請求できます。
          </p>
        </DocPage>

        <DocPage no={4} title="当面のお金はどうなるか">
          {hasFamily ? (
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
                  <p className="text-lg font-bold tabular-nums">
                    {phases[0] ? `${((phases[0].kiso + phases[0].kosei + phases[0].chukorei) / 12 / 10000).toFixed(1)}万円` : "対象外"}
                  </p>
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
                <li>生活費は今の{plan.risk.livingRate}%で暮らす前提で試算しています。</li>
                <li>65歳からは本人の老齢年金も受け取れます（この表には含めていません）。</li>
              </ul>
            </>
          ) : (
            <p className="text-[12px] text-[#0a0a0a]/60">配偶者・子どもが未入力のため、遺族年金の試算は省略しています。</p>
          )}
        </DocPage>

        <DocPage no={5} title="いつまでに何をするか">
          <p className="mb-3 text-[11px] text-[#0a0a0a]/65">
            亡くなった日からの一般的な期限の目安です。入力内容（証券口座・住宅ローン・DCなど）に合わせて、必要な手続きを足しています。済んだら □ に印を付けてください。
          </p>
          <div className="flex flex-col gap-3">
            {steps.map((s) => (
              <section key={s.when}>
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
        </DocPage>

        <DocPage no={6} title="連絡先・遺言書・伝えたいこと">
          <p className="mb-2 text-[12px] font-bold">連絡先</p>
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
                {extraContacts.map((c, i) => (
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
          <p className="mb-1 mt-5 text-[12px] font-bold">遺言書</p>
          <p className="text-[12px]">
            {WILL_OPTIONS.find((w) => w.value === h.will)?.label}
            {h.will !== "none" && h.willPlace ? `：${h.willPlace}` : ""}
          </p>
          {h.will === "self" ? (
            <p className="text-[10px] text-[#0a0a0a]/55">自宅で保管している自筆の遺言は、開封せずに家庭裁判所で「検認」を受けてください。</p>
          ) : null}
          <p className="mb-1 mt-5 text-[12px] font-bold">希望</p>
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed">{h.wishes || "（記入なし）"}</p>
          <div className="mt-6 rounded-lg p-4" style={{ border: `1.5px solid ${INK}40` }}>
            <p className="mb-1 text-[12px] font-bold">家族へ</p>
            <p className="min-h-[4em] whitespace-pre-wrap text-[13px] leading-relaxed">{h.message || ""}</p>
            <p className="mt-3 text-right text-[11px]">
              {todayStr}　{h.author || ""}
            </p>
          </div>
        </DocPage>
      </div>
    </main>
  );
}
