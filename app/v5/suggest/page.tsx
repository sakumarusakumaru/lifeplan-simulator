"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { AllocationGuide } from "@/components/v4/AllocationGuide";
import { EnvironmentPanel } from "@/components/v4/EnvironmentPanel";
import {
  ENV_NONE,
  applyEnvPlan,
  crashAges,
  envActive,
  envReturns,
  type EnvInput,
} from "@/lib/v4/calc/environment";
import { ScenarioPreviewChart } from "@/components/v4/ScenarioPreviewChart";
import { dcSelfLimit } from "@/lib/v4/calc/rules";
import { simulate } from "@/lib/v4/calc/simulate";
import { usePlanStore } from "@/store/v4/plan-store";
import { useDisplayConverter } from "@/store/v4/useSimResult";
import { loanParts } from "@/lib/v4/calc/homeLoan";
import type { DrawOrderMode, PlanInput } from "@/lib/v4/calc/types";

const fmt = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
  return `${sign}${abs.toLocaleString()}万`;
};

const fmtDelta = (delta: number) => {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${fmt(delta)}`;
};

const DRAW_ORDER_LABEL: Record<DrawOrderMode, string> = {
  auto: "税金が少ない順（NISAは最後）",
  custom: "カスタム順序",
};

type Cat = "income" | "saving" | "spending" | "return" | "drawdown";

interface Scenario {
  id: string; // キープを覚えるための名前（入力が変わっても変わらない）
  group?: string; // 同時にキープできない打ち手の組
  title: string;
  detail: string;
  mod: (p: PlanInput) => PlanInput; // いまのプランをどう変えるか（キープした打ち手を重ねるのに使う）
  result: ReturnType<typeof simulate>;
  category: Cat;
}

// 同時に選べない打ち手（同じグループはどれか1つだけキープできる）
const groupOf = (sc: Pick<Scenario, "id" | "group">) => sc.group ?? sc.id;

// 年金の受給開始年齢による増減（繰上げ 1か月0.4%減・繰下げ 1か月0.7%増）
const penFactor = (age: number) => (age < 65 ? 1 - 0.004 * (65 - age) * 12 : 1 + 0.007 * (Math.min(75, age) - 65) * 12);
const penUpPct = (from: number, to: number) => Math.round((penFactor(to) / penFactor(from) - 1) * 1000) / 10;

const CAT_LABEL: Record<Cat, string> = {
  income: "01 ／ 収入の条件",
  saving: "02 ／ 積立・投資の条件",
  spending: "03 ／ 支出の条件",
  return: "04 ／ 運用利回りの条件",
  drawdown: "05 ／ 取り崩し方の条件",
};

export default function SuggestPage() {
  const plan = usePlanStore((s) => s.plan);
  const { convert } = useDisplayConverter();
  const [preview, setPreview] = useState<Scenario | null>(null);
  const [kept, setKept] = useState<string[]>([]);
  // 打ち手のグループ（01〜05）の折りたたみ
  const [collapsed, setCollapsed] = useState<Partial<Record<Cat, boolean>>>({});
  // 外的環境（大暴落・金利・物価など）。ページ全体（いまのプランと全ての打ち手）に重ねて試算する
  const [env, setEnv] = useState<EnvInput>(ENV_NONE);
  const normalBase = useMemo(
    () => convert(simulate(plan), plan),
    [plan, convert],
  );
  const base = useMemo(
    () =>
      envActive(env)
        ? convert(
            simulate(applyEnvPlan(plan, env), {
              returns: envReturns(plan, env),
            }),
            // 「今の価値」への割り戻しも、選んだ環境の物価で
            applyEnvPlan(plan, env),
          )
        : normalBase,
    [plan, env, convert, normalBase],
  );

  // すべてのシナリオをひとつの useMemo で計算（プラン変化時のみ再評価）
  const candidates: Scenario[] = useMemo(() => {
    const returns = envReturns(plan, env);
    const sim = (mod: (p: PlanInput) => PlanInput) =>
      convert(simulate(applyEnvPlan(mod(plan), env), { returns }), applyEnvPlan(plan, env));
    const last =
      plan.jobs.length > 0
        ? Math.max(...plan.jobs.map((j) => j.end))
        : plan.penStartA;

    const list: (Omit<Scenario, "result"> | null)[] = [];

    // ─────────────────────────
    // 01 収入を増やす
    // ─────────────────────────
    if (plan.jobs.length > 0) {
      list.push({
        id: "work2",
        group: "work",
        title: "2年長く働いた場合",
        detail: `${plan.jobs[0].name || "主勤務先"} の退職を ${plan.jobs[0].end}歳 → ${plan.jobs[0].end + 2}歳 に延長`,
        mod: ((p) => ({
          ...p,
          jobs: p.jobs.map((j, i) => (i === 0 ? { ...j, end: j.end + 2 } : j)),
        })),
        category: "income",
      });
      list.push({
        id: "work5",
        group: "work",
        title: "5年長く働いた場合",
        detail: `${plan.jobs[0].name || "主勤務先"} の退職を ${plan.jobs[0].end}歳 → ${plan.jobs[0].end + 5}歳 に延長。健康・体力次第だが厚生年金加入年数も伸びる`,
        mod: ((p) => ({
          ...p,
          jobs: p.jobs.map((j, i) => (i === 0 ? { ...j, end: j.end + 5 } : j)),
        })),
        category: "income",
      });
    }

    {
      // 繰り下げ先の候補（+2年・70歳・75歳）。同じ年齢になるものは1枚にまとめる
      const from = plan.penStartA;
      const targets = [...new Set([Math.min(75, from + 2), 70, 75])].filter((to) => to > from).sort((x, y) => x - y);
      for (const to of targets) {
        const pct = penUpPct(from, to);
        list.push({
          id: `pen${to === 70 || to === 75 ? to : "2"}`,
          group: "pension",
          title: `年金を${to}歳から受け取る場合（いまは${from}歳から）`,
          detail:
            from < 65
              ? `月額が${from}歳開始より約${pct}%増える（65歳より前は1か月0.4%減、65歳より後は1か月0.7%増）。受給期間は短くなる`
              : `1か月あたり0.7%増で、月額が約${pct}%増える。受給期間は短くなる${to === 75 ? "。健康寿命とのバランスも考えたい" : ""}`,
          mod: ((p) => ({ ...p, penStartA: to })),
          category: "income",
        });
      }
    }

    list.push({
      id: "side",
      title: "副業で月3万円（年36万円）の収入がある場合",
      detail: `現在から退職予定（${last}歳）まで月3万円の副業収入を加算`,
      mod: ((p) => ({
        ...p,
        sideJobs: [
          ...p.sideJobs,
          {
            name: "副業（試算）",
            start: p.curAge,
            end: Math.min(last, 70),
            inc: 360000,
          },
        ],
      })),
      category: "income",
    });

    // 配偶者がいる人だけ
    if (plan.spouseBirth) list.push({
      id: "spouse",
      title: "配偶者の収入が年100万円多い場合",
      detail:
        plan.spouseWork === "work"
          ? `配偶者収入 ${(plan.spouseIncY / 10000).toFixed(0)}万円/年 → ${((plan.spouseIncY + 1_000_000) / 10000).toFixed(0)}万円/年`
          : `配偶者の就労を開始（年100万円・社保扶養内目安）`,
      mod: ((p) => ({
        ...p,
        spouseWork: "work",
        spouseIncY: p.spouseIncY + 1_000_000,
        spouseIncStart: p.spouseWork === "work" ? p.spouseIncStart : p.curAge,
        spouseIncEnd: p.spouseWork === "work" ? p.spouseIncEnd : 65,
      })),
      category: "income",
    });

    // ─────────────────────────
    // 02 積立・投資を増やす
    // ─────────────────────────
    const nisaM = plan.nisaTsumitateM + plan.nisaGrowthM;
    list.push({
      id: "nisa2",
      group: "nisa",
      title: "NISAの積立が月2万円多い場合",
      detail: `NISA積立 ${(nisaM / 10000).toFixed(1)}万 → ${((nisaM + 20000) / 10000).toFixed(1)}万円/月。つみたて投資枠（月10万まで）から埋める`,
      mod: ((p) => ({ ...p, nisaTsumitateM: p.nisaTsumitateM + 20000 })),
      category: "saving",
    });
    list.push({
      id: "nisa5",
      group: "nisa",
      title: "NISAの積立が月5万円多い場合",
      detail: `NISA積立 ${(nisaM / 10000).toFixed(1)}万 → ${((nisaM + 50000) / 10000).toFixed(1)}万円/月。年60万円の追加で非課税の複利が働く`,
      mod: ((p) => ({ ...p, nisaGrowthM: p.nisaGrowthM + 50000 })),
      category: "saving",
    });
    if (plan.saveTokuM > 0 && nisaM < 300_000) {
      const move = Math.min(plan.saveTokuM, 300_000 - nisaM);
      list.push({
        id: "toku2nisa",
        group: "nisa",
        title: "特定口座の積立をNISAで行った場合",
        detail: `特定口座の積立 月${(move / 10000).toFixed(1)}万をNISAへ。同じ商品・同じ金額でも、売却時の20.315%がかからない`,
        mod: ((p) => ({
          ...p,
          saveTokuM: p.saveTokuM - move,
          nisaGrowthM:
            p.nisaGrowthM +
            Math.max(0, move - Math.max(0, 100_000 - p.nisaTsumitateM)),
          nisaTsumitateM: Math.min(100_000, p.nisaTsumitateM + move),
        })),
        category: "saving",
      });
    }
    {
      const lim = dcSelfLimit(plan.dcType, plan.dcEmployerM, 2027).selfMax;
      if (plan.saveDcM < lim) {
        list.push({
          id: "dcmax",
          title: `iDeCo等の掛金を上限（月${(lim / 10000).toFixed(1)}万円）にした場合`,
          detail: `本人掛金 ${(plan.saveDcM / 10000).toFixed(1)}万 → ${(lim / 10000).toFixed(1)}万/月（2027年〜の上限）。全額所得控除で毎年の税金が減る。60歳まで引き出せない点に注意`,
          mod: ((p) => ({ ...p, saveDcM: lim })),
          category: "saving",
        });
      }
    }
    if (plan.dcBal > 0 || plan.saveDcM > 0 || plan.dcEmployerM > 0) {
      list.push({
        id: "dcmethod",
        title:
          plan.dcMethod === "lump"
            ? "DCを年金（10年）で受け取る場合"
            : "DCを一時金で受け取る場合",
        detail:
          plan.dcMethod === "lump"
            ? "退職金と受取時期が近く退職所得控除が足りない場合は、年金受取の方が有利になることがある"
            : "退職所得控除の枠が余っているなら、一時金の方が税・社保の負担が軽くなりやすい",
        mod: ((p) => ({
          ...p,
          dcMethod: p.dcMethod === "lump" ? "annuity" : "lump",
          dcYears: 10,
        })),
        category: "saving",
      });
    }

    // ─────────────────────────
    // 03 支出を減らす
    // ─────────────────────────
    if (plan.livingM > 10000) {
      list.push({
        id: "living1",
        group: "living",
        title: "毎月の生活費が1万円少ない場合",
        detail: `生活費 ${(plan.livingM / 10000).toFixed(0)}万 → ${(Math.max(0, plan.livingM - 10000) / 10000).toFixed(0)}万円/月`,
        mod: ((p) => ({ ...p, livingM: Math.max(0, p.livingM - 10000) })),
        category: "spending",
      });
    }
    if (plan.livingM > 20000) {
      list.push({
        id: "living2",
        group: "living",
        title: "毎月の生活費が2万円少ない場合",
        detail: `生活費 ${(plan.livingM / 10000).toFixed(0)}万 → ${(Math.max(0, plan.livingM - 20000) / 10000).toFixed(0)}万円/月。固定費（通信・サブスク・保険）見直しの目安`,
        mod: ((p) => ({ ...p, livingM: Math.max(0, p.livingM - 20000) })),
        category: "spending",
      });
    }
    if (plan.specialY >= 500000) {
      list.push({
        id: "special50",
        group: "special",
        title: "年間の特別費が50万円少ない場合",
        detail: `特別費 ${(plan.specialY / 10000).toFixed(0)}万 → ${(Math.max(0, plan.specialY - 500000) / 10000).toFixed(0)}万円/年`,
        mod: ((p) => ({
          ...p,
          specialY: Math.max(0, p.specialY - 500000),
        })),
        category: "spending",
      });
    }
    if (plan.specialY >= 1_000_000) {
      list.push({
        id: "special100",
        group: "special",
        title: "年間の特別費が100万円少ない場合",
        detail: `特別費 ${(plan.specialY / 10000).toFixed(0)}万 → ${(Math.max(0, plan.specialY - 1_000_000) / 10000).toFixed(0)}万円/年`,
        mod: ((p) => ({
          ...p,
          specialY: Math.max(0, p.specialY - 1_000_000),
        })),
        category: "spending",
      });
    }
    // 今の預金から500万円を払って一部繰上返済（来年のはじめ）。預金が500万円ない人・まだ借りていない人には出さない
    {
      const hlTotal = loanParts(plan).reduce((a2, x) => a2 + x.bal, 0);
      if (plan.useHomeLoan && hlTotal > 5_000_000 && plan.hlStart <= plan.curAge && plan.cashBal >= 5_000_000) {
        // 繰上返済はその年の支出として計算される（預金から出る）ので、ここでは予定を足すだけ
        const prepay = (kind: "shorten" | "reduce") => (p: PlanInput): PlanInput => ({
          ...p,
          hlPrepays: [...(p.hlPrepays ?? []), { age: p.curAge + 1, amount: 5_000_000, kind }],
        });
        list.push({
          id: "prepayShorten",
          group: "prepay",
          title: "500万円を繰上返済した場合（期間短縮型）",
          detail: `来年、預金から500万円を返す。毎月の返済額はそのままで、返し終わりが早くなる（利息の減りはこちらが大きい）`,
          mod: prepay("shorten"),
          category: "spending",
        });
        list.push({
          id: "prepay",
          group: "prepay",
          title: "500万円を繰上返済した場合（返済額軽減型）",
          detail: `来年、預金から500万円を返す。返し終わる時期はそのままで、毎月の返済額が減る`,
          mod: prepay("reduce"),
          category: "spending",
        });
      }
    }

    // ─────────────────────────
    // 04 運用利回りを改善する
    // ─────────────────────────
    list.push({
      id: "nisaR",
      group: "return",
      title: "NISAの利回りが年1%高い場合",
      detail: `NISA ${plan.nisaR.toFixed(1)}% → ${(plan.nisaR + 1).toFixed(1)}%。信託報酬の安い全世界株型などへの切替を想定`,
      mod: ((p) => ({ ...p, nisaR: p.nisaR + 1 })),
      category: "return",
    });
    list.push({
      id: "allR",
      group: "return",
      title: "すべての運用の利回りが年0.5%高い場合",
      detail: `NISA・特定口座・DCすべての年率を+0.5%。リバランス・コスト見直しの統合効果`,
      mod: ((p) => ({
        ...p,
        nisaR: p.nisaR + 0.5,
        tokuR: p.tokuR + 0.5,
        dcR: p.dcR + 0.5,
      })),
      category: "return",
    });
    // ─────────────────────────
    // 05 取り崩し戦略を変える
    // ─────────────────────────
    if (plan.drawOrder !== "auto") {
      list.push({
        id: "draw",
        title: "取り崩しを税金の少ない順にした場合",
        detail: `現在: ${DRAW_ORDER_LABEL[plan.drawOrder]} → 税金が少ないものから売り、非課税のNISAを最後まで残す`,
        mod: ((p) => ({ ...p, drawOrder: "auto" as DrawOrderMode })),
        category: "drawdown",
      });
    }

    return (list.filter(Boolean) as Omit<Scenario, "result">[]).map((sc) => ({ ...sc, result: sim(sc.mod) }));
  }, [plan, convert, env]);

  // 表示対象：
  //  - プラスになるシナリオ（最終純資産が増える、or 資金ショートが改善する）
  //  - 取り崩し系で差が極小（10万未満）のものは隠す
  const MIN_DELTA = 100_000;
  const visible = candidates
    .filter((s) => {
      const delta = s.result.finalNetWorth - base.finalNetWorth;
      const shortfallImproved =
        s.result.shortfallAge === null && base.shortfallAge !== null;
      const shortfallLater =
        s.result.shortfallAge !== null &&
        base.shortfallAge !== null &&
        s.result.shortfallAge > base.shortfallAge;
      // プラス方向のみ：NWが増える or ショートが解消・後ろ倒し
      const isPositive =
        delta > MIN_DELTA || shortfallImproved || shortfallLater;
      if (!isPositive) return false;
      // drawdown系で差が小さければ隠す
      if (s.category === "drawdown" && Math.abs(delta) < MIN_DELTA)
        return false;
      return true;
    });

  // 効果の大きい順に並べ替え（最終純資産の上昇幅で降順）
  visible.sort(
    (a, b) =>
      b.result.finalNetWorth -
      base.finalNetWorth -
      (a.result.finalNetWorth - base.finalNetWorth),
  );

  // キープした打ち手（クリック・タップで付け外し）。キープした打ち手は重ねて試算する
  const keptList = useMemo(
    () => kept.map((id) => candidates.find((c) => c.id === id)).filter(Boolean) as Scenario[],
    [kept, candidates],
  );
  const simWith = useCallback(
    (list: Scenario[]) =>
      convert(
        simulate(applyEnvPlan(list.reduce((p, sc) => sc.mod(p), plan), env), { returns: envReturns(plan, env) }),
        applyEnvPlan(plan, env),
      ),
    [plan, env, convert],
  );
  const keptResult = useMemo(() => (keptList.length ? simWith(keptList) : null), [keptList, simWith]);
  // マウスを乗せている（長押ししている）打ち手を、キープ中の打ち手に重ねたとき（同じグループのキープは置き換える）
  const hoverResult = useMemo(() => {
    if (!preview) return null;
    if (kept.includes(preview.id)) return keptResult;
    if (!keptList.length) return preview.result;
    return simWith([...keptList.filter((k) => groupOf(k) !== groupOf(preview)), preview]);
  }, [preview, kept, keptList, keptResult, simWith]);
  const toggleKeep = (sc: Scenario) =>
    setKept((ks) =>
      ks.includes(sc.id)
        ? ks.filter((id) => id !== sc.id)
        : [...ks.filter((id) => { const k = candidates.find((c) => c.id === id); return !k || groupOf(k) !== groupOf(sc); }), sc.id],
    );
  // キープ済みのカードに乗せているときは、キープの組み合わせをそのまま見せる
  const hover = preview && !kept.includes(preview.id) ? preview : null;
  const shownResult = hover ? hoverResult : keptResult;
  const shownTitle = hover
    ? keptList.length
      ? `キープ中の${keptList.length}件 ＋ ${hover.title}`
      : hover.title
    : keptList.length
      ? keptList.map((k) => k.title).join(" ＋ ")
      : null;
  const shownKicker = hover
    ? keptList.length
      ? "キープ中の条件に重ねると"
      : "この条件で試算すると"
    : keptList.length
      ? `キープした条件${keptList.length}件を合わせると`
      : null;

  // マウスを乗せている間（PC）／押している間（タッチ）だけ、その打ち手をグラフに映す。
  // クリック（タップ）でキープし、もう一度でキープを外す。長押しのあとはキープしない
  const pressAt = useRef(0);
  const pressHandlers = (sc: Scenario) => ({
    onPointerDown: (e: React.PointerEvent) => {
      pressAt.current = Date.now();
      if (e.pointerType !== "mouse") setPreview(sc);
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") setPreview(null);
    },
    onPointerCancel: () => setPreview(null),
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setPreview(sc);
    },
    onPointerLeave: () => setPreview(null),
    onClick: () => {
      if (Date.now() - pressAt.current < 500) toggleKeep(sc);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      {/* Header */}
      <div className="mb-6 border-b-2 border-[#0a0a0a] pb-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">
          比較
        </p>
        <h1 className="text-2xl font-bold text-[#0a0a0a]">
          こうしたら、どう変わる？
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#0a0a0a]/60">
          いまのプランから条件を1つだけ変えたときの試算です。結果がよくなるものを、差の大きい順に並べています。どれかをすすめるものではありません（暮らし方・リスクの取り方・健康などで、合う選び方は変わります）。
          <b className="text-[#0a0a0a]">
            PCはマウスを乗せる（スマホは長押し）と、上のグラフがその条件に変わります。クリック（タップ）するとその条件をキープし、もう一度でキープを外します。キープした条件は重ねて試算できます。
          </b>
        </p>
      </div>

      {/* グラフの固定表示は打ち手カードの範囲だけ（下の配分の解説ではスクロールで外れる） */}
      <div>
        <ScenarioPreviewChart
          normal={normalBase}
          base={base}
          preview={shownResult}
          previewTitle={shownTitle}
          previewKicker={shownKicker}
          kept={keptList.length > 0}
          envOn={envActive(env)}
          crashAges={crashAges(plan, env)}
          domainSeries={[normalBase, base, ...visible.map((v) => v.result), ...(keptResult ? [keptResult] : []), ...(hoverResult ? [hoverResult] : [])]}
        />

        {/* キープ中の打ち手 */}
        {keptList.length > 0 ? (
          <div className="mb-4 rounded-xl p-3" style={{ background: "#f0fff4", border: "2px solid #22863a" }}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-bold text-[#22863a]">キープ中（重ねて試算）</span>
              {keptList.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => toggleKeep(k)}
                  className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold"
                  style={{ border: "1.5px solid #22863a", color: "#0a0a0a" }}
                  aria-label={`${k.title}のキープを外す`}
                >
                  {k.title} ×
                </button>
              ))}
              <button type="button" onClick={() => setKept([])} className="ml-auto text-[10px] font-bold text-[#0a0a0a]/60 underline">
                すべて外す
              </button>
            </div>
            {keptResult ? (
              <p className="mt-2 text-[11px] font-bold">
                合わせると最後の年の金融純資産 {fmt(keptResult.finalNetWorth)}
                <span className="ml-1" style={{ color: keptResult.finalNetWorth - base.finalNetWorth >= 0 ? "#22863a" : "#c8383a" }}>
                  （{fmtDelta(keptResult.finalNetWorth - base.finalNetWorth)}）
                </span>
                {base.shortfallAge !== null
                  ? keptResult.shortfallAge === null
                    ? "・資金ショートが解消"
                    : `・資金ショート ${base.shortfallAge}歳 → ${keptResult.shortfallAge}歳`
                  : keptResult.shortfallAge !== null
                    ? `・${keptResult.shortfallAge}歳で資金ショート`
                    : ""}
              </p>
            ) : null}
            <p className="mt-1 text-[9px] text-[#0a0a0a]/50">それぞれのカードの金額は、その条件だけを変えたときの変化です。同じ種類の条件（働く年数・年金の受け取り開始・NISAの積立・生活費・特別費・利回り）は、どれか1つだけキープできます。</p>
          </div>
        ) : null}

        {/* Base result */}
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-xl p-4"
          style={{ background: "#0a0a0a", borderRadius: 12 }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">
              {envActive(env)
                ? "現在のプラン（選んだ外的環境）"
                : "現在のプラン（ベースライン）"}
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">最後の年の金融純資産</p>
            {base.shortfallAge && (
              <p className="mt-0.5 text-[10px] text-[#f87171]">
                ⚠ {base.shortfallAge}歳で資金ショート
              </p>
            )}
            <p className="mt-1 text-[10px] text-white/50">
              取崩順: {DRAW_ORDER_LABEL[plan.drawOrder]}
            </p>
          </div>
          <p
            className="shrink-0 whitespace-nowrap text-xl font-bold tabular-nums sm:text-2xl"
            style={{ color: base.finalNetWorth < 0 ? "#f87171" : "#86efac" }}
          >
            {fmt(base.finalNetWorth)}
          </p>
        </div>

        {/* Category groups */}
        {(["income", "saving", "spending", "return", "drawdown"] as Cat[]).map(
          (cat) => {
            const items = visible.filter((s) => s.category === cat);
            const envAfter =
              cat === "return" ? (
                <EnvironmentPanel
                  env={env}
                  setEnv={setEnv}
                  normal={normalBase}
                  current={base}
                />
              ) : null;
            if (items.length === 0)
              return <Fragment key={cat}>{envAfter}</Fragment>;
            const closed = !!collapsed[cat];
            return (
              <Fragment key={cat}>
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))
                    }
                    aria-expanded={!closed}
                    className="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1 text-left"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/70">
                      {CAT_LABEL[cat]}
                      <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-[#0a0a0a]/45">
                        {items.length}件
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`text-sm font-bold text-[#0a0a0a] transition-transform duration-200 ${closed ? "" : "rotate-180"}`}
                    >
                      ▾
                    </span>
                  </button>
                  {closed ? null : (
                    <div className="flex flex-col gap-3">
                      {items.map((sc) => {
                        const delta =
                          sc.result.finalNetWorth - base.finalNetWorth;
                        const positive = delta >= 0;
                        const shortfallChanged =
                          sc.result.shortfallAge !== base.shortfallAge;
                        const shortfallFixed =
                          sc.result.shortfallAge === null &&
                          base.shortfallAge !== null;
                        const shortfallWorsened =
                          sc.result.shortfallAge !== null &&
                          base.shortfallAge === null;

                        const pressed = preview?.id === sc.id;
                        const isKept = kept.includes(sc.id);
                        return (
                          <div
                            key={sc.id}
                            className="cursor-pointer rounded-xl p-4 transition-all duration-150"
                            style={{
                              background: isKept ? "#f0fff4" : pressed ? "#f6fff8" : "#fff",
                              border: isKept
                                ? "2.5px solid #22863a"
                                : pressed
                                  ? `2px solid ${positive ? "#22863a" : "#c8383a"}`
                                  : "2px solid #0a0a0a18",
                              transform: pressed ? "scale(0.985)" : undefined,
                              // 長押しで文字選択・iOSのメニューが出ないように
                              WebkitTouchCallout: "none",
                              userSelect: "none",
                              WebkitUserSelect: "none",
                            }}
                            {...pressHandlers(sc)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-xs font-bold text-[#0a0a0a]">
                                  {isKept ? (
                                    <span className="mr-1.5 inline-block rounded px-1.5 py-0.5 align-[1px] text-[9px] text-white" style={{ background: "#22863a" }}>
                                      キープ中
                                    </span>
                                  ) : null}
                                  {sc.title}
                                </p>
                                <p className="mt-0.5 text-[10px] leading-relaxed text-[#0a0a0a]/50">
                                  {sc.detail}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p
                                  className="text-lg font-bold tabular-nums"
                                  style={{
                                    color: positive ? "#22863a" : "#c8383a",
                                  }}
                                >
                                  {fmtDelta(delta)}
                                </p>
                                <p className="text-[9px] text-[#0a0a0a]/40">
                                  最後の年の金融純資産の変化
                                </p>
                              </div>
                            </div>

                            {shortfallChanged && (
                              <div
                                className="mt-3 rounded-lg px-3 py-2 text-[10px] font-bold"
                                style={{
                                  background: shortfallFixed
                                    ? "#f0fff4"
                                    : "#fff0f0",
                                  color: shortfallFixed ? "#22863a" : "#c8383a",
                                }}
                              >
                                {shortfallFixed
                                  ? `✓ 資金ショート（${base.shortfallAge}歳）が解消されます`
                                  : shortfallWorsened
                                    ? `⚠ 資金ショートが${sc.result.shortfallAge}歳に発生します`
                                    : `資金ショート ${base.shortfallAge}歳 → ${sc.result.shortfallAge}歳`}
                              </div>
                            )}

                            <div className="mt-3 flex items-center justify-between text-[10px] text-[#0a0a0a]/40">
                              <span>
                                最後の年の金融純資産:{" "}
                                <span
                                  className="font-bold"
                                  style={{
                                    color:
                                      sc.result.finalNetWorth < 0
                                        ? "#c8383a"
                                        : "#0a0a0a",
                                  }}
                                >
                                  {fmt(sc.result.finalNetWorth)}
                                </span>
                              </span>
                              <span>
                                {sc.result.shortfallAge
                                  ? `ショート: ${sc.result.shortfallAge}歳`
                                  : "ショートなし"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {envAfter}
              </Fragment>
            );
          },
        )}

        {visible.length === 0 && (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
          >
            <p className="text-sm text-[#0a0a0a]/50">
              今の入力では、結果がよくなる条件が見つかりませんでした。入力を変えると、ここに表示されます。
            </p>
          </div>
        )}
      </div>

      <AllocationGuide plan={plan} base={base} />

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/v5/result"
          className="flex-1 py-3 text-center text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
          style={{
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
            color: "#0a0a0a",
          }}
        >
          ← レポートに戻る
        </Link>
        <Link
          href="/v5/detail"
          className="flex-1 py-3 text-center text-xs font-bold text-white transition-colors hover:opacity-80"
          style={{
            background: "#0a0a0a",
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
          }}
        >
          入力を修正する →
        </Link>
      </div>

      <p className="mt-4 text-[9px] leading-relaxed text-[#0a0a0a]/40">
        ※本結果は概算です。実際の年金額・税額・運用成果は異なります。投資・税務等の判断は必ず専門家にご相談ください。
      </p>
    </main>
  );
}
