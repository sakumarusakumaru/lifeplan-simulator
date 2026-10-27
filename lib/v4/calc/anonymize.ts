// 検証用の書き出し: 計算に使う数字は残し、名前・連絡先・メッセージなど個人が分かる文字を消す
import { DEFAULT_PLAN } from "./defaults";
import type { PlanInput } from "./types";

// 生年月日は年齢の計算に必要なので年・月だけ残し、日は1日にする
const monthOnly = (d: string) => (d && /^\d{4}-\d{2}/.test(d) ? `${d.slice(0, 7)}-01` : d);

export function anonymizePlan(plan: PlanInput): PlanInput {
  return {
    ...plan,
    selfBirth: monthOnly(plan.selfBirth),
    spouseBirth: monthOnly(plan.spouseBirth),
    jobs: plan.jobs.map((j, i) => ({ ...j, name: `勤務先${i + 1}` })),
    sideJobs: plan.sideJobs.map((j, i) => ({ ...j, name: `副業${i + 1}` })),
    kids: plan.kids.map((k, i) => ({ ...k, name: `子${i + 1}`, birth: monthOnly(k.birth) })),
    res: plan.res.map((r, i) => ({ ...r, name: `物件${i + 1}` })),
    ins: plan.ins.map((p, i) => ({ ...p, name: `保険${i + 1}`, memo: "" })),
    inheritances: plan.inheritances.map((x, i) => ({ ...x, label: `一時収入${i + 1}` })),
    lifeExpenses: plan.lifeExpenses.map((x, i) => ({ ...x, label: `一時支出${i + 1}` })),
    otherLoans: plan.otherLoans.map((x, i) => ({ ...x, label: `ローン${i + 1}` })),
    careEvents: plan.careEvents.map((x, i) => ({ ...x, label: `介護${i + 1}` })),
    lifeEvents: plan.lifeEvents.map((x, i) => ({ ...x, label: `イベント${i + 1}` })),
    // 引き継ぎ書（金融機関名・連絡先・メッセージなど）は丸ごと消す
    handover: DEFAULT_PLAN.handover,
  };
}
