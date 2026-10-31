"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AssumptionTiers } from "@/components/v5/AssumptionTiers";
import { AssetsChart } from "@/components/v4/charts/AssetsChart";
import { CashflowChart } from "@/components/v4/charts/CashflowChart";
import { MonteCarloPanel } from "@/components/v4/MonteCarloPanel";
import { WarningsPanel } from "@/components/v4/WarningsPanel";
import { useIsNarrow } from "@/components/v4/useIsNarrow";
import { ageOn, kidAge } from "@/lib/v4/calc/age";
import { computeRealEstateValue, ownsHomeAt } from "@/lib/v4/calc/finance";
import type { PlanInput, SimulationSummary } from "@/lib/v4/calc/types";
import { usePlanStore } from "@/store/v4/plan-store";
import { useSimResult } from "@/store/v4/useSimResult";
import { useUiStore } from "@/store/v4/ui-store";
import { deflator } from "@/lib/v4/calc/realValue";

const fmt = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
  return `${sign}${abs.toLocaleString()}万`;
};

const fmtMan = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  return `${sign}${abs.toLocaleString()}万円`;
};

interface Verdict {
  score: number;
  level: "good" | "warn" | "bad";
  headline: string;
  body: string; // 改行（\n\n）でパラグラフ分け
}

function buildVerdict(
  plan: PlanInput,
  result: SimulationSummary,
  real: boolean,
): Verdict {
  const nw = result.finalNetWorth;
  // 判定は表示モードに関係なく「今の価値」で行う
  const lastRow = result.rows[result.rows.length - 1];
  const nwJudge = real || !lastRow ? nw : nw / deflator(plan, lastRow.age);
  // 見出しの金額: 判定は「今の価値」で行うので、名目表示のときは今の価値も添える
  const nwLabel = (v: number) => (real || !lastRow ? fmtMan(v) : `${fmtMan(v)}・今の価値で約${fmtMan(nwJudge)}`);
  const sa = result.shortfallAge;
  const endAge = plan.endAge;
  const curAge = plan.curAge;

  // 各種指標を取得（コメントで参照）
  const cur = result.rows[0];
  const curIncome = Math.round((cur?.income ?? 0) / 10000);
  const curExp = Math.round((cur?.exp ?? 0) / 10000);
  const monthlyDeficit = Math.round((curExp - curIncome) / 12);
  // 生活防衛資金は、すぐ使える預金だけで数える（目安は生活費の6〜12か月分。比較画面の資産配分の説明と同じ）
  const totalCashAssets = Math.round(plan.cashBal / 10000);
  const monthlyExp = Math.round(curExp / 12);
  const livingDefenseMonths =
    monthlyExp > 0 ? Math.round((totalCashAssets / monthlyExp) * 10) / 10 : 0;
  const totalSaveM =
    plan.nisaTsumitateM + plan.nisaGrowthM + plan.saveTokuM + plan.saveDcM + plan.saveCryptoM + plan.saveGoldM;
  const annualSave = Math.round((totalSaveM * 12) / 10000);
  const koseiYears = plan.selfPension?.koseiYears ?? 0;
  const penStartA = plan.penStartA;
  const lastJobEndAge =
    plan.jobs.length > 0 ? Math.max(...plan.jobs.map((j) => j.end)) : penStartA;
  const fmtMan = (yen: number) => {
    const sign = yen < 0 ? "-" : "";
    const abs = Math.abs(Math.round(yen / 10000));
    if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}億`;
    return `${sign}${abs.toLocaleString()}万`;
  };

  // ─────────────────────────
  // ショートあり
  // ─────────────────────────
  if (sa) {
    const yearsLeft = sa - curAge;
    let score: number;
    if (yearsLeft < 10) score = 15;
    else if (yearsLeft < 25) score = 30;
    else score = 45;

    const headline = `${sa}歳で資金不足（あと${yearsLeft}年）`;
    const body =
      `【現状診断】\n現役期の収支・積立水準では、${sa}歳時点（残り${yearsLeft}年）で運用資産・現金がともに枯渇する見込みです。現状の年間収支は手取り${curIncome}万円・支出${curExp}万円で${monthlyDeficit > 0 ? `月${monthlyDeficit}万円の不足` : `黒字${-monthlyDeficit}万円/月`}、年間積立${annualSave}万円という構造になっています。預金は生活費の約${livingDefenseMonths}か月分です。\n\n` +
      `【課題分析】\n資金ショートの根本原因は、(1) 老後の年金収入が現役期の生活水準をカバーしきれない、(2) 退職時${lastJobEndAge}歳から年金開始${penStartA}歳までのギャップ期間に取り崩しが集中、(3) インフレ進行で実質的な購買力が低下、の3点です。${koseiYears < 30 ? `特に厚生年金加入年数${koseiYears}年は短く、年金受給額が想定より低い可能性があります。` : ""}\n\n` +
      `【考えられる選択肢（${yearsLeft < 10 ? "即効性重視" : yearsLeft < 25 ? "中期構造改革" : "長期計画"}）】\n` +
      `・固定費の削減: 住居費・通信費・保険料の見直しで、月1〜3万円を捻出できる例が多いとされます。\n` +
      `・積立の増額: NISA成長投資枠（年240万円）・つみたて投資枠（年120万円）・iDeCo（会社員・企業年金なしは2027年から月6.2万円まで）の非課税枠。月+2万円の積立で30年後に1,500〜2,000万円の差。\n` +
      `・退職時期の延長: 65歳→68歳の3年延長で就労収入${plan.jobs.length > 0 ? Math.round(plan.jobs[0].inc * 3 / 10000) : 1500}万円相当の上乗せ＋年金繰下げで月額25.2%増。\n` +
      `・年金繰下げ: 75歳まで繰下げ可。1ヶ月あたり0.7%増額（最大84%増）。\n` +
      `・配偶者就労: 2026年分から所得税がかかり始めるのは年収178万円超。社会保険の扶養（年130万円）を超えて勤務先の厚生年金に入ると、将来の年金も増えます。\n\n` +
      `【次のステップ】\n「比較」タブで各施策の組み合わせ効果を試算できます。一般的に「支出削減 → 積立強化 → 就労延長」の順で論じられることが多いです。個別の判断は登録のあるFP等の専門家にご相談ください。`;

    return { score, level: "bad", headline, body };
  }

  // ─────────────────────────
  // 純資産マイナス（完走するがマイナス）
  // ─────────────────────────
  if (nwJudge < 0) {
    return {
      score: 35,
      level: "bad",
      headline: `${endAge}歳時点で純資産マイナス（${nwLabel(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点で、ローンの残りが預金と投資より${fmtMan(Math.abs(nw))}多い計算です（家・不動産の評価額は入れていません）。\n\n` +
        `【課題分析】\nローン残高が長期化し、低金利で借りた負債を相続・売却で清算する必要が生じる可能性があります。流動性資産（現金・投信）が不足しているため、不動産売却以外の選択肢が狭まります。\n\n` +
        `【考えられる選択肢】\n・繰上返済の優先度評価: 金利の高いローン（住宅ローン1%超、不動産2%超）から優先返済を検討。\n・不動産の見直し: 売却・賃貸転換・住み替え（ダウンサイズ）で含み益の現金化。\n・生活費水準の調整: 月-1万円の継続改善で30年で360万円＋運用益。\n・収入の補完: 副業・配偶者就労・退職金の早期受取りなど、キャッシュインフローの多角化。\n\n` +
        `【次のステップ】\n抜本的な家計再構築が論点となります。具体的なローン整理プランの策定にあたっては、登録のあるFP等の専門家へのご相談をご検討ください。`,
    };
  }

  // ─────────────────────────
  // ${endAge}まで完走するが余裕わずか
  // ─────────────────────────
  if (nwJudge < 10_000_000) {
    return {
      score: 55,
      level: "warn",
      headline: `${endAge}歳まで完走するも余裕わずか（${nwLabel(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点の金融純資産（預金と投資からローンを引いた額）は${fmtMan(nw)}です。預金は生活費の${livingDefenseMonths}か月分です（生活防衛資金の目安は6〜12か月分）。\n\n` +
        `【課題分析】\n医療費（70歳以降の高額療養費は月8〜25万円自己負担）、介護費（在宅で月8〜10万円・施設で月13〜25万円が5〜10年）、物価上昇（年1〜2%継続で30年で35〜80%減価）など、想定外リスクへのバッファが薄い状態です。\n\n` +
        `【考えられる選択肢】\n${livingDefenseMonths < 6 ? `・生活防衛資金: 生活費の6〜12か月分（現在${livingDefenseMonths}か月分）を、運用とは別に預金で持っておく考え方があります。\n` : ""}・NISAの生涯枠（1,800万円）を早めに埋める: 年360万円なら最短5年。埋まった後は特定口座で続けるのが一般的です。\n・iDeCo の節税効果: 月2.3万円の掛金なら年27.6万円が所得控除され、税率30%（所得税20%・住民税10%）の人で年約8.3万円の節税。\n・医療保険の見直し: 高額療養費制度を踏まえ、過剰な保障を整理して可処分所得を確保。\n\n` +
        `【次のステップ】\n月+1〜2万円の積立増による老後余裕度への影響は「比較」タブで試算できます。`,
    };
  }

  // ─────────────────────────
  // 概ね安定（1,000万〜5,000万）
  // ─────────────────────────
  if (nwJudge < 50_000_000) {
    return {
      score: 75,
      level: "good",
      headline: `老後資金は概ね安定（最終純資産 ${nwLabel(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点の金融純資産（預金と投資からローンを引いた額）は${fmtMan(nw)}の計算です。65歳時点では${fmtMan(result.rows.find((r) => r.age === 65)?.nw ?? 0)}です。\n\n` +
        `【課題分析】\n基本設計に大きな問題はありません。今後の主要リスクは、(1) インフレ進行による実質購買力の低下、(2) 90歳超の長寿化による資産寿命、(3) 高齢期の医療・介護費の不確実性、の3点です。\n\n` +
        `【一般に整理される論点】\n・分散運用の継続: 65歳時点でも株式・投信比率30〜40%を維持し、実質購買力を保つ。\n・受取の順番: DC一時金と退職金は受取間隔で税額が変わります（DC一時金→退職金は10年、退職金→DC一時金は20年空けると控除の重複調整なし）。取り崩しは特定口座→NISAの順が基本。\n・医療・介護の補完: 公的制度（高額療養費・介護保険）を踏まえ、不足分のみ民間保険で補完。\n・贈与の検討: 子・孫への暦年贈与（年110万円非課税）。ただし亡くなる前7年以内の贈与は相続財産に加算されるため（2024年以降の贈与から段階的に延長）、早めの開始が前提です。\n\n` +
        `【次のステップ】\n年1回の見直しで十分です。家族構成や税制改正に応じて運用配分・贈与戦略を微調整してください。`,
    };
  }

  // ─────────────────────────
  // 余裕ある（5,000万〜1億）
  // ─────────────────────────
  if (nwJudge < 100_000_000) {
    return {
      score: 85,
      level: "good",
      headline: `余裕ある資産形成（最終純資産 ${nwLabel(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点の金融純資産（預金と投資からローンを引いた額）は${fmtMan(nw)}の計算です。\n\n` +
        `【課題分析】\n相続税の課税ライン（基礎控除3,000万円＋600万円×法定相続人数）に近づきつつあります。例えば配偶者＋子2人なら基礎控除は4,800万円。${nw > 48_000_000 ? "現状ですでに課税対象の可能性があり、" : ""}対策の検討時期に入っています。\n\n` +
        `【一般に整理される論点】\n・暦年贈与の活用: 配偶者・子・孫への年110万円贈与を継続。例えば子2人に20年贈与で4,400万円を移せる（ただし亡くなる前7年以内に相続人へ贈った分は相続財産に足し戻し）。\n・教育資金一括贈与の特例は2026年3月末で終了（それまでに拠出した分は引き続き教育費に使える）。\n・生命保険の非課税枠: 死亡保険金は500万円×法定相続人数まで非課税。配偶者＋子2人なら1,500万円分。\n・iDeCo・NISAは継続: 退職所得控除（勤続年数×40〜70万円）と公的年金等控除をどう使うかで、受け取り方の手取りが変わる。\n\n` +
        `【次のステップ】\n「守りから攻めへ」の移行論点が発生する時期です。FP・税理士等の専門家との連携による相続シミュレーション（特に節税効果の試算）をご検討ください。`,
    };
  }

  // ─────────────────────────
  // 非常に良好（1〜3億）
  // ─────────────────────────
  if (nwJudge < 300_000_000) {
    return {
      score: 92,
      level: "good",
      headline: `資産計画は非常に良好（最終純資産 ${nwLabel(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点の金融純資産（預金と投資からローンを引いた額）は${fmtMan(nw)}の計算です。相続税がかかりうる規模です（目安は「もしも」の「相続の備え」）。\n\n` +
        `【課題分析】\n無対策のままでは相続時に数千万円規模の納税が発生する可能性があります。法定相続人別の基礎控除を超える分が累進課税の対象になります（1億円超50%、2億円超55%）。\n\n` +
        `【一般に整理される論点】\n・暦年贈与: 年110万円×複数人×複数年で大規模な計画移転。例: 子2人＋孫4人に20年で6,600万円の非課税移転。\n・相続時精算課税制度: 60歳以上の親→18歳以上の子・孫に2,500万円まで贈与時非課税（相続時精算）。2024年から年110万の基礎控除追加。\n・教育資金一括贈与は2026年3月末で終了（新しい贈与には使えない）。\n・結婚・子育て資金贈与: 1,000万円非課税枠（2027年3月末まで）。\n・生命保険活用: 死亡保険金500万円×法定相続人数の非課税枠＋納税資金確保。\n・不動産活用: 評価額が時価より低い特性を活かして相続税評価額を圧縮（過度のタワマン節税は規制強化に注意）。\n\n` +
        `【次のステップ】\nFP・税理士・弁護士等による包括的な相続戦略の構築が論点となる規模です。シミュレーションでの効果検証は年1回程度行われるのが一般的です。`,
    };
  }

  // ─────────────────────────
  // 富裕層（3億超）
  // ─────────────────────────
  return {
    score: 98,
    level: "good",
    headline: `相続まで見据えたい資産規模（最終純資産 ${nwLabel(nw)}）`,
    body:
      `【現状診断】\n${endAge}歳時点の金融純資産（預金と投資からローンを引いた額）は${fmtMan(nw)}の計算です。相続税の税率が高くなる規模です（目安は「もしも」の「相続の備え」）。\n\n` +
      `【課題分析】\n単純な暦年贈与・生命保険活用では対応しきれない規模のため、法人活用・信託・国際分散などを組み合わせた高度な相続戦略が必要です。\n\n` +
      `【一般に整理される論点】\n・資産管理会社（同族会社）の設立: 個人資産を法人化し、株式贈与で計画的に世代移転。事業承継税制（特例措置）も検討余地。\n・家族信託: 認知症リスク対応＋柔軟な資産承継設計。受託者を子に設定し、生前から資産管理を委譲。\n・不動産活用: 賃貸用不動産で評価減（路線価ベース＋小規模宅地等の特例で最大80%減）。\n・生命保険の高額活用: 終身保険で死亡保険金非課税枠＋納税資金確保。一時払終身は5,000万円〜数億円規模。\n・国際分散: 海外資産・海外法人による多角化（ただし租税条約・出国税・相続税の国際課税ルールに留意）。\n・社団・財団法人: 公益寄付による資産圧縮＋社会貢献。\n\n` +
      `【次のステップ】\n専門家チーム（プライベートバンカー・税理士法人・弁護士・行政書士等）による包括的な戦略構築が論点となる規模です。年1回以上の戦略レビューが一般的に行われます。`,
  };
}

export default function ResultPage() {
  const plan = usePlanStore((s) => s.plan);
  const result = useSimResult(plan);

  const realValue = useUiStore((s) => s.realValue);
  const mcOn = useUiStore((s) => s.mcOn);
  const v = buildVerdict(plan, result, realValue);

  // プロフィール
  const selfAge = ageOn(plan.selfBirth, undefined) ?? plan.curAge;
  const spouseAge = ageOn(plan.spouseBirth, undefined);
  const kidsInfo = plan.kids
    .map((k) => ({ name: k.name, age: kidAge(k.birth, plan.baseDate) }))
    .filter((k) => k.age !== null);
  const lastJobEndAge =
    plan.jobs.length > 0
      ? Math.max(...plan.jobs.map((j) => j.end))
      : plan.penStartA;

  // 現状サマリー（curAge時点の年次データ）
  const cur = result.rows[0];
  const realEstateLoan = plan.res.reduce((acc, r) => acc + r.bal, 0);
  const realEstateValue = useMemo(() => {
    const yr = new Date().getFullYear();
    return plan.res.reduce((acc, r) => acc + computeRealEstateValue(r, yr), 0);
  }, [plan.res]);

  // 持ち家（自宅）の評価額
  const homeValue = useMemo(() => {
    if (!ownsHomeAt(plan, plan.curAge)) return 0;
    const yr = new Date().getFullYear();
    return computeRealEstateValue(
      {
        name: "自宅",
        rent: 0,
        cost: 0,
        propTax: 0,
        bal: 0,
        rate: 0,
        term: 0,
        start: 0,
        propType: plan.homePropType ?? "house",
        structure: plan.homeStructure ?? "wood",
        builtYear: plan.homeBuiltYear ?? yr,
        purchasePrice: plan.homePurchasePrice ?? 0,
        landRatio: plan.homeLandRatio ?? 50,
        currentValueOverride: plan.homeCurrentValueOverride ?? 0,
      },
      yr,
    );
  }, [plan]);
  const otherLoanBal = plan.otherLoans.reduce(
    (acc, ln) => acc + ln.monthlyPay * ln.remainMonths,
    0,
  );

  // 結果のまとめの数字（金融資産＝預金と投資。家・不動産・ローンは入れない）
  const finOfRow = (r: (typeof result.rows)[number]) => r.ass.c + r.ass.nisa + r.ass.toku + r.ass.k + r.ass.g + r.ass.dc;
  const lowest = result.rows.reduce(
    (m, r) => (finOfRow(r) < m.value ? { age: r.age, value: finOfRow(r) } : m),
    { age: result.rows[0]?.age ?? plan.curAge, value: result.rows[0] ? finOfRow(result.rows[0]) : 0 },
  );
  const finalFin = result.rows.length ? finOfRow(result.rows[result.rows.length - 1]) : 0;
  // 退職後の1年の収支: 働き終えて年金も始まった翌年（退職金・DC一時金を受け取る年を避ける）
  const pensionLifeAge = Math.max(lastJobEndAge, plan.penStartA) + 1;
  const retireCf = result.rows.find((r) => r.age === pensionLifeAge)?.cf ?? null;
  // 所見は「現状」の段落だけ（選択肢の一般論は出さない）
  const summaryText = v.body.split("\n\n").filter((p) => p.startsWith("【現状診断】")).join("\n\n").replace("【現状診断】\n", "");

  // 年金月額の試算
  const selfPenY =
    result.rows.find((r) => r.age === plan.penStartA)?.penNet ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* レポートヘッダー */}
      <div className="mb-6 flex items-end justify-between border-b-2 border-[#0a0a0a] pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">
            レポート
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#0a0a0a]">
            ライフプラン分析レポート
          </h1>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">
          {new Date().toLocaleDateString("ja-JP")}
        </p>
      </div>

      {/* 1. 結果のまとめ（点数はつけず、判断の材料になる数字だけを並べる） */}
      <ReportSection no="01" title="結果のまとめ">
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: `2.5px solid ${result.shortfallAge ? "#c8383a" : "#22863a"}` }}>
          <div className="px-5 py-4" style={{ background: result.shortfallAge ? "#fff0f0" : "#f0fff4" }}>
            <p className="text-xl font-bold leading-snug" style={{ color: result.shortfallAge ? "#c8383a" : "#22863a" }}>
              {result.shortfallAge ? `${result.shortfallAge}歳で、お金が足りなくなる計算です` : `${plan.endAge}歳まで、お金は足りる計算です`}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#0a0a0a]/60">
              入力した条件のまま進んだ場合の試算です。金額は{realValue ? "今の価値" : "名目（その年の金額）"}。金融資産は預金と投資の合計で、家・不動産は入れていません。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            <KpiCard
              label="お金が足りなくなる年齢"
              value={result.shortfallAge ? `${result.shortfallAge}歳` : "なし"}
              alert={!!result.shortfallAge}
              sub={result.shortfallAge ? "預金も投資もなくなる年齢" : `${plan.endAge}歳まで`}
            />
            <KpiCard
              label="金融資産がいちばん少ない年"
              value={fmt(lowest.value)}
              alert={lowest.value <= 0}
              sub={`${lowest.age}歳`}
            />
            <KpiCard
              label="退職後の1年の収支"
              value={retireCf === null ? "-" : `${retireCf >= 0 ? "+" : ""}${fmt(retireCf)}`}
              alert={retireCf !== null && retireCf < 0}
              sub={retireCf === null ? "" : `${pensionLifeAge}歳（年金が始まった後）の収入−支出`}
            />
            <KpiCard
              label="最後の年の金融資産"
              value={fmt(finalFin)}
              alert={finalFin <= 0}
              sub={`${plan.endAge}歳`}
            />
          </div>
          {selfPenY > 0 ? (
            <p className="px-5 pb-3 text-[10px] leading-relaxed text-[#0a0a0a]/55">
              ※年金を受け取り始める年（{plan.penStartA}歳）の年金の手取り: 約 {fmtMan(selfPenY)}／年
            </p>
          ) : null}
          <div className="border-t px-5 py-4" style={{ borderColor: "#0a0a0a15" }}>
            <div className="whitespace-pre-line text-[12px] leading-[1.85] text-[#0a0a0a]/85" style={{ fontFeatureSettings: "'palt'" }}>
              {summaryText}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#0a0a0a]/60">
              条件を変えたときにどう変わるかは「比較」で試せます。どの選び方がよいかは、暮らし方や考え方によって変わります。
            </p>
          </div>
        </div>
      </ReportSection>

      {/* 2. プロフィール */}
      <ReportSection no="02" title="入力したプロフィール">
        <div
          className="rounded-xl p-4"
          style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ProfileItem label="本人 現在年齢" value={`${selfAge}歳`} />
            <ProfileItem
              label="配偶者"
              value={spouseAge !== null ? `${spouseAge}歳` : "なし"}
            />
            <ProfileItem
              label="お子さま"
              value={
                kidsInfo.length > 0
                  ? kidsInfo.map((k) => `${k.age}歳`).join(" / ")
                  : "なし"
              }
            />
            <ProfileItem
              label="退職予定"
              value={`${lastJobEndAge}歳`}
              hint={
                plan.jobs.length > 0 ? plan.jobs[0].name || "メイン勤務先" : "—"
              }
            />
            <ProfileItem
              label="年金受給開始"
              value={`${plan.penStartA}歳`}
              hint="本人"
            />
            <ProfileItem
              label="シミュレーション期間"
              value={`${plan.curAge}〜${plan.endAge}歳`}
            />
            <ProfileItem
              label="想定インフレ率"
              value={`${plan.infl.toFixed(1)}%`}
            />
            <ProfileItem
              label="税計算"
              value={plan.taxMode === "detailed" ? "詳細モード" : "簡易モード"}
            />
          </div>
        </div>
      </ReportSection>

      {/* 3. 現状の収支・資産 */}
      <ReportSection no="03" title="いまの状況">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="現状の年収（手取り）"
            value={fmtMan(cur?.income ?? 0)}
            sub={`内訳: 給与+副業 ${fmtMan(cur?.jobNet ?? 0)} / 不動産 ${fmtMan(cur?.reInc ?? 0)}`}
          />
          <SummaryCard
            label="現状の年支出"
            value={fmtMan(cur?.exp ?? 0)}
            sub={`生活費 ${fmtMan(cur?.basic ?? 0)} / 住居 ${fmtMan(cur?.home ?? 0)} / 教育 ${fmtMan(cur?.edu ?? 0)}`}
          />
          <SummaryCard
            label="年間積立"
            value={fmtMan(cur?.inv ?? 0)}
            sub={`NISA ${fmtMan((plan.nisaTsumitateM + plan.nisaGrowthM) * 12)} / 特定口座 ${fmtMan(plan.saveTokuM * 12)} / iDeCo等(自分) ${fmtMan(plan.saveDcM * 12)}${plan.dcEmployerM > 0 ? ` / DC(会社) ${fmtMan(plan.dcEmployerM * 12)}` : ""}`}
          />
        </div>

        <BalanceSheetTimeline
          plan={plan}
          result={result}
          real={realValue}
          now={{
            assets: [
              { label: "現金・預金", value: plan.cashBal, color: BS_COLORS.cash, category: "current" },
              { label: "NISA口座", value: plan.nisaBal, color: BS_COLORS.nisa, category: "current" },
              { label: "特定口座", value: plan.tokuBal, color: BS_COLORS.toku, category: "current" },
              { label: "暗号資産", value: plan.cryptoBal, color: BS_COLORS.crypto, category: "current" },
              { label: "金・コモディティ", value: plan.goldBal, color: BS_COLORS.gold, category: "current" },
              { label: "iDeCo・DC", value: plan.dcBal, color: BS_COLORS.dc, category: "fixed" },
              { label: "自宅（評価額）", value: homeValue, color: BS_COLORS.home, category: "fixed" },
              { label: "不動産投資（評価額）", value: realEstateValue, color: BS_COLORS.re, category: "fixed" },
            ],
            liabilities: [
              { label: "その他ローン残高", value: otherLoanBal, color: BS_COLORS.otherLoan, category: "current" },
              { label: "住宅ローン残高", value: plan.useHomeLoan && plan.hlStart <= plan.curAge ? plan.hlBal : 0, color: BS_COLORS.homeLoan, category: "fixed" },
              { label: "不動産投資ローン残高", value: realEstateLoan, color: BS_COLORS.reLoan, category: "fixed" },
            ],
          }}
        />
      </ReportSection>

      {/* 5. 資産推移 */}
      <ReportSection no="04" title="資産の推移">
        <div className="flex flex-col gap-3">
          <WarningsPanel warnings={result.warnings} />
          <AssetsChart rows={result.rows} />
        </div>
      </ReportSection>

      {/* 運用の振れ幅（メニューで「振れ幅」を選んだときだけ。以降の章番号を1つずらす） */}
      {mcOn ? (
        <ReportSection no="05" title="運用の振れ幅（1,000通りの試算）">
          <MonteCarloPanel />
        </ReportSection>
      ) : null}

      {/* キャッシュフロー */}
      <ReportSection no={mcOn ? "06" : "05"} title="1年ごとの収支">
        <CashflowChart rows={result.rows} />
      </ReportSection>

      {/* 7. リスク・留意事項 */}
      <ReportSection no={mcOn ? "07" : "06"} title="計算の前提と留意事項">
        <div
          className="rounded-xl p-4"
          style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
        >
          <ul className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-[#0a0a0a]/70">
            <li>
              <span className="font-bold text-[#0a0a0a]">想定インフレ率:</span>{" "}
              年{plan.infl.toFixed(1)}% で支出・住居費・介護費を毎年逓増
            </li>
            <li>
              <span className="font-bold text-[#0a0a0a]">投資リターン:</span>{" "}
              NISA {plan.nisaR.toFixed(1)}% / 特定口座 {plan.tokuR.toFixed(1)}% /
              DC {plan.dcR.toFixed(1)}% / 金 {plan.goldR.toFixed(1)}% を年複利で適用。特定口座・金・暗号資産は売却時に利益部分へ課税
            </li>
            <li>
              <span className="font-bold text-[#0a0a0a]">税・社会保険:</span>{" "}
              {plan.taxMode === "detailed"
                ? "累進課税・各種控除・社会保険料を詳細モードで計算"
                : `給与 ${plan.taxRate}%・年金 ${plan.taxRatePen ?? 10}% で簡易計算（退職金・DC一時金は退職所得として計算）`}
            </li>
            <li>
              <span className="font-bold text-[#0a0a0a]">iDeCo・DC:</span>{" "}
              {plan.dcStartAge}歳で{plan.dcMethod === "lump" ? "一時金（退職所得）" : `年金（${plan.dcYears}年）`}として受取。掛金は所得控除、上限は区分と年で自動チェック
            </li>
            <li>
              <span className="font-bold text-[#0a0a0a]">年金:</span>{" "}
              令和8年度の水準（基礎年金満額 月70,608円）から毎年 {(plan.penIndex ?? 0).toFixed(1)}% で改定
            </li>
            <li>
              <span className="font-bold text-[#0a0a0a]">想定外:</span>{" "}
              重大疾病・株式市場の暴落・年金制度の変更・大規模災害は織り込んでいません
            </li>
          </ul>
        </div>
        <AssumptionTiers />
      </ReportSection>

      {/* Actions */}
      <div className="no-print mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/v5/suggest"
          className="flex-1 py-3 text-center text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
          style={{
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
            color: "#0a0a0a",
          }}
        >
          比較を見る →
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
        ※本レポートは概算シミュレーションです。実際の年金額・税額・運用成果は経済情勢や制度改正により変動します。投資・税務・社会保障に関する判断は必ず専門家（FP・税理士・社労士）にご相談ください。
      </p>
    </main>
  );
}

function ReportSection({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-flex h-5 items-center px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white"
          style={{ background: "#0a0a0a", borderRadius: 4 }}
        >
          {no}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]">
          {title}
        </p>
      </div>
      {children}
    </section>
  );
}

function ProfileItem({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-wide text-[#0a0a0a]/50">
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums text-[#0a0a0a]">
        {value}
      </span>
      {hint && (
        <span className="text-[9px] text-[#0a0a0a]/40">{hint}</span>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-3"
      style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide text-[#0a0a0a]/50">
        {label}
      </span>
      <span className="text-base font-bold tabular-nums text-[#0a0a0a]">
        {value}
      </span>
      <span className="text-[9px] leading-relaxed text-[#0a0a0a]/40">
        {sub}
      </span>
    </div>
  );
}

interface BSItem {
  label: string;
  value: number;
  color: string;
  category: "current" | "fixed"; // 流動 or 固定
}

interface BSSegment extends BSItem {
  heightPx: number;
  striped?: boolean;
}

const BS_BAR_HEIGHT = 280;
const BS_BAR_WIDTH = 112;
const BS_MIN_SEG_HEIGHT = 22; // 凡例側の最小高と揃えるためのバー側最小セグメント高

const BS_COLORS = {
  cash: "#64748b",
  nisa: "#22863a",
  toku: "#94a3b8",
  crypto: "#a78bfa",
  gold: "#c9aa7c",
  dc: "#dde6ef",
  home: "#a05f3a",
  re: "#8b6f4e",
  otherLoan: "#d4a017",
  homeLoan: "#c8383a",
  reLoan: "#e88a8c",
  shortage: "#7f1d1d",
};

// 自宅の評価額（指定した西暦年時点。築年数で減価）
function propertyValues(plan: PlanInput, year: number) {
  const home = ownsHomeAt(plan, plan.curAge + (year - new Date().getFullYear()))
    ? computeRealEstateValue(
        {
          name: "自宅",
          rent: 0,
          cost: 0,
          propTax: 0,
          bal: 0,
          rate: 0,
          term: 0,
          start: 0,
          propType: plan.homePropType ?? "house",
          structure: plan.homeStructure ?? "wood",
          builtYear: plan.homeBuiltYear ?? year,
          purchasePrice: plan.homePurchasePrice ?? 0,
          landRatio: plan.homeLandRatio ?? 50,
          // 手動上書きは「今の評価額」なので、将来は上書き額から築年数分を同じ比率で減価させる
          currentValueOverride: 0,
        },
        year,
      )
    : 0;
  return { home };
}

// 将来の年のバランスシート（年末時点）
function futureBalanceSheet(plan: PlanInput, row: SimulationSummary["rows"][number], real: boolean) {
  const t = row.age - plan.curAge;
  const thisYear = new Date().getFullYear();
  const year = thisYear + t;
  const f = real ? deflator(plan, row.age) : 1;

  // 評価額: 今の値（手動上書きがあればそれ）に、築年数による減価の比率を掛ける
  const nowV = propertyValues(plan, thisYear);
  const futV = propertyValues(plan, year);
  const nowHomeShown = plan.homeOwned && (plan.homeCurrentValueOverride ?? 0) > 0 ? plan.homeCurrentValueOverride : nowV.home;
  const home = nowV.home > 0 ? (nowHomeShown * futV.home) / nowV.home : 0;
  let re = 0;
  for (const r of plan.res) {
    const n = computeRealEstateValue({ ...r, currentValueOverride: 0 }, thisYear);
    const fu = computeRealEstateValue({ ...r, currentValueOverride: 0 }, year);
    const shown = (r.currentValueOverride ?? 0) > 0 ? r.currentValueOverride : n;
    re += n > 0 ? (shown * fu) / n : 0;
  }

  const otherLoan = plan.otherLoans.reduce(
    (acc, ln) => acc + ln.monthlyPay * Math.max(0, ln.remainMonths - (t + 1) * 12),
    0,
  );
  const reLoan = row.reD.reduce((acc, d) => acc + d.bal, 0);
  const a = row.ass;
  const assets: BSItem[] = [
    { label: "現金・預金", value: Math.max(0, a.c), color: BS_COLORS.cash, category: "current" },
    { label: "NISA口座", value: a.nisa, color: BS_COLORS.nisa, category: "current" },
    { label: "特定口座", value: a.toku, color: BS_COLORS.toku, category: "current" },
    { label: "暗号資産", value: a.k, color: BS_COLORS.crypto, category: "current" },
    { label: "金・コモディティ", value: a.g, color: BS_COLORS.gold, category: "current" },
    { label: "iDeCo・DC", value: a.dc, color: BS_COLORS.dc, category: "fixed" },
    { label: "自宅（評価額）", value: home / f, color: BS_COLORS.home, category: "fixed" },
    { label: "不動産投資（評価額）", value: re / f, color: BS_COLORS.re, category: "fixed" },
  ];
  const liabilities: BSItem[] = [
    { label: "資金不足（累計）", value: Math.max(0, -a.c), color: BS_COLORS.shortage, category: "current" },
    { label: "その他ローン残高", value: otherLoan / f, color: BS_COLORS.otherLoan, category: "current" },
    { label: "住宅ローン残高", value: row.hlBal, color: BS_COLORS.homeLoan, category: "fixed" },
    { label: "不動産投資ローン残高", value: reLoan, color: BS_COLORS.reLoan, category: "fixed" },
  ];
  return { assets, liabilities };
}

// 年齢スライダーつきのバランスシート。左端=現在（入力値）、右へ動かすと将来の年末時点
function BalanceSheetTimeline({
  plan,
  result,
  real,
  now,
}: {
  plan: PlanInput;
  result: SimulationSummary;
  real: boolean;
  now: { assets: BSItem[]; liabilities: BSItem[] };
}) {
  const [age, setAge] = useState(plan.curAge);
  const [playing, setPlaying] = useState(false);
  const minAge = plan.curAge;
  const maxAge = plan.endAge;
  const shownAge = Math.min(maxAge, Math.max(minAge, age));

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setAge((a) => {
        if (a >= maxAge) {
          setPlaying(false);
          return a;
        }
        return a + 1;
      });
    }, 180);
    return () => window.clearInterval(id);
  }, [playing, maxAge]);

  const isNow = shownAge === minAge;
  const row = result.rows.find((r) => r.age === shownAge);
  const sheet = isNow || !row ? now : futureBalanceSheet(plan, row, real);
  const assets = sheet.assets.filter((x) => x.value > 0);
  const liabilities = sheet.liabilities.filter((x) => x.value > 0);
  const netWorth =
    assets.reduce((a, x) => a + x.value, 0) - liabilities.reduce((a, x) => a + x.value, 0);

  const retireAge = plan.jobs.length ? Math.max(...plan.jobs.map((j) => j.end)) : null;
  const marks = [
    { label: "今", age: minAge },
    retireAge !== null && retireAge > minAge && retireAge < maxAge ? { label: `退職 ${retireAge}歳`, age: retireAge } : null,
    plan.penStartA > minAge && plan.penStartA < maxAge && plan.penStartA !== retireAge
      ? { label: `年金 ${plan.penStartA}歳`, age: plan.penStartA }
      : null,
    { label: `${maxAge}歳`, age: maxAge },
  ].filter(Boolean) as { label: string; age: number }[];
  const year = new Date().getFullYear() + (shownAge - minAge);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-white px-4 py-3" style={{ border: "2px solid #0a0a0a18" }}>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-[#0a0a0a]">
            {isNow ? "現在（入力した残高）" : `${shownAge}歳の年末時点`}
            <span className="ml-2 text-[11px] font-normal text-[#0a0a0a]/55">
              {year}年{real && !isNow ? "・今の価値" : ""}
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (shownAge >= maxAge) setAge(minAge);
                setPlaying((p) => !p);
              }}
              className="rounded-md px-2.5 py-1 text-[11px] font-bold text-white"
              style={{ background: "#0a0a0a" }}
              aria-label={playing ? "一時停止" : "再生"}
            >
              {playing ? "❚❚ 停止" : "▶ 再生"}
            </button>
          </div>
        </div>
        <input
          type="range"
          min={minAge}
          max={maxAge}
          step={1}
          value={shownAge}
          onChange={(e) => {
            setPlaying(false);
            setAge(Number(e.target.value));
          }}
          className="w-full accent-[#c8383a]"
          aria-label="バランスシートの年齢"
        />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {marks.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => {
                setPlaying(false);
                setAge(m.age);
              }}
              className="rounded-md px-2 py-0.5 text-[10px] font-bold"
              style={{
                background: shownAge === m.age ? "#0a0a0a" : "#f0f0ee",
                color: shownAge === m.age ? "#fff" : "#0a0a0a",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {!isNow ? (
          <p className="mt-2 text-[10px] leading-relaxed text-[#0a0a0a]/55">
            金融資産・ローン残高はシミュレーションの年末値。自宅・不動産は築年数による減価で評価（地価の変動は見込まない）。
            {liabilities.some((l) => l.label === "資金不足（累計）") ? "「資金不足」は現金がマイナスになった累計額です。" : ""}
          </p>
        ) : null}
      </div>
      <BalanceSheetVis assets={assets} liabilities={liabilities} netWorth={netWorth} />
    </div>
  );
}

function BalanceSheetVis({
  assets,
  liabilities,
  netWorth,
}: {
  assets: BSItem[];
  liabilities: BSItem[];
  netWorth: number;
}) {
  const totalAssets = assets.reduce((a, b) => a + b.value, 0);
  const totalLiabilities = liabilities.reduce((a, b) => a + b.value, 0);
  const isAlert = netWorth < 0;

  const [hovered, setHovered] = useState<string | null>(null);
  const compact = useIsNarrow();

  // 各側のextra（純資産マイナス or 純資産NET）
  const assetsExtraDef: BSItem | null = isAlert
    ? { label: "債務超過（純資産マイナス）", value: Math.abs(netWorth), color: "#c8383a", category: "current" }
    : null;
  const liabilitiesExtraDef: BSItem | null = !isAlert && netWorth > 0
    ? { label: "純資産（家・不動産を含む）", value: netWorth, color: "#22863a", category: "current" }
    : null;

  // 1側全体（通常項目+extra）を一括レイアウト：
  //  (1) 比例配分で各セグメント高さを初期化
  //  (2) 最小高さ(22px)未満の項目を底上げし、不足分を大きい項目から比例で減算
  //  (3) 合計を BS_BAR_HEIGHT に厳密に固定 → 資産側と負債側の天地が一致する
  // 会計恒等式 (資産 = 負債 + 純資産) により、両側の合計値は等しい。
  // よって各側を独立に target=BS_BAR_HEIGHT で正規化すれば天地が必ず揃う。
  type LaidSeg = BSSegment & { _isExtra: boolean };
  const layoutSide = (
    items: BSItem[],
    extra: BSItem | null,
    extraStriped: boolean,
  ): LaidSeg[] => {
    const filtered = items.filter((it) => it.value > 0);
    const all: { item: BSItem; isExtra: boolean; striped: boolean }[] = filtered.map(
      (it) => ({ item: it, isExtra: false, striped: false }),
    );
    if (extra) all.push({ item: extra, isExtra: true, striped: extraStriped });

    const totalVal = all.reduce((a, x) => a + x.item.value, 0);
    if (totalVal === 0) return [];

    // 初期：比例配分
    const segs: LaidSeg[] = all.map(({ item, isExtra, striped }) => ({
      ...item,
      heightPx: (item.value / totalVal) * BS_BAR_HEIGHT,
      striped,
      _isExtra: isExtra,
    }));

    // 再分配：小さい項目を最小値に底上げし、余りを大きい項目から減算
    const small = segs.filter((s) => s.heightPx < BS_MIN_SEG_HEIGHT);
    if (small.length === 0) return segs;

    const large = segs.filter((s) => s.heightPx >= BS_MIN_SEG_HEIGHT);
    const minBudget = small.length * BS_MIN_SEG_HEIGHT;
    const remaining = BS_BAR_HEIGHT - minBudget;

    if (remaining <= 0 || large.length === 0) {
      // フォールバック：項目が多すぎて再分配不可 → 均等配分
      const eq = BS_BAR_HEIGHT / segs.length;
      return segs.map((s) => ({ ...s, heightPx: eq }));
    }

    const largeSum = large.reduce((a, s) => a + s.heightPx, 0);
    const scale = remaining / largeSum;

    return segs.map((s) =>
      s.heightPx < BS_MIN_SEG_HEIGHT
        ? { ...s, heightPx: BS_MIN_SEG_HEIGHT }
        : { ...s, heightPx: s.heightPx * scale },
    );
  };

  const assetSegs = layoutSide(assets, assetsExtraDef, true);
  const liabilitySegs = layoutSide(liabilities, liabilitiesExtraDef, false);

  const currentA = assetSegs.filter((s) => !s._isExtra && s.category === "current");
  const fixedA = assetSegs.filter((s) => !s._isExtra && s.category === "fixed");
  const aExtraSeg = assetSegs.find((s) => s._isExtra) ?? null;

  const currentL = liabilitySegs.filter((s) => !s._isExtra && s.category === "current");
  const fixedL = liabilitySegs.filter((s) => !s._isExtra && s.category === "fixed");
  const lExtraSeg = liabilitySegs.find((s) => s._isExtra) ?? null;

  return (
    <div
      className="mt-3 rounded-xl p-4"
      style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/60">
        資産と負債のバランス
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* 左: 資産（凡例 → バー） */}
        <div>
          <div
            className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 border-b-2 px-1 pb-1"
            style={{ borderColor: "#22863a" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#22863a]">
              {isAlert ? "資産 ＋ 債務超過" : "資産"}
            </span>
            <span className="whitespace-nowrap text-sm font-bold tabular-nums text-[#22863a]">
              {fmtMan(isAlert ? totalAssets + Math.abs(netWorth) : totalAssets)}
            </span>
          </div>
          <BSColumnGrouped
            barSide="right"
            groups={[
              { label: "流動資産", segments: currentA },
              { label: "固定資産", segments: fixedA },
            ]}
            extraSegment={aExtraSeg}
            hovered={hovered}
            setHovered={setHovered}
            compact={compact}
          />
        </div>

        {/* 右: 負債+純資産（バー → 凡例） */}
        <div>
          <div
            className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 border-b-2 px-1 pb-1"
            style={{ borderColor: "#c8383a" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8383a]">
              {isAlert ? "負債" : "負債 + 純資産"}
            </span>
            <span className="whitespace-nowrap text-sm font-bold tabular-nums text-[#c8383a]">
              {fmtMan(isAlert ? totalLiabilities : totalLiabilities + Math.max(0, netWorth))}
            </span>
          </div>
          <BSColumnGrouped
            barSide="left"
            groups={[
              { label: "流動負債", segments: currentL },
              { label: "固定負債", segments: fixedL },
            ]}
            extraSegment={lExtraSeg}
            hovered={hovered}
            setHovered={setHovered}
            compact={compact}
          />
        </div>
      </div>

      {/* 純資産サマリー */}
      <div
        className="mt-4 flex flex-col gap-1 rounded-lg px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        style={{
          background: isAlert ? "#fff0f0" : "#f0fff4",
          border: `2px solid ${isAlert ? "#c8383a" : "#22863a"}`,
        }}
      >
        <div>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: isAlert ? "#c8383a" : "#22863a" }}
          >
            純資産（家・不動産の評価額を含む）
          </span>
          <span className="ml-2 text-[10px] text-[#0a0a0a]/60">
            資産 {fmtMan(totalAssets)} − 負債 {fmtMan(totalLiabilities)}
          </span>
        </div>
        <span
          className="text-xl font-bold tabular-nums"
          style={{ color: isAlert ? "#c8383a" : "#22863a" }}
        >
          {fmtMan(netWorth)}
        </span>
      </div>
      <p className="mt-2 px-1 text-[10px] leading-relaxed text-[#0a0a0a]/55">
        {isAlert
          ? `左＝資産、右＝負債。負債が資産を上回る「債務超過」のため、足りない ${fmtMan(Math.abs(netWorth))} を左の斜線部分で示しています（資産＋債務超過＝負債で、左右の高さは常に一致）。`
          : "左＝資産、右＝負債＋純資産。資産から負債を引いた残りが純資産で、左右の合計は常に一致します。"}
      </p>
    </div>
  );
}

// ハイブリッド型カラム: 流動/固定の区切り + ホバーインタラクション
function BSColumnGrouped({
  barSide,
  groups,
  extraSegment,
  hovered,
  setHovered,
  compact = false,
}: {
  compact?: boolean; // スマホ: バーを上に全幅、凡例はその下に1行ずつ
  barSide: "left" | "right";
  groups: { label: string; segments: BSSegment[] }[];
  extraSegment: BSSegment | null;
  hovered: string | null;
  setHovered: (s: string | null) => void;
}) {
  // バーと凡例で同じ視覚順序になるように、上→下のソース配列を構築
  // 視覚順序（上→下）:
  //   1. extraSegment (純資産マイナス・純資産NET など)
  //   2. グループを逆順に展開（固定資産が上、流動資産が下）
  //   3. 各グループ内も逆順（流動性が高いものをより下に）
  type Item = {
    segment: BSSegment;
    groupLabel: string | null;
    isGroupHead: boolean; // グループ境界（このアイテムの直前に区切り線を入れる）
  };
  const ordered: Item[] = [];
  if (extraSegment) {
    ordered.push({ segment: extraSegment, groupLabel: null, isGroupHead: false });
  }
  [...groups].reverse().forEach((g) => {
    const reversed = [...g.segments].reverse();
    reversed.forEach((s, i) => {
      ordered.push({
        segment: s,
        groupLabel: g.label,
        isGroupHead: i === 0,
      });
    });
  });

  // バー（上→下 順に縦積み）。高さは固定せず、各セグメントの実高さの合計で自動的に伸びる。
  // これにより凡例（同じ高さ規則）との行頭・行末がピクセル単位で揃う。
  const Bar = (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        width: compact ? "100%" : BS_BAR_WIDTH,
        border: "1.5px solid #0a0a0a30",
        borderRadius: 4,
        flexShrink: 0,
      }}
    >
      {ordered.map((item, idx) => {
        const isExtra = item.groupLabel === null;
        // セグメント間は薄い白線で区切るのみ。流動/固定の境界は凡例の[群ラベル]で示す。
        const borderTop =
          idx === 0
            ? "none"
            : isExtra
              ? "2px dashed #ffffff80"
              : "1px solid #ffffff60";
        return (
          <div
            key={item.segment.label}
            onMouseEnter={() => setHovered(item.segment.label)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer transition-all"
            style={{
              height: item.segment.heightPx,
              background: item.segment.color,
              borderTop,
              backgroundImage: item.segment.striped
                ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)"
                : "none",
              filter: hovered === item.segment.label ? "brightness(1.15)" : "none",
            }}
            title={
              isExtra
                ? `${item.segment.label}: ${fmtMan(item.segment.value)}`
                : `[${item.groupLabel}] ${item.segment.label}: ${fmtMan(item.segment.value)}`
            }
          />
        );
      })}
    </div>
  );

  // 凡例（バーと同じ上→下 順）
  const Legend = (
    <ul
      className={`flex flex-1 flex-col text-[10px] ${
        compact ? "gap-1" : barSide === "right" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      {ordered.map((item, idx) => {
        const needsDivider =
          idx > 0 &&
          ordered[idx - 1].groupLabel === null &&
          item.groupLabel !== null;
        return (
          <Fragment key={item.segment.label}>
            {needsDivider && (
              <li
                aria-hidden
                style={{
                  height: 1,
                  background: "#0a0a0a",
                  flexShrink: 0,
                  margin: "4px 0",
                }}
              />
            )}
            <BSLegendItem
              segment={item.segment}
              barSide={barSide}
              compact={compact}
              hovered={hovered}
              setHovered={setHovered}
            />
          </Fragment>
        );
      })}
    </ul>
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        {Bar}
        {Legend}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {barSide === "right" ? (
        <>
          {Legend}
          {Bar}
        </>
      ) : (
        <>
          {Bar}
          {Legend}
        </>
      )}
    </div>
  );
}

function BSLegendItem({
  segment,
  barSide,
  hovered,
  setHovered,
  compact = false,
}: {
  compact?: boolean;
  segment: BSSegment;
  barSide: "left" | "right";
  hovered: string | null;
  setHovered: (s: string | null) => void;
}) {
  const isHovered = hovered === segment.label;
  const swatch = (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0"
      style={{
        background: segment.color,
        border: "1px solid #0a0a0a30",
        backgroundImage: segment.striped
          ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)"
          : "none",
      }}
    />
  );

  if (compact) {
    return (
      <li
        onClick={() => setHovered(isHovered ? null : segment.label)}
        className="flex items-start gap-1.5"
      >
        <span className="mt-0.5">{swatch}</span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[10px] text-[#0a0a0a]/70">{segment.label}</span>
          <span className="text-[11px] font-bold tabular-nums text-[#0a0a0a]">{fmtMan(segment.value)}</span>
        </span>
      </li>
    );
  }

  return (
    <li
      onMouseEnter={() => setHovered(segment.label)}
      onMouseLeave={() => setHovered(null)}
      className={`flex items-center gap-1.5 cursor-pointer transition-all ${
        barSide === "right" ? "flex-row-reverse" : ""
      }`}
      style={{ height: segment.heightPx, overflow: "visible" }}
    >
      {swatch}
      {/* 1行表示: ラベル → 金額（順序は常に固定・反転なし） */}
      <div
        className="flex min-w-0 items-baseline gap-1 transition-all"
        style={{
          transform: isHovered ? "scale(1.08)" : "scale(1)",
          transformOrigin: barSide === "right" ? "right center" : "left center",
        }}
      >
        <span className="truncate text-[9px] leading-none text-[#0a0a0a]/70">
          {segment.label}
        </span>
        <span
          className="shrink-0 font-bold tabular-nums leading-none"
          style={{
            color: isHovered ? segment.color : "#0a0a0a",
            fontSize: isHovered ? "12px" : "10px",
            transition: "all 0.15s",
            filter: isHovered ? "brightness(0.7)" : "none",
          }}
        >
          {fmtMan(segment.value)}
        </span>
      </div>
    </li>
  );
}

function KpiCard({
  label,
  value,
  alert = false,
  sub,
}: {
  label: string;
  value: string;
  alert?: boolean;
  sub?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-3"
      style={{ border: "2px solid #0a0a0a22", background: "#fff" }}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide text-[#0a0a0a]/50">
        {label}
      </span>
      <span
        className="text-base font-bold tabular-nums"
        style={{ color: alert ? "#c8383a" : "#0a0a0a" }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[9px] text-[#0a0a0a]/40">{sub}</span>
      )}
    </div>
  );
}
