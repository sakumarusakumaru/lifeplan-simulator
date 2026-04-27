"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AssetsChart } from "@/components/charts/AssetsChart";
import { CashflowChart } from "@/components/charts/CashflowChart";
import { ageOn, kidAge } from "@/lib/calc/age";
import { simulate } from "@/lib/calc/simulate";
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

function verdict(shortfallAge: number | null, nw: number, endAge: number, curAge: number) {
  if (shortfallAge) {
    const yearsLeft = shortfallAge - curAge;
    return {
      headline: `${shortfallAge}歳で資金不足`,
      body: `あと${yearsLeft}年で資産が枯渇する見込みです。固定費の見直しによる支出削減、副業・配偶者就労による収入多角化、NISA・iDeCo等の非課税枠を活用した積立投資の強化、退職時期の延長による就労期間の確保を組み合わせることで改善可能です。具体的な改善効果は「改善提案」タブで複数シナリオ別に試算できます。`,
      alert: true,
    };
  }
  if (nw < 0) {
    return {
      headline: `${endAge}歳時点でマイナス`,
      body: `老後に純資産がマイナスとなる見込みです。住宅ローンや不動産ローンの残債が老後の資産を圧迫している可能性があります。繰上返済の検討、不動産の見直し（売却・賃貸転換）、生活費水準の調整を含めた抜本的な家計設計の再構築をお勧めします。`,
      alert: true,
    };
  }
  if (nw < 10_000_000) {
    return {
      headline: `${endAge}歳まで完走（余裕わずか）`,
      body: `計画上は${endAge}歳まで資産が続きますが、余裕は少なめです。想定外の支出（医療費・介護費・物価高騰）への備えとして、生活防衛資金の積み増しと支出管理の徹底をお勧めします。NISA・iDeCoの非課税枠を活用した追加積立で老後余裕度の改善を図りましょう。`,
      alert: false,
    };
  }
  if (nw < 50_000_000) {
    return {
      headline: `老後資金は概ね安定`,
      body: `資金計画は概ね良好です。インフレや医療費増加のリスクに備え、資産の一部を株式・投信で分散運用し、実質的な購買力を維持することをご検討ください。長寿リスクを念頭に、65歳時点でも30〜40%程度の株式比率を維持することを推奨します。`,
      alert: false,
    };
  }
  if (nw < 100_000_000) {
    return {
      headline: `余裕ある資産形成`,
      body: `老後資金は十分に確保できる見通しです。今後は「守りから攻めへ」の移行を意識するタイミング。相続税対策（生前贈与・生命保険の死亡保険金非課税枠）、子・孫への教育資金一括贈与（1,500万円非課税）など、富裕層向けの最適化テーマを順次検討しましょう。`,
      alert: false,
    };
  }
  return {
    headline: `資産計画は非常に良好`,
    body: `余裕のある資産計画です。相続税対策の本格的な検討時期です。配偶者・子への暦年贈与（年間110万円非課税）、教育資金一括贈与の特例（1,500万円非課税）、生命保険の死亡保険金非課税枠（500万円×法定相続人数）など、複数制度を組み合わせた戦略的な資産移転をFP・税理士と連携して計画しましょう。`,
    alert: false,
  };
}

