"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AssetsChart } from "@/components/charts/AssetsChart";
import { CashflowChart } from "@/components/charts/CashflowChart";
import { ageOn, kidAge } from "@/lib/calc/age";
import { computeRealEstateValue } from "@/lib/calc/finance";
import { simulate } from "@/lib/calc/simulate";
import type { PlanInput, SimulationSummary } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

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
): Verdict {
  const nw = result.finalNetWorth;
  const sa = result.shortfallAge;
  const endAge = plan.endAge;
  const curAge = plan.curAge;

  // 各種指標を取得（コメントで参照）
  const cur = result.rows[0];
  const curIncome = Math.round((cur?.income ?? 0) / 10000);
  const curExp = Math.round((cur?.exp ?? 0) / 10000);
  const monthlyDeficit = Math.round((curExp - curIncome) / 12);
  const totalCashAssets = Math.round(
    (plan.cashBal + plan.fundBal + plan.stockBal) / 10000,
  );
  const monthlyExp = Math.round(curExp / 12);
  const livingDefenseMonths =
    monthlyExp > 0 ? Math.round((totalCashAssets / monthlyExp) * 10) / 10 : 0;
  const totalSaveM =
    plan.saveFundM + plan.saveStockM + plan.saveDcM + plan.saveCryptoM + plan.saveGoldM;
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
      `【現状診断】\n現役期の収支・積立水準では、${sa}歳時点（残り${yearsLeft}年）で運用資産・現金がともに枯渇する見込みです。現状の年間収支は手取り${curIncome}万円・支出${curExp}万円で${monthlyDeficit > 0 ? `月${monthlyDeficit}万円の不足` : `黒字${-monthlyDeficit}万円/月`}、年間積立${annualSave}万円という構造になっています。生活防衛資金は約${livingDefenseMonths}ヶ月分です。\n\n` +
      `【課題分析】\n資金ショートの根本原因は、(1) 老後の年金収入が現役期の生活水準をカバーしきれない、(2) 退職時${lastJobEndAge}歳から年金開始${penStartA}歳までのギャップ期間に取り崩しが集中、(3) インフレ進行で実質的な購買力が低下、の3点です。${koseiYears < 30 ? `特に厚生年金加入年数${koseiYears}年は短く、年金受給額が想定より低い可能性があります。` : ""}\n\n` +
      `【考えられる選択肢（${yearsLeft < 10 ? "即効性重視" : yearsLeft < 25 ? "中期構造改革" : "長期計画"}）】\n` +
      `・固定費の削減: 住居費・通信費・保険料の見直しで月1〜3万円の捻出を目指しましょう。\n` +
      `・積立の増額: NISA成長投資枠（年240万円）・つみたて投資枠（年120万円）・iDeCo（月2.3万円〜）の非課税枠を最大活用。月+2万円の積立で30年後に1,500〜2,000万円の差。\n` +
      `・退職時期の延長: 65歳→68歳の3年延長で就労収入${plan.jobs.length > 0 ? Math.round(plan.jobs[0].inc * 3 / 10000) : 1500}万円相当の上乗せ＋年金繰下げで月額25.2%増。\n` +
      `・年金繰下げ: 75歳まで繰下げ可。1ヶ月あたり0.7%増額（最大84%増）。\n` +
      `・配偶者就労: 年103万円超のパート収入で世帯収入＋税優遇のバランス点。\n\n` +
      `【次のステップ】\n「シナリオ比較」タブで各施策の組み合わせ効果を試算できます。一般的に「支出削減 → 積立強化 → 就労延長」の順で論じられることが多いです。個別の判断は登録のあるFP等の専門家にご相談ください。`;

    return { score, level: "bad", headline, body };
  }

  // ─────────────────────────
  // 純資産マイナス（完走するがマイナス）
  // ─────────────────────────
  if (nw < 0) {
    return {
      score: 35,
      level: "bad",
      headline: `${endAge}歳時点で純資産マイナス（${fmtMan(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点で資産より負債が${fmtMan(Math.abs(nw))}多い状態となる見込みです。住宅ローンや不動産ローンの残債が老後の資産を圧迫しています。\n\n` +
        `【課題分析】\nローン残高が長期化し、低金利で借りた負債を相続・売却で清算する必要が生じる可能性があります。流動性資産（現金・投信）が不足しているため、不動産売却以外の選択肢が狭まります。\n\n` +
        `【考えられる選択肢】\n・繰上返済の優先度評価: 金利の高いローン（住宅ローン1%超、不動産2%超）から優先返済を検討。\n・不動産の見直し: 売却・賃貸転換・住み替え（ダウンサイズ）で含み益の現金化。\n・生活費水準の調整: 月-1万円の継続改善で30年で360万円＋運用益。\n・収入の補完: 副業・配偶者就労・退職金の早期受取りなど、キャッシュインフローの多角化。\n\n` +
        `【次のステップ】\n抜本的な家計再構築が論点となります。具体的なローン整理プランの策定にあたっては、登録のあるFP等の専門家へのご相談をご検討ください。`,
    };
  }

  // ─────────────────────────
  // ${endAge}まで完走するが余裕わずか
  // ─────────────────────────
  if (nw < 10_000_000) {
    return {
      score: 55,
      level: "warn",
      headline: `${endAge}歳まで完走するも余裕わずか（${fmtMan(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点での純資産は${fmtMan(nw)}と、想定外の支出への耐性が限定的です。生活防衛資金は現在${livingDefenseMonths}ヶ月分（推奨は12〜24ヶ月）です。\n\n` +
        `【課題分析】\n医療費（70歳以降の高額療養費は月8〜25万円自己負担）、介護費（在宅で月8〜10万円・施設で月13〜25万円が5〜10年）、物価上昇（年1〜2%継続で30年で35〜80%減価）など、想定外リスクへのバッファが薄い状態です。\n\n` +
        `【考えられる選択肢】\n・生活防衛資金の確保: 手取り年収の1〜2年分（${Math.round(curIncome)}〜${Math.round(curIncome * 2)}万円目安）を流動性高い形で確保。\n・NISA成長投資枠（年240万）の継続活用: 30年で元本7,200万円＋運用益で1億円超の積立も可能。\n・iDeCo の節税効果: 月2.3万円拠出で年間6.9万円の節税（所得税20%・住民税10%想定）。\n・医療保険の見直し: 高額療養費制度を踏まえ、過剰な保障を整理して可処分所得を確保。\n\n` +
        `【次のステップ】\n月+1〜2万円の積立増による老後余裕度への影響は「シナリオ比較」タブで試算できます。`,
    };
  }

  // ─────────────────────────
  // 概ね安定（1,000万〜5,000万）
  // ─────────────────────────
  if (nw < 50_000_000) {
    return {
      score: 75,
      level: "good",
      headline: `老後資金は概ね安定（最終純資産 ${fmtMan(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点で${fmtMan(nw)}の純資産が見込まれ、想定通りに推移すれば安心して老後を過ごせる水準です。65歳時点の純資産は${fmtMan(result.rows.find((r) => r.age === 65)?.nw ?? 0)}で、年金開始時のスタート資金として十分です。\n\n` +
        `【課題分析】\n基本設計に大きな問題はありません。今後の主要リスクは、(1) インフレ進行による実質購買力の低下、(2) 90歳超の長寿化による資産寿命、(3) 高齢期の医療・介護費の不確実性、の3点です。\n\n` +
        `【一般に整理される論点】\n・分散運用の継続: 65歳時点でも株式・投信比率30〜40%を維持し、実質購買力を保つ。\n・取り崩し戦略: 60〜64歳はDC優先、65歳以降は公的年金＋他資産の組み合わせ（4%ルール参考）。\n・医療・介護の補完: 公的制度（高額療養費・介護保険）を踏まえ、不足分のみ民間保険で補完。\n・贈与の検討: 子・孫への暦年贈与（年110万円非課税）を早期から開始すれば、相続税課税対象を計画的に圧縮可能。\n\n` +
        `【次のステップ】\n年1回の見直しで十分です。家族構成や税制改正に応じて運用配分・贈与戦略を微調整してください。`,
    };
  }

  // ─────────────────────────
  // 余裕ある（5,000万〜1億）
  // ─────────────────────────
  if (nw < 100_000_000) {
    return {
      score: 85,
      level: "good",
      headline: `余裕ある資産形成（最終純資産 ${fmtMan(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点で${fmtMan(nw)}の純資産形成が見込まれ、現役期の収支構造は健全です。想定外支出にも十分対応可能なバッファがあります。\n\n` +
        `【課題分析】\n相続税の課税ライン（基礎控除3,000万円＋600万円×法定相続人数）に近づきつつあります。例えば配偶者＋子2人なら基礎控除は4,800万円。${nw > 48_000_000 ? "現状ですでに課税対象の可能性があり、" : ""}対策の検討時期に入っています。\n\n` +
        `【一般に整理される論点】\n・暦年贈与の活用: 配偶者・子・孫への年110万円贈与を継続。例えば子2人に20年贈与で4,400万円の非課税移転。\n・教育資金一括贈与の特例: 子・孫への教育資金1,500万円が非課税（2026年3月末まで）。\n・生命保険の非課税枠: 死亡保険金は500万円×法定相続人数まで非課税。配偶者＋子2人なら1,500万円分。\n・iDeCo・NISAは継続: 退職所得控除（勤続年数×40〜70万円）と公的年金等控除を最大活用した受取設計を。\n\n` +
        `【次のステップ】\n「守りから攻めへ」の移行論点が発生する時期です。FP・税理士等の専門家との連携による相続シミュレーション（特に節税効果の試算）をご検討ください。`,
    };
  }

  // ─────────────────────────
  // 非常に良好（1〜3億）
  // ─────────────────────────
  if (nw < 300_000_000) {
    return {
      score: 92,
      level: "good",
      headline: `資産計画は非常に良好（最終純資産 ${fmtMan(nw)}）`,
      body:
        `【現状診断】\n${endAge}歳時点で${fmtMan(nw)}の純資産形成が見込まれます。一般家庭の上位5%以内に入る水準で、相続税の課税対象（10〜30%税率帯）となる規模です。\n\n` +
        `【課題分析】\n無対策のままでは相続時に数千万円規模の納税が発生する可能性があります。法定相続人別の基礎控除を超える分が累進課税の対象になります（1億円超50%、2億円超55%）。\n\n` +
        `【一般に整理される論点】\n・暦年贈与の最大活用: 年110万円×複数人×複数年で大規模な計画移転。例: 子2人＋孫4人に20年で6,600万円の非課税移転。\n・相続時精算課税制度: 60歳以上の親→18歳以上の子・孫に2,500万円まで贈与時非課税（相続時精算）。2024年から年110万の基礎控除追加。\n・教育資金一括贈与: 1,500万円非課税枠×子・孫の人数。\n・結婚・子育て資金贈与: 1,000万円非課税枠（2027年3月末まで）。\n・生命保険活用: 死亡保険金500万円×法定相続人数の非課税枠＋納税資金確保。\n・不動産活用: 評価額が時価より低い特性を活かして相続税評価額を圧縮（過度のタワマン節税は規制強化に注意）。\n\n` +
        `【次のステップ】\nFP・税理士・弁護士等による包括的な相続戦略の構築が論点となる規模です。シミュレーションでの効果検証は年1回程度行われるのが一般的です。`,
    };
  }

  // ─────────────────────────
  // 富裕層（3億超）
  // ─────────────────────────
  return {
    score: 98,
    level: "good",
    headline: `富裕層レベルの資産計画（最終純資産 ${fmtMan(nw)}）`,
    body:
      `【現状診断】\n${endAge}歳時点で${fmtMan(nw)}の純資産形成が見込まれ、富裕層の上位1%水準です。相続税の最高税率55%（6億円超部分）の対象となり、無対策では資産の半分以上が納税により失われる可能性があります。\n\n` +
      `【課題分析】\n単純な暦年贈与・生命保険活用では対応しきれない規模のため、法人活用・信託・国際分散などを組み合わせた高度な相続戦略が必要です。\n\n` +
      `【一般に整理される論点】\n・資産管理会社（同族会社）の設立: 個人資産を法人化し、株式贈与で計画的に世代移転。事業承継税制（特例措置）も検討余地。\n・家族信託: 認知症リスク対応＋柔軟な資産承継設計。受託者を子に設定し、生前から資産管理を委譲。\n・不動産活用: 賃貸用不動産で評価減（路線価ベース＋小規模宅地等の特例で最大80%減）。\n・生命保険の高額活用: 終身保険で死亡保険金非課税枠＋納税資金確保。一時払終身は5,000万円〜数億円規模。\n・国際分散: 海外資産・海外法人による多角化（ただし租税条約・出国税・相続税の国際課税ルールに留意）。\n・社団・財団法人: 公益寄付による資産圧縮＋社会貢献。\n\n` +
      `【次のステップ】\n専門家チーム（プライベートバンカー・税理士法人・弁護士・行政書士等）による包括的な戦略構築が論点となる規模です。年1回以上の戦略レビューが一般的に行われます。`,
  };
}

