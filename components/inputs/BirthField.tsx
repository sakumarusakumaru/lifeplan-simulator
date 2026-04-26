"use client";

import { Field } from "./Field";

interface BirthFieldProps {
  label: string;
  value: string; // "YYYY-MM-DD"
  onChange: (next: string) => void;
  hint?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function BirthField({ label, value, onChange, hint }: BirthFieldProps) {
  const parts = value ? value.split("-") : ["", "", ""];
  const y = parts[0] ?? "";
  const m = parts[1] ? parseInt(parts[1], 10) : "";
  const d = parts[2] ? parseInt(parts[2], 10) : "";

  const emit = (ny: string, nm: string | number, nd: string | number) => {
    if (!ny || !nm || !nd) return;
    onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`);
  };

  const sel = "bg-white text-xs font-bold outline-none";
  const sepStyle: React.CSSProperties = {
    borderLeft: "2px solid #0a0a0a",
    background: "#f0f0ee",
    color: "#0a0a0a66",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    padding: "0 4px",
  };

  return (
    <Field label={label} hint={hint}>
      <div
        className="flex overflow-hidden bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#c8383a]"
        style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
      >
        <input
          type="number"
          min={1930}
          max={2010}
          placeholder="1980"
          className={`${sel} w-16 px-2 py-1.5`}
          value={y}
          onChange={(e) => emit(e.target.value, m, d)}
        />
        <span style={sepStyle}>年</span>
        <select
          className={`${sel} px-1 py-1.5`}
          value={m}
          onChange={(e) => emit(y, e.target.value, d)}
          style={{ borderLeft: "2px solid #0a0a0a" }}
        >
          <option value="">月</option>
          {MONTHS.map((mo) => (
            <option key={mo} value={mo}>{mo}</option>
          ))}
        </select>
        <span style={sepStyle}>月</span>
        <select
          className={`${sel} px-1 py-1.5`}
          value={d}
          onChange={(e) => emit(y, m, e.target.value)}
          style={{ borderLeft: "2px solid #0a0a0a" }}
        >
          <option value="">日</option>
          {DAYS.map((dy) => (
            <option key={dy} value={dy}>{dy}</option>
          ))}
        </select>
        <span style={sepStyle}>日</span>
      </div>
    </Field>
  );
}
