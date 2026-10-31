"use client";

import { pensionFactor } from "@/lib/lite/toPlan";
import type { LiteAnswerKey, LiteBuyType, LiteEdu, LiteEvent, LiteHome, LiteInput, LiteSpouseWork, LiteWork } from "@/lib/lite/types";
import { useLiteStore } from "@/store/lite/lite-store";

import { Card, Choice, INK, NumField, RED } from "./controls";

// ver4 Lite の入力（必須の4枚・14問と、任意の2枚）
export function LiteInputs() {
  const q = useLiteStore((s) => s.q);
  const set = useLiteStore((s) => s.set);
  const setKid = (i: number, age: number) => set({ kidAges: q.kidAges.map((a, j) => (j === i ? age : a)) });
  // 任意の項目: 答えたこと（「ない」も含む）を記録して、精度メーターに反映する
  const answer = (key: LiteAnswerKey, p: Partial<LiteInput> = {}) => set({ ...p, ans: { ...q.ans, [key]: true } });
  const setEvent = (i: number, p: Partial<LiteEvent>) => set({ events: q.events.map((e, j) => (j === i ? { ...e, ...p } : e)) });
  const pct = (f: number) => `${f >= 1 ? "+" : ""}${Math.round((f - 1) * 1000) / 10}%`;

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
        {q.hasSpouse ? (
          <Choice
            label="配偶者は"
            value={q.spouseSex}
            options={[
              { value: "female", label: "妻" },
              { value: "male", label: "夫" },
            ]}
            onChange={(v) => set({ spouseSex: v as LiteInput["spouseSex"] })}
          />
        ) : null}
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-bold text-[#0a0a0a]">子ども（これから生まれる予定の子は、下の「予定があれば」で）</span>
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
              <div className="grid grid-cols-2 gap-3">
                <NumField label="配偶者の年収（引く前）" value={q.spouseIncome} onChange={(v) => set({ spouseIncome: v })} unit="万円" />
                <NumField label="配偶者は何歳まで働くか" value={q.spouseRetireAge} onChange={(v) => set({ spouseRetireAge: v })} unit="歳" min={q.spouseAge} max={80} />
              </div>
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
        {q.home !== "rent" ? (
          <Choice<LiteBuyType>
            label="家の種類"
            value={q.homeType}
            options={[
              { value: "mansion", label: "マンション" },
              { value: "house", label: "戸建て" },
            ]}
            onChange={(v) => set({ homeType: v })}
            hint="マンションは管理費・修繕積立金を月3万円、戸建ては修繕の積立を月1.5万円、固定資産税を年10万円で見ます"
          />
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

      <Card no="05" title="予定があれば" note="答えなくても結果は出ます。答えるほど、あなたの人生に近い計算になります（「予定はない」も答えのうちです）。">
        <Choice<string>
          label="これから子どもを持つ予定"
          value={q.ans.kidsPlan ? String(q.futureKids) : ""}
          options={[
            { value: "0", label: "予定はない" },
            { value: "1", label: "1人" },
            { value: "2", label: "2人" },
            { value: "3", label: "3人" },
          ]}
          onChange={(v) => answer("kidsPlan", { futureKids: Number(v) })}
        />
        {q.futureKids > 0 ? (
          <NumField
            label="1人目が生まれるのは何年後"
            value={q.futureKidsIn}
            onChange={(v) => set({ futureKidsIn: v })}
            unit="年後"
            max={20}
            hint="2人目からは2年おきとして計算。学校は上の「学校」と同じ"
          />
        ) : null}

        {q.home === "rent" ? (
          <>
            <Choice<string>
              label="家を買う予定"
              value={q.ans.homePlan ? (q.buyHome ? "yes" : "no") : ""}
              options={[
                { value: "no", label: "予定はない" },
                { value: "yes", label: "買う予定" },
              ]}
              onChange={(v) => answer("homePlan", { buyHome: v === "yes", buyAge: Math.max(q.buyAge, q.age + 1) })}
            />
            {q.buyHome ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <NumField label="何歳で" value={q.buyAge} onChange={(v) => set({ buyAge: v })} unit="歳" min={q.age + 1} max={80} />
                  <NumField label="家の値段" value={q.buyPrice} onChange={(v) => set({ buyPrice: v })} unit="万円" />
                  <NumField label="頭金" value={q.buyDown} onChange={(v) => set({ buyDown: v })} unit="万円" />
                </div>
                <Choice<LiteBuyType>
                  label="家の種類"
                  value={q.homeType}
                  options={[
                    { value: "mansion", label: "マンション" },
                    { value: "house", label: "戸建て" },
                  ]}
                  onChange={(v) => set({ homeType: v })}
                  hint="残りは35年ローン（金利1%）。諸費用として値段の7%を買う年に払う。買ったあとは家賃が止まり、維持費と固定資産税がかかります"
                />
              </>
            ) : null}
          </>
        ) : null}

        <Choice<string>
          label="大きな出費の予定（車・リフォーム・留学・結婚式など）"
          value={q.ans.events ? (q.events.length > 0 ? "yes" : "no") : ""}
          options={[
            { value: "no", label: "予定はない" },
            { value: "yes", label: "ある" },
          ]}
          onChange={(v) =>
            answer("events", { events: v === "yes" ? (q.events.length ? q.events : [{ label: "車の買い替え", age: q.age + 5, amount: 300 }]) : [] })
          }
        />
        {q.events.map((e, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)] items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-bold">何に</span>
              <input
                value={e.label}
                onChange={(ev) => setEvent(i, { label: ev.target.value })}
                className="rounded-lg bg-white px-2.5 py-2 text-[13px] font-bold outline-none"
                style={{ border: `2px solid ${INK}` }}
              />
            </label>
            <NumField label="何歳で" value={e.age} onChange={(v) => setEvent(i, { age: v })} unit="歳" min={q.age} max={100} />
            <NumField label="いくら" value={e.amount} onChange={(v) => setEvent(i, { amount: v })} unit="万円" />
            <button
              type="button"
              onClick={() => set({ events: q.events.filter((_, j) => j !== i) })}
              className="col-span-3 -mt-1 justify-self-start text-[10px] font-bold underline"
              style={{ color: RED }}
            >
              消す
            </button>
          </div>
        ))}
        {q.events.length > 0 && q.events.length < 3 ? (
          <button
            type="button"
            onClick={() => set({ events: [...q.events, { label: "", age: q.age + 10, amount: 100 }] })}
            className="self-start rounded-lg px-3 py-2 text-[12px] font-bold"
            style={{ border: `2px dashed ${INK}`, background: "#fff" }}
          >
            ＋ 出費を足す
          </button>
        ) : null}
      </Card>

      <Card no="06" title="わかれば、あなたの事情に近づく" note="手元に書類があれば。わからなければ空欄のままで大丈夫です。">
        <NumField
          label="ねんきん定期便の見込み額（あなた）"
          value={q.pensionSelf}
          onChange={(v) => set({ pensionSelf: v })}
          unit="万円/月"
          max={50}
          placeholder="自動"
          hint="50歳以上は、定期便の「老齢年金の見込額」の合計（年額）を12で割った額。50歳未満の定期便は今までに納めた分だけの額なので、空欄（自動で見積もる）のほうが近くなります"
        />
        {q.hasSpouse ? (
          <NumField
            label="ねんきん定期便の見込み額（配偶者）"
            value={q.pensionSpouse}
            onChange={(v) => set({ pensionSpouse: v })}
            unit="万円/月"
            max={50}
            placeholder="自動"
          />
        ) : null}
        <NumField
          label={q.hasSpouse ? "あなたが年金をもらい始める年齢（配偶者は65歳から）" : "年金をもらい始める年齢"}
          value={q.penStart}
          onChange={(v) => set({ penStart: v })}
          unit="歳"
          min={60}
          max={75}
          hint={`65歳より遅らせると1年で8.4%増え、早めると1年で4.8%減ります（${Math.min(75, Math.max(60, q.penStart))}歳なら ${pct(pensionFactor(q.penStart))}）`}
        />
        <Choice<string>
          label="働き終わったあとの生活費"
          value={q.ans.retireLiving ? (q.retireLivingM > 0 ? "change" : "same") : ""}
          options={[
            { value: "same", label: "いまと同じ" },
            { value: "change", label: "変える" },
          ]}
          onChange={(v) => answer("retireLiving", { retireLivingM: v === "change" ? q.retireLivingM || Math.max(1, Math.round(q.livingM * 0.8)) : 0 })}
          hint="住まい・教育費を除いた毎月の生活費。子どもが独立すると下がることが多い"
        />
        {q.retireLivingM > 0 ? (
          <NumField label="働き終わったあとの毎月の生活費" value={q.retireLivingM} onChange={(v) => set({ retireLivingM: v })} unit="万円/月" min={1} />
        ) : null}
        <Choice<string>
          label="iDeCo・企業型DC（60歳まで引き出せない年金のお金）"
          value={q.ans.dc ? (q.dcBal > 0 || q.dcM > 0 ? "yes" : "no") : ""}
          options={[
            { value: "no", label: "入っていない" },
            { value: "yes", label: "入っている" },
          ]}
          onChange={(v) => answer("dc", v === "no" ? { dcBal: 0, dcM: 0 } : { dcM: q.dcM || 1 })}
        />
        {q.ans.dc && (q.dcBal > 0 || q.dcM > 0) ? (
          <div className="grid grid-cols-2 gap-3">
            <NumField label="いまの残高" value={q.dcBal} onChange={(v) => set({ dcBal: v })} unit="万円" />
            <NumField label="毎月の掛金（自分で出す分）" value={q.dcM} onChange={(v) => set({ dcM: v })} unit="万円/月" max={7} hint="会社が出す分は入れない（少なめに見る）" />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
