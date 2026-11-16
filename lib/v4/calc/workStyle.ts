// ver6.2: 働き方（基本タブで1回選ぶ）から、年金の種類・iDeCoの区分・配偶者の就労の有無をまとめて決める。
// 計算エンジンは selfWork / spWork を読まない。ここで決めた selfPension.category・spouseWork・dcType などを読む。
// 画面はここで決めた値をあとから個別に直せる（年金の種類など）。そのとき表示がずれないよう、
// 「いまの働き方」は保存した値より実際のデータ（年金の種類・spouseWork）を優先して読み取る。
import type { DcType, Job, PensionInput, PlanInput } from "./types";

export type SelfWork = NonNullable<PlanInput["selfWork"]>;
export type SpWork = NonNullable<PlanInput["spWork"]>;

export const SELF_WORK_OPTIONS: { value: SelfWork; label: string }[] = [
  { value: "employee", label: "会社員・公務員（厚生年金に入っている）" },
  { value: "self", label: "自営業・フリーランス（国民年金）" },
  { value: "none", label: "働いていない（退職した・年金生活・無職）" },
];

export const SP_WORK_OPTIONS: { value: SpWork; label: string }[] = [
  { value: "employee", label: "会社員・公務員（厚生年金に入っている）" },
  { value: "part", label: "パート・アルバイト（扶養の範囲内）" },
  { value: "self", label: "自営業・フリーランス（国民年金）" },
  { value: "none", label: "働いていない（専業主婦・主夫、退職した人など）" },
];

// いまの働き方。年金の種類と矛盾する保存値は使わない（保存値は「自営業か、働いていないか」などの見分けにだけ使う）
export function selfWorkOf(plan: PlanInput): SelfWork {
  if (plan.selfPension.category !== "kokumin") return plan.selfWork === "none" ? "none" : "employee";
  if (plan.selfWork === "none" || plan.selfWork === "self") return plan.selfWork;
  return plan.jobs.some((j) => j.inc > 0) ? "self" : "none";
}

export function spWorkOf(plan: PlanInput): SpWork {
  if (plan.spouseWork === "none") return "none";
  if (plan.spousePension.category === "kosei") return "employee";
  if (plan.spousePension.category === "dependent") return "part";
  return plan.spWork === "part" ? "part" : "self";
}

const isEmployeeDc = (t: DcType | undefined) => t === "employee-none" || t === "employee-dc" || t === "employee-db";

// 厚生年金に入っていた期間が入力されているか（年金の種類を変えると、この分が年金の自動計算から外れる）
export const hasKoseiHistory = (p: PensionInput) => p.mode === "auto" && p.koseiYears > 0 && p.koseiAvgIncome > 0;
// 会社員だった期間の入力があるのに、いまの年金の種類では計算に入っていない
export const koseiLeftOut = (p: PensionInput) => p.category !== "kosei" && hasKoseiHistory(p);

// 配偶者の iDeCo の区分。未設定（ver5 までのデータ・働き方をまだ選んでいない人）は年金の種類から決める。画面とエンジンで共有
export function spDcTypeOf(plan: PlanInput): DcType {
  if (plan.spDcType) return plan.spDcType;
  const c = plan.spousePension.category;
  return c === "kosei" ? "employee-none" : c === "dependent" ? "dependent" : "self-employed";
}

// 配偶者の働き方 → 就労の有無・年金の種類・iDeCoの区分
//   扶養（第3号）になれるのは、本人が会社員・公務員（第2号）のときだけ。そうでなければ国民年金（第1号）。
//   「働いていない」を選んだ60歳以上の元会社員（厚生年金の加入期間が入っている人）は、年金の種類を厚生年金のまま残す
//   （60歳からは国民年金の保険料がなく、種類を変えると老齢厚生年金が計算から消えるため）
export function applySpWork(plan: PlanInput, w: SpWork, selfWork: SelfWork = selfWorkOf(plan), spouseAge: number | null = null): Partial<PlanInput> {
  const dependentOk = selfWork === "employee";
  const cur = plan.spousePension;
  const keepKosei = w === "none" && cur.category === "kosei" && hasKoseiHistory(cur) && spouseAge !== null && spouseAge >= 60;
  const category = w === "employee" || keepKosei ? "kosei" : w === "self" ? "kokumin" : dependentOk ? "dependent" : "kokumin";
  const spDcType: DcType =
    w === "employee" ? (isEmployeeDc(plan.spDcType) ? (plan.spDcType as DcType) : "employee-none") : category === "dependent" ? "dependent" : "self-employed";
  return {
    spWork: w,
    spouseWork: w === "none" ? "none" : "work",
    spousePension: { ...cur, category },
    spDcType,
    // 会社が出すDCの掛金は、会社員・公務員のときだけ
    ...(w !== "employee" && (plan.spDcEmployerM ?? 0) > 0 ? { spDcEmployerM: 0 } : {}),
  };
}

// 本人の働き方 → 年金の種類・iDeCoの区分。
//   「働いていない」は年金の種類を変えない（退職した元会社員の老齢厚生年金を消さないため。勤務先がなければ国民年金・国保で計算される）。
//   配偶者は、扶養（第3号）と国民年金（第1号）の入れ替えだけを連動させる（厚生年金の人は触らない）
export function applySelfWork(plan: PlanInput, w: SelfWork): Partial<PlanInput> {
  const patch: Partial<PlanInput> = {
    selfWork: w,
    dcType: w === "employee" ? (isEmployeeDc(plan.dcType) ? plan.dcType : "employee-none") : "self-employed",
    ...(w !== "employee" && plan.dcEmployerM > 0 ? { dcEmployerM: 0 } : {}),
  };
  if (w !== "none") patch.selfPension = { ...plan.selfPension, category: w === "employee" ? "kosei" : "kokumin" };
  if (plan.spouseBirth) {
    const sc = plan.spousePension.category;
    const next = w === "employee" ? (sc === "kokumin" && spWorkOf(plan) !== "self" ? "dependent" : sc) : sc === "dependent" ? "kokumin" : sc;
    if (next !== sc) {
      patch.spousePension = { ...plan.spousePension, category: next };
      // 働き方の表示（パートか自営業か）が変わらないように覚えておく
      patch.spWork = spWorkOf(plan);
      if (!isEmployeeDc(plan.spDcType)) patch.spDcType = next === "dependent" ? "dependent" : "self-employed";
    }
  }
  return patch;
}

// 配偶者の勤務先の一覧。新しい形（spJobs）がまだなければ、前の入れ方（年収・開始・終了）を1件の勤務先として見せる
export function spJobsOf(plan: PlanInput): Job[] {
  if (plan.spJobs) return plan.spJobs;
  if (plan.spouseIncY > 0)
    return [
      {
        name: "配偶者の勤務先",
        start: plan.spouseIncStart,
        end: plan.spouseIncEnd,
        inc: plan.spouseIncY,
        raise: 0,
        sev: 0,
        sevAge: plan.spouseIncEnd,
      },
    ];
  return [];
}

// 配偶者のいちばん遅い退職年齢（配偶者の年齢。勤務先がなければ null）
export function spLastWorkEnd(plan: PlanInput): number | null {
  if (plan.spouseWork !== "work") return null;
  const jobs = spJobsOf(plan);
  return jobs.length ? Math.max(...jobs.map((j) => j.end)) : null;
}
