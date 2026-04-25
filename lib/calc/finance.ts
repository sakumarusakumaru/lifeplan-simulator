import type { Insurance, SchoolType } from "./types";

export function pmt(rate: number, n: number, principal: number): number {
  if (rate === 0) return principal / n;
  return (principal * rate) / (1 - Math.pow(1 + rate, -n));
}

export function calcInsuranceY(
  insurances: Insurance[],
  age: number,
  infl: number,
): number {
  let sum = 0;
  for (const p of insurances) {
    if (!p) continue;
    if (p.enabled === false) continue;
    if (age >= p.start && age <= p.end) {
      sum += p.premM * 12 * infl;
    }
  }
  return sum;
}

export const EDU: Record<"k" | "e" | "j" | "h" | "u" | "g" | "r", Record<SchoolType, number>> = {
  k: { pub: 20, pri: 50 },
  e: { pub: 30, pri: 100 },
  j: { pub: 40, pri: 120 },
  h: { pub: 40, pri: 100 },
  u: { pub: 120, pri: 180 },
  g: { pub: 120, pri: 180 },
  r: { pub: 100, pri: 100 },
};
