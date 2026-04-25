import type { PlanInput } from "./types";

export function ymdToday(): string {
  const t = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${z(t.getMonth() + 1)}-${z(t.getDate())}`;
}

export function parseYMD(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function ageOn(birth: string, ref?: string | null): number | null {
  const b = parseYMD(birth);
  if (!b) return null;
  const r = parseYMD(ref ?? null) ?? new Date();
  let a = r.getFullYear() - b.getFullYear();
  const m = r.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && r.getDate() < b.getDate())) a--;
  return a;
}

export function birthYearGuess(input: Pick<PlanInput, "selfBirth" | "baseDate" | "curAge">): number {
  const by = parseYMD(input.selfBirth)?.getFullYear();
  if (by) return by;
  const y = (parseYMD(input.baseDate) ?? new Date()).getFullYear();
  return y - input.curAge;
}

export function yearToStartAge(
  val: number | string,
  input: Pick<PlanInput, "selfBirth" | "baseDate" | "curAge">,
): number {
  const v = typeof val === "number" ? val : Number(String(val).replace(/,/g, ""));
  if (!Number.isFinite(v)) return 0;
  if (v >= 1900) {
    const by = birthYearGuess(input);
    if (by) return v - by;
  }
  return v;
}

export function kidOffset(selfBirth: string, baseDate: string, kidBirth: string): number {
  const ref = baseDate || ymdToday();
  const sa = ageOn(selfBirth, ref);
  const ka = ageOn(kidBirth, ref);
  if (sa === null || ka === null) return 0;
  return sa - ka;
}

export function kidAge(birth: string, baseDate: string): number | null {
  const ref = baseDate || ymdToday();
  return ageOn(birth, ref);
}
