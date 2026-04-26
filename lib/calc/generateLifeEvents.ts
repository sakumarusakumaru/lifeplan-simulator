import type { LifeEvent, PlanInput } from "./types";

export function generateLifeEvents(plan: PlanInput): LifeEvent[] {
  const map = new Map<number, string>();

  const add = (age: number, label: string) => {
    const a = Math.round(age);
    if (a <= plan.curAge || a > plan.endAge) return;
    const prev = map.get(a);
    map.set(a, prev ? `${prev}・${label}` : label);
  };

  // 勤務先
  for (const job of plan.jobs) {
    if (job.inc > 0 && job.end > 0) {
      add(job.end, `${job.name || "勤務"}退職`);
    }
    if (job.sev > 0 && job.sevAge > 0) {
      add(job.sevAge, "退職金受取");
    }
  }

  // 副業
  for (const sj of plan.sideJobs) {
    if (sj.inc > 0 && sj.end > 0) {
      add(sj.end, `${sj.name || "副業"}終了`);
    }
  }

  // 年金
  if (plan.penStartA > 0) add(plan.penStartA, "年金受給");
  if (plan.useSpousePen && plan.penStartB > 0) add(plan.penStartB, "配偶者年金");

  // 配偶者就労終了
  if (plan.spouseWork === "work" && plan.spouseIncEnd > 0) {
    add(plan.spouseIncEnd, "配偶者退職");
  }

  // 住宅ローン完済
  if (plan.useHomeLoan && plan.hlStart > 0 && plan.hlTerm > 0) {
    add(plan.hlStart + plan.hlTerm, "ローン完済");
  }

  // 子ども（大学入学 = 親の年齢 = kid.offset + 18）
  for (const kid of plan.kids) {
    if (kid.offset > 0) {
      add(kid.offset + 18, `${kid.name || "子"}大学入学`);
    }
  }

  // 不動産取得
  for (const re of plan.res) {
    const startAge = typeof re.start === "number" ? re.start : Number(re.start) || 0;
    if (startAge > 0) add(startAge, `${re.name || "物件"}取得`);
  }

  // DC/iDeCo 積立終了
  if (plan.saveDcM > 0 && plan.saveDcEndAge > 0) {
    add(plan.saveDcEndAge, "iDeCo終了");
  }

  return Array.from(map.entries())
    .map(([age, label]) => ({ age, label }))
    .sort((a, b) => a.age - b.age);
}