export default function ResultPage() {
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);

  const v = buildVerdict(plan, result);

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
  const retireRow = result.rows.find((r) => r.age === lastJobEndAge);
  const nwAt65 = result.rows.find((r) => r.age === 65)?.nw ?? 0;

  // 現状サマリー（curAge時点の年次データ）
  const cur = result.rows[0];
  const financialAssets =
    plan.cashBal +
    plan.fundBal +
    plan.stockBal +
    plan.cryptoBal +
    plan.goldBal +
    plan.dcBal;
  const realEstateLoan = plan.res.reduce((acc, r) => acc + r.bal, 0);
  const realEstateValue = useMemo(() => {
    const yr = new Date().getFullYear();
    return plan.res.reduce((acc, r) => acc + computeRealEstateValue(r, yr), 0);
  }, [plan.res]);

  // 持ち家（自宅）の評価額
  const homeValue = useMemo(() => {
    if (!plan.homeOwned) return 0;
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
  // 不動産（簿価）= 物件種別と築年数から推定した現在評価額（手動上書き優先）
  const totalAssetsNow = financialAssets + realEstateValue + homeValue;
  const totalLiabilitiesNow =
    (plan.useHomeLoan ? plan.hlBal : 0) + realEstateLoan + otherLoanBal;
  const netWorthNow = totalAssetsNow - totalLiabilitiesNow;

  // 年金月額の試算
  const selfPenY =
    result.rows.find((r) => r.age === plan.penStartA)?.penNet ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* レポートヘッダー */}
      <div className="mb-6 flex items-end justify-between border-b-2 border-[#0a0a0a] pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">
            FINANCIAL PLANNING REPORT
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#0a0a0a]">
            ライフプラン分析レポート
          </h1>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/50">
          {new Date().toLocaleDateString("ja-JP")}
        </p>
      </div>

      {/* 1. 診断結果 */}
      <ReportSection no="01" title="診断結果 ／ EXECUTIVE SUMMARY">
        {(() => {
          const colors =
            v.level === "good"
              ? { main: "#22863a", light: "#f0fff4", text: "#22863a" }
              : v.level === "warn"
                ? { main: "#d4a017", light: "#fff8e7", text: "#a07900" }
                : { main: "#c8383a", light: "#fff0f0", text: "#c8383a" };
          return (
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                background: "#ffffff",
                border: `2.5px solid ${colors.main}`,
              }}
            >
              {/* スコア + 見出し */}
              <div
                className="flex items-center gap-4 px-5 py-4"
                style={{ background: colors.light, borderBottom: `2px solid ${colors.main}` }}
              >
                <div className="flex shrink-0 flex-col items-center">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      background: colors.main,
                      borderRadius: "50%",
                      width: 72,
                      height: 72,
                    }}
                  >
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {v.score}
                    </span>
                  </div>
                  <span
                    className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: colors.text }}
                  >
                    /100点
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: colors.text }}
                  >
                    診断スコア
                  </p>
                  <p className="mt-1 text-xl font-bold leading-tight text-[#0a0a0a]">
                    {v.headline}
                  </p>
                  <p
                    className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: colors.text }}
                  >
                    {v.level === "good"
                      ? "GOOD ／ 良好"
                      : v.level === "warn"
                        ? "WARN ／ 要注意"
                        : "ALERT ／ 要改善"}
                  </p>
                </div>
              </div>

              {/* FPコメント（4段構成） */}
              <div className="px-5 py-4">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a]/60">
                  FP COMMENT ／ 一般に整理される論点
                </p>
                <div className="whitespace-pre-line text-[12px] leading-[1.85] text-[#0a0a0a]/85" style={{ fontFeatureSettings: "'palt'" }}>
                  {v.body}
                </div>
              </div>
            </div>
          );
        })()}
      </ReportSection>

      {/* 2. ご相談者プロフィール */}
      <ReportSection no="02" title="ご相談者プロフィール ／ PROFILE">
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
              value={plan.taxMode === "detailed" ? "詳細(FP級)" : "簡易"}
            />
          </div>
        </div>
      </ReportSection>

      {/* 3. 現状の収支・資産 */}
      <ReportSection no="03" title="現状サマリー ／ CURRENT STATUS">
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
            sub={`投信 ${fmtMan(plan.saveFundM * 12)} / 株 ${fmtMan(plan.saveStockM * 12)} / DC ${fmtMan(plan.saveDcM * 12)}`}
          />
        </div>

        <BalanceSheetVis
          assets={(
            [
              { label: "現金・預金", value: plan.cashBal, color: "#64748b", category: "current" },
              { label: "投信", value: plan.fundBal, color: "#94a3b8", category: "current" },
              { label: "株", value: plan.stockBal, color: "#b8c6d4", category: "current" },
              { label: "仮想通貨", value: plan.cryptoBal, color: "#a78bfa", category: "current" },
              { label: "金・コモディティ", value: plan.goldBal, color: "#c9aa7c", category: "current" },
              { label: "DC", value: plan.dcBal, color: "#dde6ef", category: "fixed" },
              { label: "自宅（評価額）", value: homeValue, color: "#a05f3a", category: "fixed" },
              { label: "不動産投資（評価額）", value: realEstateValue, color: "#8b6f4e", category: "fixed" },
            ] as const
          ).filter((a) => a.value > 0)}
          liabilities={(
            [
              { label: "その他ローン残高", value: otherLoanBal, color: "#d4a017", category: "current" },
              { label: "住宅ローン残高", value: plan.useHomeLoan ? plan.hlBal : 0, color: "#c8383a", category: "fixed" },
              { label: "不動産投資ローン残高", value: realEstateLoan, color: "#e88a8c", category: "fixed" },
            ] as const
          ).filter((l) => l.value > 0)}
          netWorth={netWorthNow}
        />
      </ReportSection>

      {/* 4. 主要指標 */}
      <ReportSection no="04" title="主要指標 ／ KEY INDICATORS">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="最終純資産"
            value={fmt(result.finalNetWorth)}
            alert={result.finalNetWorth < 0}
            sub={`${plan.endAge}歳時点`}
          />
          <KpiCard
            label="資金ショート"
            value={
              result.shortfallAge ? `${result.shortfallAge}歳` : "なし"
            }
            alert={!!result.shortfallAge}
            sub={result.shortfallAge ? "現金が枯渇する年齢" : "完走見込み"}
          />
          <KpiCard
            label="退職時の純資産"
            value={retireRow ? fmt(retireRow.nw) : "-"}
            sub={`${lastJobEndAge}歳時点`}
          />
          <KpiCard
            label="65歳の純資産"
            value={fmt(nwAt65)}
            alert={nwAt65 < 0}
            sub="老後資金の出発点"
          />
        </div>
        {selfPenY > 0 && (
          <p className="mt-3 text-[10px] leading-relaxed text-[#0a0a0a]/55">
            ※年金開始（{plan.penStartA}歳）の年間受給額（手取り換算）: 約 {fmtMan(selfPenY)}
          </p>
        )}
      </ReportSection>

      {/* 5. 資産推移 */}
      <ReportSection no="05" title="資産推移 ／ ASSET TRAJECTORY">
        <AssetsChart rows={result.rows} />
      </ReportSection>

      {/* 6. キャッシュフロー */}
      <ReportSection no="06" title="年間キャッシュフロー ／ ANNUAL CASHFLOW">
        <CashflowChart rows={result.rows} />
      </ReportSection>

      {/* 7. リスク・留意事項 */}
      <ReportSection no="07" title="リスク・留意事項 ／ DISCLAIMERS">
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
              投信 {plan.fundR.toFixed(1)}% / 株 {plan.stockR.toFixed(1)}% /
              DC {plan.dcR.toFixed(1)}% / 金 {plan.goldR.toFixed(1)}% を年複利で適用
            </li>
            <li>
              <span className="font-bold text-[#0a0a0a]">税・社会保険:</span>{" "}
              {plan.taxMode === "detailed"
                ? "FP級の累進課税・控除・社会保険料を詳細計算"
                : `一律 ${plan.taxRate}% で簡易計算`}
            </li>
            <li>
              <span className="font-bold text-[#0a0a0a]">DC取り崩し:</span>{" "}
              60歳から受給可（原則それまでは取り崩し対象外）。60〜64歳は年金開始までの繋ぎとして優先取崩、65歳以降は公的年金と組み合わせて他資産と並列取崩
            </li>
            <li>
              <span className="font-bold text-[#0a0a0a]">想定外:</span>{" "}
              重大疾病・株式市場の暴落・年金制度の変更・大規模災害は織り込んでいません
            </li>
          </ul>
        </div>
      </ReportSection>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/v3/suggest"
          className="flex-1 py-3 text-center text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
          style={{
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
            color: "#0a0a0a",
          }}
        >
          シナリオ比較を見る →
        </Link>
        <Link
          href="/v3/detail"
          className="flex-1 py-3 text-center text-xs font-bold text-white transition-colors hover:opacity-80"
          style={{
            background: "#0a0a0a",
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
          }}
        >
          詳細入力を修正する →
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
  const totalHeight = Math.max(totalAssets, totalLiabilities, 1);

  const [hovered, setHovered] = useState<string | null>(null);

  const buildSegments = (items: BSItem[]): BSSegment[] =>
    items
      .filter((it) => it.value > 0)
      .map((it) => ({
        ...it,
        heightPx: Math.max(
          (it.value / totalHeight) * BS_BAR_HEIGHT,
          BS_MIN_SEG_HEIGHT,
        ),
      }));

  const currentA = buildSegments(assets.filter((a) => a.category === "current"));
  const fixedA = buildSegments(assets.filter((a) => a.category === "fixed"));
  const currentL = buildSegments(liabilities.filter((l) => l.category === "current"));
  const fixedL = buildSegments(liabilities.filter((l) => l.category === "fixed"));
  const nwHeightPx = Math.max(
    (Math.abs(netWorth) / totalHeight) * BS_BAR_HEIGHT,
    BS_MIN_SEG_HEIGHT,
  );

  return (
    <div
      className="mt-3 rounded-xl p-4"
      style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/60">
        BALANCE SHEET ／ 資産・負債バランス
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* 左: 資産（凡例 → バー） */}
        <div>
          <div
            className="mb-1.5 flex items-baseline justify-between border-b-2 px-1 pb-1"
            style={{ borderColor: "#22863a" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#22863a]">
              資産 ASSETS
            </span>
            <span className="text-sm font-bold tabular-nums text-[#22863a]">
              {fmtMan(totalAssets)}
            </span>
          </div>
          <BSColumnGrouped
            barSide="right"
            groups={[
              { label: "流動資産", segments: currentA },
              { label: "固定資産", segments: fixedA },
            ]}
            extraSegment={
              isAlert
                ? {
                    label: "純資産マイナス",
                    value: Math.abs(netWorth),
                    color: "#c8383a",
                    heightPx: nwHeightPx,
                    striped: true,
                    category: "current",
                  }
                : null
            }
            hovered={hovered}
            setHovered={setHovered}
          />
        </div>

        {/* 右: 負債+純資産（バー → 凡例） */}
        <div>
          <div
            className="mb-1.5 flex items-baseline justify-between border-b-2 px-1 pb-1"
            style={{ borderColor: "#c8383a" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8383a]">
              {isAlert ? "負債" : "負債 + 純資産"}
            </span>
            <span className="text-sm font-bold tabular-nums text-[#c8383a]">
              {fmtMan(isAlert ? totalLiabilities : totalLiabilities + Math.max(0, netWorth))}
            </span>
          </div>
          <BSColumnGrouped
            barSide="left"
            groups={[
              { label: "流動負債", segments: currentL },
              { label: "固定負債", segments: fixedL },
            ]}
            extraSegment={
              !isAlert && netWorth > 0
                ? {
                    label: "純資産（NET）",
                    value: netWorth,
                    color: "#22863a",
                    heightPx: nwHeightPx,
                    striped: false,
                    category: "current",
                  }
                : null
            }
            hovered={hovered}
            setHovered={setHovered}
          />
        </div>
      </div>

      {/* 純資産サマリー */}
      <div
        className="mt-4 flex items-center justify-between rounded-lg px-4 py-2.5"
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
            純資産（NET WORTH）
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
}: {
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
        width: BS_BAR_WIDTH,
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
        barSide === "right" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      {ordered.map((item) => (
        <BSLegendItem
          key={item.segment.label}
          segment={item.segment}
          groupLabel={item.groupLabel}
          showGroup={item.isGroupHead}
          barSide={barSide}
          hovered={hovered}
          setHovered={setHovered}
        />
      ))}
    </ul>
  );

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
  groupLabel,
  showGroup,
  barSide,
  hovered,
  setHovered,
}: {
  segment: BSSegment;
  groupLabel: string | null;
  showGroup: boolean;
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

  return (
    <li
      onMouseEnter={() => setHovered(segment.label)}
      onMouseLeave={() => setHovered(null)}
      className={`flex items-center gap-1.5 cursor-pointer transition-all ${
        barSide === "right" ? "flex-row-reverse" : ""
      }`}
      style={{
        height: segment.heightPx,
      }}
    >
      {swatch}
      <div
        className="min-w-0 transition-all"
        style={{
          transform: isHovered ? "scale(1.15)" : "scale(1)",
          transformOrigin: barSide === "right" ? "right center" : "left center",
        }}
      >
        {showGroup && groupLabel && (
          <p className="text-[8px] font-bold uppercase tracking-wide text-[#0a0a0a]/40 leading-none mb-0.5">
            [{groupLabel}]
          </p>
        )}
        <p className="leading-tight text-[#0a0a0a]/70">{segment.label}</p>
        <p
          className="font-bold tabular-nums leading-tight"
          style={{
            color: isHovered ? segment.color : "#0a0a0a",
            fontSize: isHovered ? "13px" : "11px",
            transition: "all 0.15s",
            filter: isHovered ? "brightness(0.7)" : "none",
          }}
        >
          {fmtMan(segment.value)}
        </p>
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
