"use client";

import { useMemo } from "react";
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

function verdict(shortfallAge: number | null, nw: number, endAge: number) {
  if (shortfallAge) {
    return {
      headline: `${shortfallAge}歳で資金不足`,
      body: `このままでは${shortfallAge}歳時点で資産が底をつく見込みです。生活費の見直し・収入増・運用改善など早めの対策が必要です。`,
      alert: true,
    };
  }
  if (nw < 0) {
    return {
      headline: `${endAge}歳時点でマイナス`,
      body: `老後に資産がマイナスとなる見込みです。支出の削減と積立の強化が急務です。`,
      alert: true,
    };
  }
  if (nw < 10_000_000) {
    return {
      headline: `${endAge}歳まで完走（余裕わずか）`,
      body: `計画上は${endAge}歳まで資産が続きますが、余裕は少なめです。想定外の支出への備えを厚くしましょう。`,
      alert: false,
    };
  }
  if (nw < 50_000_000) {
    return {
      headline: `老後資金は概ね安定`,
      body: `資金計画は概ね良好です。インフレ・医療費リスクに備え、引き続き分散運用を続けましょう。`,
      alert: false,
    };
  }
  return {
    headline: `資産計画は非常に良好`,
    body: `余裕のある資産計画です。相続・贈与対策や資産の最適化を検討するタイミングです。`,
    alert: false,
  };
}

export default function ResultPage() {
  const plan = usePlanStore((s) => s.plan);
  const result = useMemo(() => simulate(plan), [plan]);

  const v = verdict(result.shortfallAge, result.finalNetWorth, plan.endAge);

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
  const totalAssetsNow =
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

        <div
          className="mt-3 rounded-xl p-4"
          style={{ background: "#fff", border: "2px solid #0a0a0a18" }}
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a]/60">
            BALANCE SHEET ／ 資産・負債バランス
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1.5 text-[10px] font-bold text-[#22863a]">
                資産（ASSETS）
              </p>
              <BSRow label="現金・預金" value={plan.cashBal} />
              <BSRow label="投信" value={plan.fundBal} />
              <BSRow label="株" value={plan.stockBal} />
              <BSRow label="DC" value={plan.dcBal} />
              <BSRow label="金・コモディティ" value={plan.goldBal} />
              <BSRow label="仮想通貨" value={plan.cryptoBal} />
              <BSRow label="不動産（簿価）" value={realEstateBal} />
              <div
                className="mt-2 flex items-baseline justify-between border-t-2 border-[#0a0a0a] pt-2"
              >
                <span className="text-[11px] font-bold text-[#0a0a0a]">合計</span>
                <span className="text-sm font-bold tabular-nums text-[#22863a]">
                  {fmtMan(totalAssetsNow + realEstateBal)}
                </span>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold text-[#c8383a]">
                負債（LIABILITIES）
              </p>
              <BSRow
                label="住宅ローン残高"
                value={plan.useHomeLoan ? plan.hlBal : 0}
              />
              <BSRow label="不動産ローン残高" value={realEstateBal} />
              <BSRow label="その他ローン残高" value={otherLoanBal} />
              <div
                className="mt-2 flex items-baseline justify-between border-t-2 border-[#0a0a0a] pt-2"
              >
                <span className="text-[11px] font-bold text-[#0a0a0a]">合計</span>
                <span className="text-sm font-bold tabular-nums text-[#c8383a]">
                  {fmtMan(totalLiabilitiesNow)}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#0a0a0a] px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                  純資産（NET）
                </span>
                <span
                  className="text-base font-bold tabular-nums"
                  style={{ color: netWorthNow < 0 ? "#f87171" : "#86efac" }}
                >
                  {fmtMan(netWorthNow)}
                </span>
              </div>
            </div>
          </div>
        </div>
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
              65歳までは取り崩し対象外。それ以降は他資産と並列で取り崩し可
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

function BSRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-[10px] text-[#0a0a0a]/65">{label}</span>
      <span className="text-[11px] font-bold tabular-nums text-[#0a0a0a]">
        {fmtMan(value)}
      </span>
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
