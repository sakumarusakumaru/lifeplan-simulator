"use client";

import { useEffect, useRef, useState } from "react";

// グラフの変化を2段階で、どちらもなめらかに見せる。
//   1段目（MOVE_MS）: 目盛りはそのまま、線（データ）だけが新しい値へ動く。増えたか減ったかが分かる
//   2段目（SCALE_MS）: 目盛り（縦軸の範囲）が伸び縮みし、線も目盛りと一緒に動いて、元の縦横の比率に戻る
// どちらも自前で1コマずつ描くので、グラフの部品側のアニメーションは切っておく（isAnimationActive={false}）。
// 目盛りの数字は、動いている間は同じ刻み（大きい方の刻み）のまま滑らせ、数字が途中でパッと変わらないようにする。

const MOVE_MS = 380;
const SCALE_MS = 520;
const ease = (k: number) => 1 - Math.pow(1 - k, 3);

type Row = Record<string, unknown>;

function lerpRows<T extends Row>(from: T[], to: T[], k: number): T[] {
  if (from.length !== to.length) return to;
  return to.map((t, i) => {
    const f = from[i];
    const out: Row = { ...t };
    for (const key of Object.keys(t)) {
      if (key === "age") continue;
      const a = f?.[key];
      const b = t[key];
      if (typeof a === "number" && typeof b === "number") out[key] = a + (b - a) * k;
    }
    return out as T;
  });
}

// きりのよい刻み（1・2・2.5・5 ×10のべき乗）
export function niceStep(span: number): number {
  const s = Math.max(span, 1_000_000);
  const step = Math.pow(10, Math.floor(Math.log10(s / 4)));
  return [1, 2, 2.5, 5, 10].map((m) => m * step).find((u) => s / u <= 5) ?? step * 10;
}

// 目盛りがきりのよい数になる範囲（0は必ず含める）
export function niceDomain(lo: number, hi: number): [number, number] {
  const l = Math.min(0, lo);
  const h = Math.max(0, hi);
  const unit = niceStep(h - l);
  return [Math.floor(l / unit) * unit, Math.ceil(h / unit) * unit];
}

function ticksOf([lo, hi]: [number, number], step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-6; v += step) out.push(Math.round(v));
  return out;
}

export function useAnimatedChart<T extends Row>(data: T[], target: [number, number]) {
  const [state, setState] = useState(() => ({ data, domain: target, step: niceStep(target[1] - target[0]) }));
  const cur = useRef(state);
  const first = useRef(true);
  const [lo, hi] = target;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      const s = { data, domain: [lo, hi] as [number, number], step: niceStep(hi - lo) };
      cur.current = s;
      setState(s);
      return;
    }
    const fromData = cur.current.data;
    const fromDom = cur.current.domain;
    const toDom: [number, number] = [lo, hi];
    // 動いている間の刻みは、前と後の大きい方（数字が途中で入れ替わらないように）
    const moveStep = Math.max(niceStep(fromDom[1] - fromDom[0]), niceStep(hi - lo));
    const finalStep = niceStep(hi - lo);
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = now - t0;
      let next;
      if (t < MOVE_MS) {
        next = { data: lerpRows(fromData, data, ease(t / MOVE_MS)), domain: fromDom, step: moveStep };
      } else if (t < MOVE_MS + SCALE_MS) {
        const k = ease((t - MOVE_MS) / SCALE_MS);
        next = { data, domain: [fromDom[0] + (toDom[0] - fromDom[0]) * k, fromDom[1] + (toDom[1] - fromDom[1]) * k] as [number, number], step: moveStep };
      } else {
        next = { data, domain: toDom, step: finalStep };
      }
      cur.current = next;
      setState(next);
      if (t < MOVE_MS + SCALE_MS) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // data は呼び出し側で useMemo しておく
  }, [data, lo, hi]);

  return { data: state.data, domain: state.domain, ticks: ticksOf(state.domain, state.step) };
}