export default function ResultPage() {
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);

  const v = verdict(result.shortfallAge, result.finalNetWorth, plan.endAge, plan.curAge);

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
  const realEstateBal = plan.res.reduce((acc, r) => acc + r.bal, 0);
  const otherLoanBal = plan.otherLoans.reduce(
    (acc, ln) => acc + ln.monthlyPay * ln.remainMonths,
    0,
  );
  // 不動産（簿価）はローン残高と同額として計上：金融資産＋不動産簿価＝資産合計
  const totalAssetsNow = financialAssets + realEstateBal;
  const totalLiabilitiesNow =
    (plan.useHomeLoan ? plan.hlBal : 0) + realEstateBal + otherLoanBal;
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
        <div
          className="rounded-2xl p-5"
          style={{
            background: v.alert ? "#fff0f0" : "#f0fff4",
            border: `2.5px solid ${v.alert ? "#c8383a" : "#22863a"}`,
          }}
        >
          <p
            className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: v.alert ? "#c8383a" : "#22863a" }}
          >
            診断結果
          </p>
          <p className="text-xl font-bold text-[#0a0a0a]">{v.headline}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-[#0a0a0a]/70">
            {v.body}
          </p>
        </div>
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
              { label: "不動産（簿価）", value: realEstateBal, color: "#8b6f4e", category: "fixed" },
            ] as const
          ).filter((a) => a.value > 0)}
          liabilities={(
            [
              { label: "その他ローン残高", value: otherLoanBal, color: "#d4a017", category: "current" },
              { label: "住宅ローン残高", value: plan.useHomeLoan ? plan.hlBal : 0, color: "#c8383a", category: "fixed" },
              { label: "不動産ローン残高", value: realEstateBal, color: "#e88a8c", category: "fixed" },
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
          href="/v2/suggest"
          className="flex-1 py-3 text-center text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white"
          style={{
            border: "2.5px solid #0a0a0a",
            borderRadius: 10,
            color: "#0a0a0a",
          }}
        >
          改善提案を見る →
        </Link>
        <Link
          href="/v2/detail"
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

type BSView = "taccount" | "formal" | "hybrid" | "table";

function BalanceSheetVis({
  assets,
  liabilities,
  netWorth,
}: {
  assets: BSItem[];
  liabilities: BSItem[];
  netWorth: number;
}) {
  const [view, setView] = useState<BSView>("taccount");
  const totalAssets = assets.reduce((a, b) => a + b.value, 0);
  const totalLiabilities = liabilities.reduce((a, b) => a + b.value, 0);
  const isAlert = netWorth < 0;

  return (
    <div
      className="mt-3 rounded-xl p-4"
      style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/60">
          BALANCE SHEET ／ 資産・負債バランス
        </p>
        <div className="flex gap-0.5 overflow-x-auto rounded-md" style={{ border: "1.5px solid #0a0a0a30" }}>
          {(
            [
              { key: "taccount", label: "T勘定" },
              { key: "formal", label: "A 公式表" },
              { key: "hybrid", label: "B ハイブリッド" },
              { key: "table", label: "C 表のみ" },
            ] as { key: BSView; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              className="whitespace-nowrap px-2.5 py-1 text-[10px] font-bold transition-colors"
              style={{
                background: view === t.key ? "#0a0a0a" : "transparent",
                color: view === t.key ? "#ffffff" : "#0a0a0a",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {view === "taccount" && (
        <BSViewTAccount
          assets={assets}
          liabilities={liabilities}
          netWorth={netWorth}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
        />
      )}
      {view === "formal" && (
        <BSViewFormal
          assets={assets}
          liabilities={liabilities}
          netWorth={netWorth}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
        />
      )}
      {view === "hybrid" && (
        <BSViewHybrid
          assets={assets}
          liabilities={liabilities}
          netWorth={netWorth}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
        />
      )}
      {view === "table" && (
        <BSViewPureTable
          assets={assets}
          liabilities={liabilities}
          netWorth={netWorth}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
        />
      )}

      {/* 純資産サマリー（共通） */}
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

interface BSViewProps {
  assets: BSItem[];
  liabilities: BSItem[];
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

// ─────────────────────────────────────────────
// 現行: T勘定型（縦バー + 凡例）
// ─────────────────────────────────────────────
function BSViewTAccount({ assets, liabilities, netWorth, totalAssets, totalLiabilities }: BSViewProps) {
  const isAlert = netWorth < 0;
  const totalHeight = Math.max(totalAssets, totalLiabilities, 1);
  const BAR_HEIGHT = 280;
  const assetSegments = assets.filter((a) => a.value > 0).map((a) => ({
    ...a,
    heightPx: (a.value / totalHeight) * BAR_HEIGHT,
  }));
  const liabilitySegments = liabilities.filter((l) => l.value > 0).map((l) => ({
    ...l,
    heightPx: (l.value / totalHeight) * BAR_HEIGHT,
  }));
  const nwHeightPx = (Math.abs(netWorth) / totalHeight) * BAR_HEIGHT;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between border-b-2 px-1 pb-1" style={{ borderColor: "#22863a" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#22863a]">
            {isAlert ? "資産 + 純資産マイナス" : "資産 ASSETS"}
          </span>
          <span className="text-sm font-bold tabular-nums text-[#22863a]">
            {fmtMan(isAlert ? totalAssets + Math.abs(netWorth) : totalAssets)}
          </span>
        </div>
        <BSColumn
          segments={assetSegments}
          extraSegment={
            isAlert
              ? { label: "純資産マイナス", value: Math.abs(netWorth), color: "#c8383a", heightPx: nwHeightPx, striped: true, category: "current" }
              : null
          }
          heightPx={BAR_HEIGHT}
          align="left"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between border-b-2 px-1 pb-1" style={{ borderColor: "#c8383a" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8383a]">
            {isAlert ? "負債" : "負債 + 純資産"}
          </span>
          <span className="text-sm font-bold tabular-nums text-[#c8383a]">
            {fmtMan(isAlert ? totalLiabilities : totalLiabilities + Math.max(0, netWorth))}
          </span>
        </div>
        <BSColumn
          segments={liabilitySegments}
          extraSegment={
            !isAlert && netWorth > 0
              ? { label: "純資産（NET）", value: netWorth, color: "#22863a", heightPx: nwHeightPx, striped: false, category: "current" }
              : null
          }
          heightPx={BAR_HEIGHT}
          align="right"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// A: 公式フォーマット（流動/固定セクション付き表）
// ─────────────────────────────────────────────
function BSViewFormal({ assets, liabilities, netWorth, totalAssets, totalLiabilities }: BSViewProps) {
  const isAlert = netWorth < 0;
  const currentAssets = assets.filter((a) => a.category === "current");
  const fixedAssets = assets.filter((a) => a.category === "fixed");
  const currentLiab = liabilities.filter((l) => l.category === "current");
  const fixedLiab = liabilities.filter((l) => l.category === "fixed");
  const sumCurrentA = currentAssets.reduce((s, a) => s + a.value, 0);
  const sumFixedA = fixedAssets.reduce((s, a) => s + a.value, 0);
  const sumCurrentL = currentLiab.reduce((s, l) => s + l.value, 0);
  const sumFixedL = fixedLiab.reduce((s, l) => s + l.value, 0);

  // 公式の貸借対照表: 資産合計 = 負債合計 + 純資産（負の場合は減算）
  // 両側とも totalAssets で一致する
  const grandTotal = totalAssets;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {/* 左: 資産の部 */}
      <div style={{ border: "1.5px solid #0a0a0a", borderRadius: 6 }}>
        <div className="px-3 py-1.5 text-center text-[11px] font-bold tracking-[0.12em] text-white" style={{ background: "#22863a" }}>
          資産の部
        </div>
        <table className="w-full text-[11px]">
          <tbody>
            {currentAssets.length > 0 && (
              <>
                <tr style={{ background: "#f0fff4" }}>
                  <td className="px-3 py-1 font-bold text-[#0a0a0a]/70">流動資産</td>
                  <td></td>
                </tr>
                {currentAssets.map((a) => (
                  <tr key={a.label} style={{ borderTop: "1px solid #0a0a0a10" }}>
                    <td className="px-3 py-1 pl-6">
                      <span className="inline-block h-2 w-2 mr-1.5 align-middle" style={{ background: a.color, border: "1px solid #0a0a0a30" }} />
                      {a.label}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums">{fmtMan(a.value)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid #0a0a0a30" }}>
                  <td className="px-3 py-1 pl-6 text-[#0a0a0a]/65">小計</td>
                  <td className="px-3 py-1 text-right font-bold tabular-nums">{fmtMan(sumCurrentA)}</td>
                </tr>
              </>
            )}
            {fixedAssets.length > 0 && (
              <>
                <tr style={{ background: "#f0fff4", borderTop: "1.5px solid #0a0a0a" }}>
                  <td className="px-3 py-1 font-bold text-[#0a0a0a]/70">固定資産</td>
                  <td></td>
                </tr>
                {fixedAssets.map((a) => (
                  <tr key={a.label} style={{ borderTop: "1px solid #0a0a0a10" }}>
                    <td className="px-3 py-1 pl-6">
                      <span className="inline-block h-2 w-2 mr-1.5 align-middle" style={{ background: a.color, border: "1px solid #0a0a0a30" }} />
                      {a.label}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums">{fmtMan(a.value)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid #0a0a0a30" }}>
                  <td className="px-3 py-1 pl-6 text-[#0a0a0a]/65">小計</td>
                  <td className="px-3 py-1 text-right font-bold tabular-nums">{fmtMan(sumFixedA)}</td>
                </tr>
              </>
            )}
            <tr style={{ borderTop: "2.5px double #0a0a0a", background: "#0a0a0a" }}>
              <td className="px-3 py-1.5 font-bold uppercase tracking-[0.1em] text-white">資産合計</td>
              <td className="px-3 py-1.5 text-right font-bold tabular-nums text-white">
                {fmtMan(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 右: 負債及び純資産の部 */}
      <div style={{ border: "1.5px solid #0a0a0a", borderRadius: 6 }}>
        <div className="px-3 py-1.5 text-center text-[11px] font-bold tracking-[0.12em] text-white" style={{ background: "#c8383a" }}>
          負債及び純資産の部
        </div>
        <table className="w-full text-[11px]">
          <tbody>
            {currentLiab.length > 0 && (
              <>
                <tr style={{ background: "#fff0f0" }}>
                  <td className="px-3 py-1 font-bold text-[#0a0a0a]/70">流動負債</td>
                  <td></td>
                </tr>
                {currentLiab.map((l) => (
                  <tr key={l.label} style={{ borderTop: "1px solid #0a0a0a10" }}>
                    <td className="px-3 py-1 pl-6">
                      <span className="inline-block h-2 w-2 mr-1.5 align-middle" style={{ background: l.color, border: "1px solid #0a0a0a30" }} />
                      {l.label}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums">{fmtMan(l.value)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid #0a0a0a30" }}>
                  <td className="px-3 py-1 pl-6 text-[#0a0a0a]/65">小計</td>
                  <td className="px-3 py-1 text-right font-bold tabular-nums">{fmtMan(sumCurrentL)}</td>
                </tr>
              </>
            )}
            {fixedLiab.length > 0 && (
              <>
                <tr style={{ background: "#fff0f0", borderTop: "1.5px solid #0a0a0a" }}>
                  <td className="px-3 py-1 font-bold text-[#0a0a0a]/70">固定負債</td>
                  <td></td>
                </tr>
                {fixedLiab.map((l) => (
                  <tr key={l.label} style={{ borderTop: "1px solid #0a0a0a10" }}>
                    <td className="px-3 py-1 pl-6">
                      <span className="inline-block h-2 w-2 mr-1.5 align-middle" style={{ background: l.color, border: "1px solid #0a0a0a30" }} />
                      {l.label}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums">{fmtMan(l.value)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid #0a0a0a30" }}>
                  <td className="px-3 py-1 pl-6 text-[#0a0a0a]/65">小計</td>
                  <td className="px-3 py-1 text-right font-bold tabular-nums">{fmtMan(sumFixedL)}</td>
                </tr>
              </>
            )}
            <tr style={{ borderTop: "1.5px solid #0a0a0a", background: "#fff0f0" }}>
              <td className="px-3 py-1 font-bold text-[#0a0a0a]">負債合計</td>
              <td className="px-3 py-1 text-right font-bold tabular-nums text-[#c8383a]">{fmtMan(totalLiabilities)}</td>
            </tr>
            <tr style={{ background: "#f0fff4", borderTop: "1.5px solid #0a0a0a" }}>
              <td className="px-3 py-1 font-bold text-[#0a0a0a]/70">純資産の部</td>
              <td></td>
            </tr>
            <tr style={{ borderTop: "1px solid #0a0a0a10" }}>
              <td className="px-3 py-1 pl-6">純資産</td>
              <td className="px-3 py-1 text-right font-bold tabular-nums" style={{ color: isAlert ? "#c8383a" : "#22863a" }}>
                {fmtMan(netWorth)}
              </td>
            </tr>
            <tr style={{ borderTop: "2.5px double #0a0a0a", background: "#0a0a0a" }}>
              <td className="px-3 py-1.5 font-bold uppercase tracking-[0.1em] text-white">負債純資産合計</td>
              <td className="px-3 py-1.5 text-right font-bold tabular-nums text-white">
                {fmtMan(totalLiabilities + netWorth)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// B: ハイブリッド（T勘定 + 流動/固定 区切り）
// ─────────────────────────────────────────────
function BSViewHybrid({ assets, liabilities, netWorth, totalAssets, totalLiabilities }: BSViewProps) {
  const isAlert = netWorth < 0;
  const totalHeight = Math.max(totalAssets, totalLiabilities, 1);
  const BAR_HEIGHT = 280;

  const buildSegments = (items: BSItem[]) =>
    items.filter((it) => it.value > 0).map((it) => ({
      ...it,
      heightPx: (it.value / totalHeight) * BAR_HEIGHT,
    }));

  const currentA = buildSegments(assets.filter((a) => a.category === "current"));
  const fixedA = buildSegments(assets.filter((a) => a.category === "fixed"));
  const currentL = buildSegments(liabilities.filter((l) => l.category === "current"));
  const fixedL = buildSegments(liabilities.filter((l) => l.category === "fixed"));
  const nwHeightPx = (Math.abs(netWorth) / totalHeight) * BAR_HEIGHT;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between border-b-2 px-1 pb-1" style={{ borderColor: "#22863a" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#22863a]">資産 ASSETS</span>
          <span className="text-sm font-bold tabular-nums text-[#22863a]">{fmtMan(totalAssets)}</span>
        </div>
        <BSColumnGrouped
          groups={[
            { label: "流動資産", segments: currentA },
            { label: "固定資産", segments: fixedA },
          ]}
          extraSegment={
            isAlert
              ? { label: "純資産マイナス", value: Math.abs(netWorth), color: "#c8383a", heightPx: nwHeightPx, striped: true, category: "current" }
              : null
          }
          heightPx={BAR_HEIGHT}
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between border-b-2 px-1 pb-1" style={{ borderColor: "#c8383a" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8383a]">
            {isAlert ? "負債" : "負債 + 純資産"}
          </span>
          <span className="text-sm font-bold tabular-nums text-[#c8383a]">
            {fmtMan(isAlert ? totalLiabilities : totalLiabilities + Math.max(0, netWorth))}
          </span>
        </div>
        <BSColumnGrouped
          groups={[
            { label: "流動負債", segments: currentL },
            { label: "固定負債", segments: fixedL },
          ]}
          extraSegment={
            !isAlert && netWorth > 0
              ? { label: "純資産（NET）", value: netWorth, color: "#22863a", heightPx: nwHeightPx, striped: false, category: "current" }
              : null
          }
          heightPx={BAR_HEIGHT}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// C: 表のみ（austere・縦単一カラム）
// ─────────────────────────────────────────────
function BSViewPureTable({ assets, liabilities, netWorth, totalAssets, totalLiabilities }: BSViewProps) {
  const isAlert = netWorth < 0;
  const currentA = assets.filter((a) => a.category === "current");
  const fixedA = assets.filter((a) => a.category === "fixed");
  const currentL = liabilities.filter((l) => l.category === "current");
  const fixedL = liabilities.filter((l) => l.category === "fixed");
  const sumCurrentA = currentA.reduce((s, a) => s + a.value, 0);
  const sumFixedA = fixedA.reduce((s, a) => s + a.value, 0);
  const sumCurrentL = currentL.reduce((s, l) => s + l.value, 0);
  const sumFixedL = fixedL.reduce((s, l) => s + l.value, 0);

  return (
    <div style={{ border: "1.5px solid #0a0a0a" }}>
      <table className="w-full text-[11px]">
        <thead>
          <tr style={{ background: "#0a0a0a", color: "#ffffff" }}>
            <th className="px-3 py-2 text-left font-bold uppercase tracking-[0.1em]">勘定科目</th>
            <th className="px-3 py-2 text-right font-bold uppercase tracking-[0.1em]">金額</th>
          </tr>
        </thead>
        <tbody className="text-[#0a0a0a]">
          {/* 資産の部 */}
          <tr style={{ background: "#f0fff4", borderBottom: "1px solid #0a0a0a30" }}>
            <td className="px-3 py-1 font-bold text-[#22863a]" colSpan={2}>【資産の部】</td>
          </tr>
          {currentA.length > 0 && (
            <>
              <tr style={{ borderBottom: "1px solid #0a0a0a10" }}>
                <td className="px-3 py-1 pl-4 font-bold text-[#0a0a0a]/70">流動資産</td>
                <td></td>
              </tr>
              {currentA.map((a) => (
                <tr key={a.label} style={{ borderBottom: "1px solid #0a0a0a08" }}>
                  <td className="px-3 py-1 pl-7 text-[#0a0a0a]/80">{a.label}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmtMan(a.value)}</td>
                </tr>
              ))}
              <tr style={{ borderBottom: "1px solid #0a0a0a30" }}>
                <td className="px-3 py-1 pl-4 italic text-[#0a0a0a]/55">流動資産合計</td>
                <td className="px-3 py-1 text-right font-bold tabular-nums">{fmtMan(sumCurrentA)}</td>
              </tr>
            </>
          )}
          {fixedA.length > 0 && (
            <>
              <tr style={{ borderBottom: "1px solid #0a0a0a10" }}>
                <td className="px-3 py-1 pl-4 font-bold text-[#0a0a0a]/70">固定資産</td>
                <td></td>
              </tr>
              {fixedA.map((a) => (
                <tr key={a.label} style={{ borderBottom: "1px solid #0a0a0a08" }}>
                  <td className="px-3 py-1 pl-7 text-[#0a0a0a]/80">{a.label}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmtMan(a.value)}</td>
                </tr>
              ))}
              <tr style={{ borderBottom: "1px solid #0a0a0a30" }}>
                <td className="px-3 py-1 pl-4 italic text-[#0a0a0a]/55">固定資産合計</td>
                <td className="px-3 py-1 text-right font-bold tabular-nums">{fmtMan(sumFixedA)}</td>
              </tr>
            </>
          )}
          <tr style={{ borderBottom: "2px double #0a0a0a", background: "#0a0a0a", color: "#ffffff" }}>
            <td className="px-3 py-1.5 font-bold">資産合計</td>
            <td className="px-3 py-1.5 text-right font-bold tabular-nums">{fmtMan(totalAssets)}</td>
          </tr>

          {/* 負債の部 */}
          <tr style={{ background: "#fff0f0", borderBottom: "1px solid #0a0a0a30" }}>
            <td className="px-3 py-1 font-bold text-[#c8383a]" colSpan={2}>【負債の部】</td>
          </tr>
          {currentL.length > 0 && (
            <>
              <tr style={{ borderBottom: "1px solid #0a0a0a10" }}>
                <td className="px-3 py-1 pl-4 font-bold text-[#0a0a0a]/70">流動負債</td>
                <td></td>
              </tr>
              {currentL.map((l) => (
                <tr key={l.label} style={{ borderBottom: "1px solid #0a0a0a08" }}>
                  <td className="px-3 py-1 pl-7 text-[#0a0a0a]/80">{l.label}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmtMan(l.value)}</td>
                </tr>
              ))}
              <tr style={{ borderBottom: "1px solid #0a0a0a30" }}>
                <td className="px-3 py-1 pl-4 italic text-[#0a0a0a]/55">流動負債合計</td>
                <td className="px-3 py-1 text-right font-bold tabular-nums">{fmtMan(sumCurrentL)}</td>
              </tr>
            </>
          )}
          {fixedL.length > 0 && (
            <>
              <tr style={{ borderBottom: "1px solid #0a0a0a10" }}>
                <td className="px-3 py-1 pl-4 font-bold text-[#0a0a0a]/70">固定負債</td>
                <td></td>
              </tr>
              {fixedL.map((l) => (
                <tr key={l.label} style={{ borderBottom: "1px solid #0a0a0a08" }}>
                  <td className="px-3 py-1 pl-7 text-[#0a0a0a]/80">{l.label}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmtMan(l.value)}</td>
                </tr>
              ))}
              <tr style={{ borderBottom: "1px solid #0a0a0a30" }}>
                <td className="px-3 py-1 pl-4 italic text-[#0a0a0a]/55">固定負債合計</td>
                <td className="px-3 py-1 text-right font-bold tabular-nums">{fmtMan(sumFixedL)}</td>
              </tr>
            </>
          )}
          <tr style={{ borderBottom: "2px double #0a0a0a", background: "#0a0a0a", color: "#ffffff" }}>
            <td className="px-3 py-1.5 font-bold">負債合計</td>
            <td className="px-3 py-1.5 text-right font-bold tabular-nums">{fmtMan(totalLiabilities)}</td>
          </tr>

          {/* 純資産の部 */}
          <tr style={{ background: "#f0fff4", borderBottom: "1px solid #0a0a0a30" }}>
            <td className="px-3 py-1 font-bold text-[#22863a]" colSpan={2}>【純資産の部】</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #0a0a0a08" }}>
            <td className="px-3 py-1 pl-7 text-[#0a0a0a]/80">純資産</td>
            <td
              className="px-3 py-1 text-right font-bold tabular-nums"
              style={{ color: isAlert ? "#c8383a" : "#22863a" }}
            >
              {fmtMan(netWorth)}
            </td>
          </tr>
          <tr style={{ background: "#0a0a0a", color: "#ffffff" }}>
            <td className="px-3 py-2 font-bold uppercase tracking-[0.1em]">負債純資産合計</td>
            <td className="px-3 py-2 text-right font-bold tabular-nums">
              {fmtMan(totalLiabilities + netWorth)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ハイブリッド用: 流動/固定の区切り付きカラム
function BSColumnGrouped({
  groups,
  extraSegment,
  heightPx,
}: {
  groups: { label: string; segments: BSSegment[] }[];
  extraSegment: BSSegment | null;
  heightPx: number;
}) {
  const allSegments: { label: string; segment: BSSegment; isGroupTop: boolean; groupLabel: string }[] = [];
  groups.forEach((g) => {
    g.segments.forEach((s, i) => {
      allSegments.push({ label: s.label, segment: s, isGroupTop: i === 0, groupLabel: g.label });
    });
  });

  return (
    <div className="flex gap-2">
      <div
        className="flex flex-col-reverse overflow-hidden"
        style={{ width: 56, height: heightPx, border: "1.5px solid #0a0a0a30", borderRadius: 4 }}
      >
        {extraSegment && (
          <div
            className="flex items-center justify-center"
            style={{
              height: extraSegment.heightPx,
              minHeight: 2,
              background: extraSegment.color,
              borderTop: allSegments.length > 0 ? "2px dashed #ffffff80" : "none",
              backgroundImage: extraSegment.striped
                ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)"
                : "none",
            }}
            title={`${extraSegment.label}: ${fmtMan(extraSegment.value)}`}
          />
        )}
        {[...allSegments].reverse().map((s, idx) => (
          <div
            key={s.label}
            className="flex items-center justify-center"
            style={{
              height: s.segment.heightPx,
              minHeight: 2,
              background: s.segment.color,
              borderTop: idx > 0 ? (s.isGroupTop ? "2px solid #0a0a0a" : "1px solid #ffffff60") : "none",
            }}
            title={`[${s.groupLabel}] ${s.label}: ${fmtMan(s.segment.value)}`}
          />
        ))}
      </div>
      <ul className="flex flex-1 flex-col-reverse text-[10px]">
        {extraSegment && (
          <li className="flex items-center gap-1.5 py-0.5" style={{ minHeight: Math.max(extraSegment.heightPx, 18) }}>
            <span
              className="inline-block h-2.5 w-2.5 shrink-0"
              style={{
                background: extraSegment.color,
                border: "1px solid #0a0a0a30",
                backgroundImage: extraSegment.striped
                  ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)"
                  : "none",
              }}
            />
            <div className="min-w-0">
              <p className="leading-tight text-[#0a0a0a]/70">{extraSegment.label}</p>
              <p className="font-bold tabular-nums leading-tight text-[#0a0a0a]">{fmtMan(extraSegment.value)}</p>
            </div>
          </li>
        )}
        {groups.map((g) => (
          <li key={g.label} className="flex flex-col-reverse">
            {g.segments.map((s, i) => (
              <div
                key={s.label}
                className="flex items-center gap-1.5 py-0.5"
                style={{ minHeight: Math.max(s.heightPx, 18) }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0"
                  style={{ background: s.color, border: "1px solid #0a0a0a30" }}
                />
                <div className="min-w-0">
                  <p className="leading-tight text-[#0a0a0a]/70">
                    {i === 0 ? (
                      <span className="text-[8px] font-bold uppercase tracking-wide text-[#0a0a0a]/40 mr-1">
                        [{g.label}]
                      </span>
                    ) : null}
                    {s.label}
                  </p>
                  <p className="font-bold tabular-nums leading-tight text-[#0a0a0a]">{fmtMan(s.value)}</p>
                </div>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BSSegment extends BSItem {
  heightPx: number;
  striped?: boolean;
}

function BSColumn({
  segments,
  extraSegment,
  heightPx,
  align,
}: {
  segments: BSSegment[];
  extraSegment: BSSegment | null;
  heightPx: number;
  align: "left" | "right";
}) {
  const allSegments: BSSegment[] = extraSegment
    ? [...segments, extraSegment]
    : segments;

  return (
    <div className="flex gap-2">
      {/* バー本体（縦積み） */}
      <div
        className="flex flex-col-reverse overflow-hidden"
        style={{
          width: 56,
          height: heightPx,
          border: "1.5px solid #0a0a0a30",
          borderRadius: 4,
        }}
      >
        {allSegments.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-center"
            style={{
              height: s.heightPx,
              minHeight: 2,
              background: s.color,
              borderTop: s !== allSegments[0] ? "1px solid #ffffff60" : "none",
              backgroundImage: s.striped
                ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)"
                : "none",
            }}
            title={`${s.label}: ${fmtMan(s.value)}`}
          />
        ))}
      </div>

      {/* 凡例（縦並び） */}
      <ul className={`flex-1 flex flex-col-reverse ${align === "right" ? "items-start" : "items-start"} text-[10px]`}>
        {allSegments.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-1.5 py-0.5"
            style={{ minHeight: Math.max(s.heightPx, 18) }}
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0"
              style={{
                background: s.color,
                border: "1px solid #0a0a0a30",
                backgroundImage: s.striped
                  ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)"
                  : "none",
              }}
            />
            <div className="min-w-0">
              <p className="leading-tight text-[#0a0a0a]/70">{s.label}</p>
              <p className="font-bold tabular-nums leading-tight text-[#0a0a0a]">
                {fmtMan(s.value)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
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
