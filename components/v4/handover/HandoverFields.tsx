"use client";

import { useState } from "react";

import { Field } from "@/components/v4/inputs/Field";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { TextField } from "@/components/v4/inputs/TextField";
import type { FieldDef } from "@/lib/v4/calc/handoverSchema";

const INK = "#0a0a0a";

export const manYen = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(2)}億円`;
  return `${sign}${abs.toLocaleString()}万円`;
};

// 口座番号などの入力欄。入力中以外は伏せ字にする（のぞき見対策）。保存先は secret-store
function SecretInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    if (!focused) setText(value);
  }
  return (
    <Field label={`🔑 ${label}`} hint="この端末だけに保存・JSONには含めない">
      <input
        type={focused ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        className="bg-white px-2 py-1.5 text-xs font-bold outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[#c8383a]"
        style={{ border: "2px dashed #b8860b", borderRadius: 8 }}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          onChange(text.trim());
        }}
      />
    </Field>
  );
}

// 画面では入力できない欄（パスワード・ロック解除コード）。印刷した「別紙」に手で書く
function HandBox({ label }: { label: string }) {
  return (
    <Field label={`🔒 ${label}`}>
      <div
        className="flex min-h-[30px] select-none items-center px-2 py-1 text-[10px] font-bold leading-snug text-[#0a0a0a]/45"
        style={{ border: "2px dashed #0a0a0a40", borderRadius: 8, background: "repeating-linear-gradient(45deg,#f4f4f2,#f4f4f2 6px,#ececea 6px,#ececea 12px)" }}
        aria-disabled
      >
        画面では入力できません（印刷した別紙に手書きして封をする）
      </div>
    </Field>
  );
}

// 書かせない欄（キャッシュカードの暗証番号など）
function NeverBox({ label, reason }: { label: string; reason?: string }) {
  return (
    <Field label={`🚫 ${label}`}>
      <div className="rounded-lg px-2 py-1.5 text-[10px] leading-relaxed" style={{ background: "#fff1f1", border: "1.5px solid #c8383a50", color: "#7a1f20" }}>
        <b>書かないでください。</b>
        {reason}
      </div>
    </Field>
  );
}

function SecretHandwrite({ label }: { label: string }) {
  return (
    <Field label={`🔑 ${label}`} hint="印刷後に手書き（上の設定で画面入力もできます）">
      <div className="flex h-[30px] items-center px-2 text-[10px] font-bold text-[#0a0a0a]/45" style={{ border: "2px dashed #b8860b60", borderRadius: 8 }}>
        印刷した紙に書く
      </div>
    </Field>
  );
}

// 入力画面の1欄
export function FieldInput({
  def,
  value,
  onChange,
  secretOn,
  secretValue,
  onSecret,
  autoAmount,
}: {
  def: FieldDef;
  value: string;
  onChange: (v: string) => void;
  secretOn: boolean;
  secretValue: string;
  onSecret: (v: string) => void;
  autoAmount?: number; // シミュレーターの入力から自動で入る金額（amount の欄）
}) {
  const cls = def.wide || def.type === "note" ? "sm:col-span-2" : "";
  if (def.type === "hand") return <div className={cls}><HandBox label={def.label} /></div>;
  if (def.type === "never") return <div className="sm:col-span-2"><NeverBox label={def.label} reason={def.reason} /></div>;
  if (def.type === "secret")
    return (
      <div className={cls}>
        {secretOn ? <SecretInput label={def.label} value={secretValue} onChange={onSecret} /> : <SecretHandwrite label={def.label} />}
      </div>
    );
  if (def.type === "select")
    return (
      <SelectField
        className={cls}
        label={def.label}
        value={value || ""}
        onChange={onChange}
        options={[{ value: "", label: "（選ぶ）" }, ...(def.options ?? []).map((o) => ({ value: o, label: o }))]}
      />
    );
  if (def.type === "amount") {
    const n = value === "" ? NaN : Number(value);
    const auto = autoAmount !== undefined;
    return (
      <div className={cls}>
        <NumberField
          label={def.label}
          value={Number.isFinite(n) ? n : autoAmount ?? 0}
          onChange={(v) => onChange(String(v))}
          unit="円"
          hint={auto ? (Number.isFinite(n) ? "手で直した金額" : "シミュレーターの入力から自動") : undefined}
        />
      </div>
    );
  }
  return <TextField className={cls} label={def.label} value={value} onChange={onChange} placeholder={def.placeholder} />;
}

// 印刷用の1欄。hand は別紙の番号だけを出す。maskPrint なら番号も伏せて印刷（家族に渡す写し用）
export function FieldView({
  def,
  value,
  secretValue,
  handNo,
  maskPrint,
}: {
  def: FieldDef;
  value: string;
  secretValue?: string;
  handNo?: number;
  maskPrint?: boolean;
}) {
  const wide = def.wide || def.type === "note";
  const box = (inner: React.ReactNode, hand?: boolean) => (
    <div className={`flex flex-col ${wide ? "col-span-2" : ""}`}>
      <span className="text-[9px] font-bold text-[#0a0a0a]/50">
        {def.label}
        {hand ? "（手書き）" : ""}
      </span>
      {inner}
    </div>
  );
  if (def.type === "hand")
    return (
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-[#0a0a0a]/50">{def.label}</span>
        <span className="text-[11px] font-bold">→ 別紙 No.{handNo ?? "—"} に手書き</span>
      </div>
    );
  if (def.type === "never")
    return (
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-[#0a0a0a]/50">{def.label}</span>
        <span className="text-[11px]">書かない（手続きに使わない）</span>
      </div>
    );
  if (def.type === "secret") {
    if (!secretValue) return box(<span className="mt-0.5 block h-[22px] border-b" style={{ borderColor: `${INK}60`, borderBottomStyle: "dotted" }} />, true);
    const masked = secretValue.length > 4 ? `${"●".repeat(Math.min(8, secretValue.length - 4))}${secretValue.slice(-4)}` : "●●●●";
    return box(
      <span className="text-[12px] font-bold tabular-nums">
        <span className="print:hidden">{masked}</span>
        <span className="hidden print:inline">{maskPrint ? masked : secretValue}</span>
      </span>,
    );
  }
  if (!value) return null;
  return box(<span className="whitespace-pre-wrap text-[12px] leading-snug">{value}</span>);
}
