"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type ComponentType } from "react";

import { MonteCarloBadge } from "@/components/v4/MonteCarloPanel";
import { WarningsPanel } from "@/components/v4/WarningsPanel";
import { LivePreview } from "@/components/v5/LivePreview";
import { useUiStore } from "@/store/v4/ui-store";
import { SECTION_ORDER, TabModeContext } from "@/components/v4/Section";
import { AssetsMegaSection } from "@/components/v4/sections/mega/AssetsMegaSection";
import { ExpenseMegaSection } from "@/components/v4/sections/mega/ExpenseMegaSection";
import { IncomeMegaSection } from "@/components/v4/sections/mega/IncomeMegaSection";
import { SettingsMegaSection } from "@/components/v4/sections/mega/SettingsMegaSection";
import { usePlanStore } from "@/store/v4/plan-store";
import { useSimResult } from "@/store/v4/useSimResult";

// ver5（B案 ライブプレビュー型）: 4ブロックをタブで1つずつ。左に入力、右（スマホは画面下）に「いまの試算」

type SectionId = (typeof SECTION_ORDER)[number];

const BLOCKS: { id: SectionId; label: string; desc: string; Comp: ComponentType }[] = [
  { id: "ch-settings", label: "基本設定", desc: "本人・配偶者（計算の条件と税金は「詳細設定」に）", Comp: SettingsMegaSection },
  { id: "ch-income", label: "収入", desc: "給与・副業・年金（働いている間〜老後）", Comp: IncomeMegaSection },
  { id: "ch-assets", label: "資産・運用", desc: "現金・NISA・特定口座・iDeCo/DC・暗号資産・金・不動産投資", Comp: AssetsMegaSection },
  { id: "ch-expense", label: "支出", desc: "生活費・住まい・教育・保険・ライフイベント・介護", Comp: ExpenseMegaSection },
];

const INK = "#0a0a0a";
const LINE = "1.5px solid #0a0a0a";

function CheckIcon({ color = INK }: { color?: string }) {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M2 6.5l2.5 2.5L10 3.5" />
    </svg>
  );
}

