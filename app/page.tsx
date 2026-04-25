import { DEFAULT_PLAN, simulate } from "@/lib/calc";

const yenToOkuMan = (yen: number): string => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen));
  const oku = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  if (oku > 0) return `${sign}${oku}億${man.toLocaleString()}万`;
  return `${sign}${man.toLocaleString()}万`;
};

export default function Home() {
  const result = simulate(DEFAULT_PLAN);
  const sample = [0, 5, 10, 20, 30, 40, 50, 60].map((i) => result.rows[i]).filter(Boolean);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">LifePlan Simulator</h1>
      <p className="mt-1 text-sm text-zinc-500">
        計算ロジック抽出のスモークテスト。デフォルトプランで simulate() を実行した結果。
      </p>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="最終純資産" value={yenToOkuMan(result.finalNetWorth)} />
        <Kpi label="最低現金残高" value={yenToOkuMan(result.minCash)} />
        <Kpi label="最大教育費(年)" value={yenToOkuMan(result.maxEdu)} />
        <Kpi
          label="資金ショート年齢"
          value={result.shortfallAge ? `${result.shortfallAge}歳` : "なし"}
          tone={result.shortfallAge ? "warn" : "ok"}
        />
      </section>

      <section className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">年齢</th>
              <th className="px-3 py-2 text-right">純資産</th>
              <th className="px-3 py-2 text-right">現金</th>
              <th className="px-3 py-2 text-right">投信</th>
              <th className="px-3 py-2 text-right">株</th>
              <th className="px-3 py-2 text-right">DC</th>
              <th className="px-3 py-2 text-right">CF</th>
              <th className="px-3 py-2 text-right">取り崩し</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((r) => (
              <tr key={r.age} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-medium">{r.age}</td>
                <td className="px-3 py-2 text-right">{yenToOkuMan(r.nw)}</td>
                <td className="px-3 py-2 text-right">{yenToOkuMan(r.ass.c)}</td>
                <td className="px-3 py-2 text-right">{yenToOkuMan(r.ass.f)}</td>
                <td className="px-3 py-2 text-right">{yenToOkuMan(r.ass.s)}</td>
                <td className="px-3 py-2 text-right">{yenToOkuMan(r.ass.dc)}</td>
                <td className="px-3 py-2 text-right">{yenToOkuMan(r.cf)}</td>
                <td className="px-3 py-2 text-right">{yenToOkuMan(r.draw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-6 text-xs text-zinc-400">
        計算行数: {result.rows.length} 年（{DEFAULT_PLAN.curAge}〜{DEFAULT_PLAN.endAge}歳）
      </p>
    </main>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const toneClass =
    tone === "warn"
      ? "text-rose-600"
      : tone === "ok"
        ? "text-emerald-600"
        : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
