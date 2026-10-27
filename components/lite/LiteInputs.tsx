"use client";

import type { LiteEdu, LiteHome, LiteSpouseWork, LiteWork } from "@/lib/lite/types";
import { useLiteStore } from "@/store/lite/lite-store";

import { Card, Choice, INK, NumField, RED } from "./controls";

// ver4 Lite の入力（4つのカード・14問）
export function LiteInputs() {
  const q = useLiteStore((s) => s.q);
  const set = useLiteStore((s) => s.set);
  const setKid = (i: number, age: number) => set({ kidAges: q.kidAges.map((a, j) => (j === i ? age : a)) });

  return (
    <div className="flex flex-col gap-4">
      <Card no="01" title="家族">
        <NumField label="あなたの年齢" value={q.age} onChange={(v) => set({ age: v })} unit="歳" min={18} max={90} />
        <Choice
          label="配偶者"
          value={q.hasSpouse ? "yes" : "no"}
          options={[
            { value: "no", label: "いない" },
            { value: "yes", label: "いる" },
          ]}
          onChange={(v) => set({ hasSpouse: v === "yes" })}
        />
        {q.hasSpouse ? <NumField label="配偶者の年齢" value={q.spouseAge} onChange={(v) => set({ spouseAge: v })} unit="歳" min={18} max={90} /> : null}
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-bold text-[#0a0a0a]">子ども（これから生まれる予定の子は、ver4で入れられます）</span>
          <div className="flex flex-wrap items-end gap-2">
            {q.kidAges.map((a, i) => (
              <div key={i} className="flex w-[112px] flex-col gap-0.5">
                <NumField label={`${i + 1}人目`} value={a} onChange={(v) => setKid(i, v)} unit="歳" max={30} placeholder="0" />
                <button
                  type="button"
                  onClick={() => set({ kidAges: q.kidAges.filter((_, j) => j !== i) })}
                  className="self-start text-[10px] font-bold underline"
                  style={{ color: RED }}
                >
                  消す
                </button>
              </div>
            ))}
            {q.kidAges.length < 6 ? (
              <button
                type="button"
                onClick={() => set({ kidAges: [...q.kidAges, 0] })}
                className="mb-5 rounded-lg px-3 py-2 text-[12px] font-bold"
                style={{ border: `2px dashed ${INK}`, background: "#fff" }}
              >
                ＋ 子どもを足す
              </button>
            ) : null}
          </div>
        </div>
        {q.kidAges.length > 0 ? (
          <Choice<LiteEdu>
            label="学校"
            value={q.edu}
            options={[
              { value: "public", label: "ずっと公立" },
              { value: "uniPrivate", label: "大学だけ私立" },
              { value: "private", label: "中学から私立" },
            ]}
            onChange={(v) => set({ edu: v })}
            hint="大学まで行く前提です。塾代も目安で入ります"
          />
        ) : null}
      </Card>

      <Card no="02" title="収入">
        <Choice<LiteWork>
          label="あなたの働き方"
          value={q.work}
          options={[
            { value: "employee", label: "会社員・公務員" },
            { value: "self", label: "自営業・フリーランス" },
          ]}
          onChange={(v) => set({ work: v })}
        />
        <NumField
          label="年収（税金や社会保険料を引く前）"
          value={q.income}
          onChange={(v) => set({ income: v })}
          unit="万円"
          hint={q.work === "employee" ? "源泉徴収票の「支払金額」。ボーナスも含めた額" : "売上から経費を引いた額（確定申告書の事業所得の金額）"}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumField label="何歳まで働くか" value={q.retireAge} onChange={(v) => set({ retireAge: v })} unit="歳" min={q.age} max={80} />
          <NumField
            label="退職金の見込み"
            value={q.severance}
            onChange={(v) => set({ severance: v })}
            unit="万円"
            hint="わからなければ0（少なめに見る）"
          />
        </div>
        {q.hasSpouse ? (
          <>
            <Choice<LiteSpouseWork>
              label="配偶者の働き方"
              value={q.spouseWork}
              options={[
                { value: "employee", label: "会社員・公務員" },
                { value: "part", label: "パート" },
                { value: "none", label: "働いていない" },
                { value: "self", label: "自営業" },
              ]}
              onChange={(v) => set({ spouseWork: v })}
            />
            {q.spouseWork !== "none" ? (
              <NumField label="配偶者の年収（引く前）" value={q.spouseIncome} onChange={(v) => set({ spouseIncome: v })} unit="万円" hint="65歳まで続ける計算です" />
            ) : null}
          </>
        ) : null}
      </Card>

      <Card no="03" title="毎月の支出と住まい">
        <NumField
          label="毎月の生活費（住まい・教育費を除く）"
          value={q.livingM}
          onChange={(v) => set({ livingM: v })}
          unit="万円/月"
          hint="食費・光熱費・通信・日用品・保険・お小遣い・車・旅行など。年に一度の出費も12で割って足す。総務省の家計調査（2024年）では、住まいと教育費を除くと一人暮らしで約15万円、2人以上の世帯で約27万円"
        />
        <Choice<LiteHome>
          label="住まい"
          value={q.home}
          options={[
            { value: "rent", label: "賃貸" },
            { value: "loan", label: "持ち家（ローンあり）" },
            { value: "owned", label: "持ち家（ローンなし）" },
          ]}
          onChange={(v) => set({ home: v })}
        />
        {q.home === "rent" ? <NumField label="家賃（管理費込み）" value={q.rentM} onChange={(v) => set({ rentM: v })} unit="万円/月" hint="ずっと同じ家賃で住む計算です" /> : null}
        {q.home === "loan" ? (
          <div className="grid grid-cols-2 gap-3">
            <NumField label="ローンの返済" value={q.loanM} onChange={(v) => set({ loanM: v })} unit="万円/月" hint="ボーナス払いも12で割って足す" />
            <NumField label="残りの年数" value={q.loanYears} onChange={(v) => set({ loanYears: v })} unit="年" max={50} />
          </div>
        ) : null}
      </Card>

      <Card no="04" title="いまあるお金">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="預金・現金" value={q.cash} onChange={(v) => set({ cash: v })} unit="万円" />
          <NumField label="投資の合計" value={q.invest} onChange={(v) => set({ invest: v })} unit="万円" hint="NISA・株・投資信託など" />
        </div>
        <NumField
          label="毎月の積立"
          value={q.investM}
          onChange={(v) => set({ investM: v })}
          unit="万円/月"
          max={100}
          hint="新NISAで積み立てる計算（月30万円まで。超えた分は特定口座）"
        />
      </Card>
    </div>
  );
}
