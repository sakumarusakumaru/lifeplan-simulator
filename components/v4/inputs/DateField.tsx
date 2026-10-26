"use client";

import { useEffect, useState } from "react";

import { Field } from "./Field";

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  className?: string;
}

export function DateField({ label, value, onChange, hint, className }: DateFieldProps) {
  // iOS Safari だけは空の日付欄に何も表示しないので、案内を重ねる（Android/PC は「年/月/日」が出る）
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(/iP(hone|ad|od)/.test(navigator.userAgent));
  }, []);
  return (
    <Field label={label} hint={hint} className={className}>
      {/* iOS Safari は空の date 入力の幅・高さが崩れるので、appearance を消して高さを固定する */}
      <span className="relative block min-w-0">
        <input
          type="date"
          className="block h-[34px] w-full min-w-0 appearance-none bg-white px-2 text-left text-xs font-bold outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[#c8383a]"
          style={{ border: "2px solid #0a0a0a", borderRadius: 8, WebkitAppearance: "none" }}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
        {!value && isIOS ? (
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs font-bold text-[#0a0a0a]/35">
            タップして選択
          </span>
        ) : null}
      </span>
    </Field>
  );
}