export default function DetailPage() {
  const router = useRouter();
  const hydrated = usePlanStore((s) => s.hydrated);
  const plan = usePlanStore((s) => s.plan);
  const loadSample = usePlanStore((s) => s.loadSample);
  const result = useSimResult(plan);
  const mcOn = useUiStore((s) => s.mcOn);
  const unlocked = useUiStore((s) => s.unlocked);
  const confirmed = useUiStore((s) => s.confirmed);
  const confirm = useUiStore((s) => s.confirm);
  const setUnlocked = useUiStore((s) => s.setUnlocked);

  // いま開いているブロック。はじめての人はまだOKしていない最初のブロックから
  const [picked, setPicked] = useState<number | null>(null);
  const firstTodo = Math.max(0, SECTION_ORDER.findIndex((id) => !confirmed[id]));
  const active = picked ?? (unlocked === false ? firstTodo : 0);
  const [justDone, setJustDone] = useState(false);

  const stepping = hydrated && unlocked === false;

  const go = useCallback((i: number) => {
    setPicked(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // 入力を終えたら、その場で結果を見せる（右の「いまの試算」はずっと出ている）
  const finish = useCallback(() => {
    setUnlocked(true);
    setJustDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setUnlocked]);

  const trySample = () => {
    if (plan.selfBirth && !window.confirm("サンプル（35歳・会社員・持ち家）を読み込みます。\n今の入力内容は上書きされます。よろしいですか？")) return;
    loadSample();
    setUnlocked(true);
    setJustDone(true);
  };

  if (!hydrated || unlocked === null) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-[#0a0a0a]/60">
        loading...
      </main>
    );
  }

  const block = BLOCKS[active];
  const isLast = active === BLOCKS.length - 1;

  // 進めない理由・念のための確認（ver4 と同じ条件）
  const blocked = stepping && block.id === "ch-settings" && !plan.selfBirth ? "本人の生年月日を入れると次へ進めます" : null;
  const note =
    block.id === "ch-income" && plan.jobs.every((j) => !j.inc) && plan.sideJobs.every((j) => !j.inc)
      ? "年収が0円のままです。働いている方は「年収（額面）」を入れてください（収入がない場合はこのままでOK）"
      : block.id === "ch-expense" && !plan.livingM
        ? "毎月の生活費が0円のままです。だいたいの金額を入れると結果が現実に近くなります"
        : null;

  const next = () => {
    if (stepping) confirm(block.id);
    if (!isLast) go(active + 1);
    else if (stepping) finish();
    else router.push("/v5/result");
  };

  const nextLabel = isLast
    ? stepping
      ? "入力完了・結果を見る →"
      : "レポートを見る →"
    : `${stepping ? "OK・" : ""}次へ（${active + 2} ${BLOCKS[active + 1].label}）→`;

  const Comp = block.Comp;
  const previewProps = stepping
    ? { onShowNow: finish }
    : {
        onShowNow: () => router.push("/v5/result"),
        actionLabel: "詳しいレポートを見る →",
        showAccuracy: false,
        requireBirth: false,
      };

  return (
    <main className="px-4 py-6 pb-36 sm:px-8 lg:py-10 lg:pb-16" style={{ background: "#ffffff" }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          {justDone ? (
            <div
              className="flex flex-col gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-center"
              style={{ border: "1.5px solid #22863a", background: "#f0fff4" }}
              role="status"
            >
              <p className="flex-1 text-[12px] leading-relaxed">
                <span className="font-bold text-[#22863a]">あなたの結果が出ました。</span>
                <span className="hidden lg:inline">右</span>
                <span className="lg:hidden">画面下</span>
                の「いまの試算」が今の入力の結果です。入力を直すと、すぐに変わります。
              </p>
              <button
                type="button"
                onClick={() => router.push("/v5/result")}
                className="min-h-11 rounded-lg px-3 text-[12px] font-bold text-white"
                style={{ background: INK }}
              >
                詳しいレポートを見る →
              </button>
            </div>
          ) : null}

          {/* 4ブロックのタブ（状態つき） */}
          <nav aria-label="入力ブロック" className="grid grid-cols-4 overflow-hidden rounded-xl" style={{ border: LINE }}>
            {BLOCKS.map((b, i) => {
              const isCur = i === active;
              const ok = !!confirmed[b.id];
              const state = isCur ? "入力中" : ok ? "完了" : stepping ? "未入力" : "";
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-current={isCur ? "step" : undefined}
                  className="flex min-h-14 flex-col items-start justify-center gap-0.5 px-2 py-2 text-left sm:px-4"
                  style={{
                    background: isCur ? INK : "#ffffff",
                    color: isCur ? "#ffffff" : INK,
                    borderLeft: i === 0 ? "none" : "1px solid #0a0a0a33",
                  }}
                >
                  <span
                    className="flex items-center gap-1 text-[10px] font-bold sm:text-[11px]"
                    style={{ color: isCur ? "#ffffffcc" : "#55555a" }}
                  >
                    {ok && !isCur ? <CheckIcon /> : null}
                    {state || `0${i + 1}`}
                  </span>
                  <span className="text-[12px] font-bold leading-tight sm:text-sm">
                    {state ? <span className="hidden sm:inline">{i + 1} </span> : null}
                    {b.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <header className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold tracking-[0.14em] text-[#0a0a0a]/55">
              入力 {active + 1} / {BLOCKS.length}
            </p>
            <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{block.label}</h1>
            <p className="text-[13px] leading-relaxed text-[#0a0a0a]/70">{block.desc}</p>
            {active === 0 && stepping ? (
              <p className="mt-1 text-[13px] leading-relaxed">
                必須は<strong className="text-[#c8383a]">本人の生年月日だけ</strong>。ほかは空欄でも、平均的な値で計算します。
                入れるたびに<span className="hidden lg:inline">右</span>
                <span className="lg:hidden">画面下</span>の試算が動きます。
              </p>
            ) : null}
            {stepping ? (
              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[12px] font-bold">
                <button type="button" onClick={trySample} className="min-h-11 underline underline-offset-4 hover:text-[#c8383a]">
                  サンプルの人で試してみる
                </button>
                {plan.selfBirth ? (
                  <button type="button" onClick={finish} className="min-h-11 text-[#0a0a0a]/65 underline underline-offset-4 hover:text-[#c8383a]">
                    途中でも、今の内容で結果を見る
                  </button>
                ) : null}
              </div>
            ) : null}
          </header>

          <div className="border-t pt-6" style={{ borderTop: LINE }}>
            <TabModeContext.Provider value={true}>
              <Comp />
            </TabModeContext.Provider>
          </div>

          {/* 戻る・次へ */}
          <div className="flex flex-col gap-2 border-t pt-5" style={{ borderTop: LINE }}>
            {blocked ? (
              <p className="text-[12px] font-bold text-[#c8383a]">{blocked}</p>
            ) : note ? (
              <p className="text-[12px] font-bold text-[#a07900]">{note}</p>
            ) : (
              <p className="text-[12px] text-[#0a0a0a]/60">わからない項目は空欄・初期値のままで大丈夫です。あとからいつでも直せます。</p>
            )}
            <div className="flex flex-wrap justify-between gap-3">
              {active > 0 ? (
                <button
                  type="button"
                  onClick={() => go(active - 1)}
                  className="min-h-13 rounded-lg px-5 text-sm font-bold"
                  style={{ border: LINE, background: "#ffffff" }}
                >
                  ← {active} {BLOCKS[active - 1].label}
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={!!blocked}
                onClick={next}
                className="min-h-13 flex-1 rounded-lg px-6 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
                style={{ background: isLast && stepping ? "#c8383a" : INK }}
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </div>

        <aside className="hidden flex-col gap-4 lg:sticky lg:top-[calc(var(--lp-header-h,56px)+16px)] lg:flex lg:max-h-[calc(100vh-var(--lp-header-h,56px)-24px)] lg:self-start lg:overflow-y-auto">
          <LivePreview result={result} plan={plan} variant="side" {...previewProps} />
          {!stepping && mcOn ? <MonteCarloBadge /> : null}
          {!stepping ? <WarningsPanel warnings={result.warnings} /> : null}
        </aside>
      </div>
      <LivePreview result={result} plan={plan} variant="bar" {...previewProps} />
    </main>
  );
}
