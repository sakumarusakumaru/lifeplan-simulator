"use client";

import { useEffect, useState } from "react";

import { Field } from "./Field";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
}

export function TextField({ label, value, onChange, placeholder, hint, className }: TextFieldProps) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <Field label={label} hint={hint} className={className}>
      <input
        type="text"
        className="bg-white px-2 py-1.5 text-xs font-bold outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[#c8383a]"
        style={{ border: "2px solid #0a0a0a", borderRadius: 8 }}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(text)}
      />
    </Field>
  );
}
