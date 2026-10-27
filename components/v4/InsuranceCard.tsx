"use client";

import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { TextField } from "@/components/v4/inputs/TextField";
import { ListItemCard } from "@/components/v4/ListItemCard";
import {
  HAS,
  INSURANCE_TYPES,
  defaultDeductKind,
  newInsurance,
  policySummary,
} from "@/lib/v4/calc/insurance";
import type { Insurance, InsuranceType, Insured, Kid } from "@/lib/v4/calc/types";

const INK = "#0a0a0a";

const TYPE_OPTIONS = INSURANCE_TYPES.map((t) => ({ value: t.value, label: t.label, group: t.group }));

const INSURED_OPTIONS: { value: Insured; label: string }[] = [
  { value: "本人", label: "本人" },
  { value: "配偶者", label: "配偶者" },
  { value: "子", label: "子" },
  { value: "その他", label: "その他" },
];

const CONTRACTOR_OPTIONS: { value: "本人" | "配偶者"; label: string }[] = [
  { value: "本人", label: "本人" },
  { value: "配偶者", label: "配偶者" },
];

const PAY_OPTIONS: { value: Insurance["payMode"]; label: string }[] = [
  { value: "monthly", label: "月払" },
  { value: "yearly", label: "年払" },
  { value: "single", label: "一時払（最初に一括）" },
];

const CURRENCY_OPTIONS: { value: Insurance["currency"]; label: string }[] = [
  { value: "円", label: "円建て" },
  { value: "米ドル", label: "米ドル建て" },
  { value: "豪ドル", label: "豪ドル建て" },
  { value: "変額", label: "変額（運用で増減）" },
];

const DEDUCT_LABEL: Record<string, string> = {
  一般: "一般生命保険料控除",
  介護医療: "介護医療保険料控除",
  個人年金: "個人年金保険料控除",
  地震: "地震保険料控除（「うち地震保険料」の分）",
  なし: "控除の対象外",
};

const man = (yen: number) => `${Math.round(yen / 10000).toLocaleString()}万円`;

function Hint({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <p
      className="rounded-md px-2.5 py-1.5 text-[10px] leading-relaxed"
      style={warn ? { background: "#fff8e1", color: "#7a5a00", border: "1px solid #e0b400" } : { background: "#f0f0ee", color: `${INK}b0` }}
    >
      {children}
    </p>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#66666a]">— {children}</p>;
}

// 保険1件の入力カード。種類で出す欄を切り替える
export function InsuranceCard({
  p,
  index,
  curAge,
  endAge,
  kids,
  onChange,
  onRemove,
}: {
  p: Insurance;
  index: number;
  curAge: number;
  endAge: number;
  kids: Kid[];
  onChange: (patch: Partial<Insurance>) => void;
  onRemove: () => void;
}) {
  const t = p.type;
  const desc = INSURANCE_TYPES.find((x) => x.value === t)?.desc ?? "";
  const kid = HAS.edu(t) ? kids[p.kid] : undefined;
  const kidAgeNow = kid ? curAge - kid.offset : null;
  const sum = policySummary(p, curAge, kidAgeNow);
  const savingType = HAS.maturity(t) || HAS.annuity(t) || HAS.edu(t) || (HAS.surrender(t) && p.surrenderAge > 0);

  // 種類を変えたら、その種類の初期値に置き換える（名前・保険料・年齢・人は残す）
  const changeType = (next: InsuranceType) => {
    const d = newInsurance(next, curAge, endAge);
    onChange({
      ...d,
      name: p.name,
      company: p.company,
      insured: next === "学資保険" ? "子" : p.insured === "子" ? "本人" : p.insured,
      contractor: p.contractor,
      payMode: next === "損害保険" && p.payMode === "monthly" ? "yearly" : p.payMode,
      premM: p.premM,
      start: p.start,
      memo: p.memo,
      enabled: p.enabled,
      type: next,
    });
  };

  const premLabel = p.payMode === "monthly" ? "保険料（月額）" : p.payMode === "yearly" ? "保険料（年額）" : "保険料（一時払の金額）";

  return (
    <ListItemCard kicker={`POLICY ${String(index + 1).padStart(2, "0")}${p.enabled ? "" : " · OFF"}`} onRemove={onRemove}>
      <div className="mb-3">
        <CheckboxField label="この保険を計算に含める" value={p.enabled} onChange={(v) => onChange({ enabled: v })} />
      </div>
      <div className="grid grid-cols-1 gap-2">
        <SelectField label="保険の種類" value={t} onChange={changeType} options={TYPE_OPTIONS} />
        <Hint>{desc}</Hint>

        <div className="grid grid-cols-2 gap-2">
          <TextField label="保険名" value={p.name} onChange={(v) => onChange({ name: v })} />
          <TextField label="保険会社" value={p.company} onChange={(v) => onChange({ company: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="被保険者" value={p.insured} onChange={(v) => onChange({ insured: v })} options={INSURED_OPTIONS} />
          <SelectField
            label="契約者（払う人）"
            value={p.contractor}
            onChange={(v) => onChange({ contractor: v })}
            options={CONTRACTOR_OPTIONS}
          />
        </div>

        <SubHead>保険料</SubHead>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="払い方" value={p.payMode} onChange={(v) => onChange({ payMode: v })} options={PAY_OPTIONS} />
          <NumberField label={premLabel} value={p.premM} onChange={(v) => onChange({ premM: v })} unit="円" />
        </div>
        {p.payMode === "single" ? (
          <NumberField
            label="払った（払う）年齢"
            value={p.start}
            onChange={(v) => onChange({ start: v, end: v })}
            unit="歳"
            hint="本人の年齢。すでに払い終えた一時払なら、その年齢"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="払込開始（契約）"
              value={p.start}
              onChange={(v) => onChange({ start: v })}
              unit="歳"
              hint="本人の年齢。過去の契約なら契約時の年齢"
            />
            <NumberField
              label="払込終了"
              value={p.end}
              onChange={(v) => onChange({ end: v })}
              unit="歳"
              hint={`終身払なら${endAge}`}
            />
          </div>
        )}
        {HAS.renewal(t) && p.payMode !== "single" ? (
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="更新の間隔"
              value={p.renewYears}
              onChange={(v) => onChange({ renewYears: v })}
              unit="年"
              hint="更新型なら10年など。全期型・終身は0"
            />
            <PercentField
              label="更新ごとの値上がり"
              value={p.renewRate}
              onChange={(v) => onChange({ renewRate: v })}
              step={5}
              hint="設計書の更新後保険料から。10年更新だと40歳で約1.7倍（70%）・50歳で約2倍（100%）が一例"
            />
          </div>
        ) : null}
        {t === "損害保険" ? (
          <>
            <NumberField
              label="うち地震保険料（年額）"
              value={p.quakePremY}
              onChange={(v) => onChange({ quakePremY: v })}
              unit="円"
              hint="火災保険に付けた地震保険の分。地震保険料控除の対象"
            />
            <Hint>損害保険は数年ごとの更新で保険料が見直されるため、物価上昇率に合わせて増えると仮定しています。</Hint>
          </>
        ) : null}

        {HAS.coverEnd(t) ? (
          <NumberField
            label="保障の終わり"
            value={p.coverEnd}
            onChange={(v) => onChange({ coverEnd: v })}
            unit="歳"
            hint="本人の年齢。終身保障なら0"
          />
        ) : null}

        {HAS.death(t) || HAS.incomeProt(t) ? <SubHead>亡くなったとき（{p.insured}）</SubHead> : null}
        {HAS.death(t) ? (
          <NumberField
            label={t === "個人年金保険" ? "死亡給付金（受取開始前）" : t === "共済" ? "死亡保障（病気）" : "死亡保険金"}
            value={p.deathBenefit}
            onChange={(v) => onChange({ deathBenefit: v })}
            unit="円"
            hint={t === "個人年金保険" ? "多くは払込保険料の相当額" : "「もしも・相続」の試算に入ります"}
          />
        ) : null}
        {t === "共済" ? (
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="保障が減る年齢"
              value={p.stepAge}
              onChange={(v) => onChange({ stepAge: v })}
              unit="歳"
              hint="県民共済は60歳・65歳で熟年型に変わるなど。減らないなら0"
            />
            <NumberField
              label="減った後の死亡保障"
              value={p.stepDeathBenefit}
              onChange={(v) => onChange({ stepDeathBenefit: v })}
              unit="円"
            />
            <PercentField
              label="割戻率"
              value={p.rebateRate}
              onChange={(v) => onChange({ rebateRate: v })}
              step={1}
              hint="毎年戻ってくる割戻金。掛金がその分安くなるとみなす"
            />
          </div>
        ) : null}
        {HAS.incomeProt(t) ? (
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="年金月額" value={p.incomeProtM} onChange={(v) => onChange({ incomeProtM: v })} unit="円" />
            <NumberField
              label="最低支払保証"
              value={p.incomeProtMinYears}
              onChange={(v) => onChange({ incomeProtMinYears: v })}
              unit="年"
              hint="満了直前に亡くなっても受け取れる年数（2年・5年など）"
            />
          </div>
        ) : null}
        {HAS.incomeProt(t) && p.incomeProtM > 0 && p.coverEnd > curAge ? (
          <Hint>
            いま亡くなった場合の受取総額の目安: {man(p.incomeProtM * 12 * Math.max(p.coverEnd - curAge, p.incomeProtMinYears))}
            （年数が経つほど減っていきます）。年金は遺族の収入として毎年入れます（2年目以降の一部にかかる所得税は省略）。
          </Hint>
        ) : null}

        {HAS.currency(t) ? (
          <SelectField label="通貨・運用" value={p.currency} onChange={(v) => onChange({ currency: v })} options={CURRENCY_OPTIONS} />
        ) : null}
        {HAS.currency(t) && p.currency !== "円" ? (
          <Hint warn>
            {p.currency === "変額"
              ? "変額保険は運用の結果で受取額が変わります。設計書の「運用実績0%」や「3.5%」などの例のうち、控えめな数字を入れておくと安全です。"
              : `${p.currency}建ては為替で円での受取額が変わります。下の金額は、いまの為替で円にした見込み額を入れてください（円高になると減ります）。`}
          </Hint>
        ) : null}

        {HAS.maturity(t) ? (
          <>
            <SubHead>満期</SubHead>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="満期の年齢" value={p.maturityAge} onChange={(v) => onChange({ maturityAge: v })} unit="歳" />
              <NumberField label="満期保険金" value={p.maturityAmount} onChange={(v) => onChange({ maturityAmount: v })} unit="円" />
            </div>
            {p.payMode === "single" && p.maturityAge > 0 && p.maturityAge - p.start <= 5 ? (
              <Hint>一時払で5年以内の満期は「金融類似商品」として、差益に20.315%の源泉分離課税で計算します。</Hint>
            ) : null}
          </>
        ) : null}

        {HAS.annuity(t) ? (
          <>
            <SubHead>年金の受け取り</SubHead>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="受取開始" value={p.annuityStart} onChange={(v) => onChange({ annuityStart: v })} unit="歳" />
              <NumberField
                label="受取期間"
                value={p.annuityYears}
                onChange={(v) => onChange({ annuityYears: v })}
                unit="年"
                hint="確定年金は10年など。終身年金は0"
              />
            </div>
            <NumberField label="年金額（年額）" value={p.annuityY} onChange={(v) => onChange({ annuityY: v })} unit="円" />
            <CheckboxField
              label="税制適格特約あり（個人年金保険料控除の対象）"
              value={p.qualifiedAnnuity}
              onChange={(v) => onChange({ qualifiedAnnuity: v })}
              hint="円建て・10年以上の払込・60歳以降10年以上の受取などの条件。証券や控除証明書で確認"
            />
          </>
        ) : null}

        {HAS.edu(t) ? (
          <>
            <SubHead>祝い金・満期金</SubHead>
            {kids.length ? (
              <SelectField
                label="対象の子ども"
                value={String(p.kid)}
                onChange={(v) => onChange({ kid: Number(v) })}
                options={kids.map((k, i) => ({ value: String(i), label: k.name || `子ども${i + 1}` }))}
              />
            ) : (
              <Hint warn>「教育費」で子どもを登録すると、受取の年が計算に入ります。</Hint>
            )}
            {p.eduPayouts.map((x, j) => (
              <div key={j} className="grid grid-cols-[1fr_1.4fr_auto] items-end gap-2">
                <NumberField
                  label="子の年齢"
                  value={x.kidAge}
                  onChange={(v) => onChange({ eduPayouts: p.eduPayouts.map((y, k) => (k === j ? { ...y, kidAge: v } : y)) })}
                  unit="歳"
                />
                <NumberField
                  label={j === p.eduPayouts.length - 1 ? "満期金" : "祝い金"}
                  value={x.amount}
                  onChange={(v) => onChange({ eduPayouts: p.eduPayouts.map((y, k) => (k === j ? { ...y, amount: v } : y)) })}
                  unit="円"
                />
                <button
                  type="button"
                  className="mb-0.5 rounded-md px-2 py-1.5 text-[10px] font-bold"
                  style={{ border: `2px solid ${INK}` }}
                  onClick={() => onChange({ eduPayouts: p.eduPayouts.filter((_, k) => k !== j) })}
                  aria-label="この受取を消す"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="rounded-md px-2 py-1.5 text-[11px] font-bold"
              style={{ border: `2px dashed ${INK}60` }}
              onClick={() => onChange({ eduPayouts: [...p.eduPayouts, { kidAge: 15, amount: 0 }].sort((a, b) => a.kidAge - b.kidAge) })}
            >
              ＋ 受取を追加（中学・高校入学の祝い金など）
            </button>
            <CheckboxField
              label="契約者が亡くなったら、以後の保険料は払わなくてよい（払込免除）"
              value={p.waiver}
              onChange={(v) => onChange({ waiver: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="育英年金（月額）"
                value={p.ikueiM}
                onChange={(v) => onChange({ ikueiM: v })}
                unit="円"
                hint="契約者が亡くなったときに出る年金。付いていなければ0"
              />
              <NumberField
                label="育英年金の終わり（子の年齢）"
                value={p.ikueiUntilKidAge}
                onChange={(v) => onChange({ ikueiUntilKidAge: v })}
                unit="歳"
              />
            </div>
          </>
        ) : null}

        {HAS.surrender(t) ? (
          <>
            <SubHead>途中で解約する予定</SubHead>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="解約する年齢"
                value={p.surrenderAge}
                onChange={(v) => onChange({ surrenderAge: v })}
                unit="歳"
                hint="解約しないなら0"
              />
              <NumberField
                label="解約返戻金"
                value={p.surrenderAmount}
                onChange={(v) => onChange({ surrenderAmount: v })}
                unit="円"
                hint="設計書の解約返戻金の表で、その年齢の金額"
              />
            </div>
            {t === "終身保険" ? (
              <Hint>
                低解約返戻金型は、払込期間中に解約すると返戻金が払込額の7割程度まで減ることがあります。払込が終わった後の年齢で見るのが一般的です。
              </Hint>
            ) : null}
          </>
        ) : null}

        {HAS.benefit(t) ? (
          <>
            <SubHead>保障の内容（引き継ぎ書用・計算には入れない）</SubHead>
            <div className="grid grid-cols-2 gap-2">
              {t === "医療保険" || t === "共済" ? (
                <NumberField label="入院日額" value={p.benefitDay} onChange={(v) => onChange({ benefitDay: v })} unit="円" />
              ) : null}
              {t === "がん・三大疾病" || t === "介護保険" ? (
                <NumberField label="一時金" value={p.benefitLump} onChange={(v) => onChange({ benefitLump: v })} unit="円" />
              ) : null}
              {t === "就業不能保険" || t === "介護保険" ? (
                <NumberField label="給付（月額）" value={p.benefitM} onChange={(v) => onChange({ benefitM: v })} unit="円" />
              ) : null}
            </div>
            <Hint>病気・介護の給付は、いつ起きるか分からないため計算には入れていません。保険料の支出だけが入ります。</Hint>
          </>
        ) : null}

        <div className="rounded-md px-2.5 py-2 text-[10px] leading-relaxed" style={{ background: "#f7f7f5", border: `1px solid ${INK}15` }}>
          <SelectField
            label={`保険料控除の区分（契約者の${p.contractor}の所得から）`}
            value={p.deductKind}
            onChange={(v) => onChange({ deductKind: v })}
            options={[
              { value: "自動", label: `自動：${DEDUCT_LABEL[defaultDeductKind(p)]}` },
              { value: "一般", label: DEDUCT_LABEL["一般"] },
              { value: "介護医療", label: DEDUCT_LABEL["介護医療"] },
              { value: "個人年金", label: DEDUCT_LABEL["個人年金"] },
              { value: "地震", label: DEDUCT_LABEL["地震"] },
              { value: "なし", label: DEDUCT_LABEL["なし"] },
            ]}
            hint="毎年届く控除証明書の区分に合わせて変えられます（2011年以前の契約は旧制度ですが、新制度で計算しています）"
          />
          {savingType && sum.paid > 0 ? (
            <p className="mt-0.5 font-bold tabular-nums">
              払込総額 {man(sum.paid)} → 受取 {man(sum.back)}
              {sum.ratio !== null ? `（返戻率 ${Math.round(sum.ratio * 1000) / 10}%）` : ""}
            </p>
          ) : null}
          {savingType ? (
            <p className="mt-0.5 text-[#0a0a0a]/60">
              {HAS.annuity(t)
                ? "年金は雑所得（年金額から払込保険料の相当分を引いた額）として課税します。"
                : "満期金・解約返戻金・祝い金は、受け取る契約者の一時所得（払込保険料を引き、50万円控除のあと1/2）として課税します。"}
            </p>
          ) : null}
        </div>

        <TextField label="メモ（計算に使わない・特約など）" value={p.memo} onChange={(v) => onChange({ memo: v })} />
      </div>
    </ListItemCard>
  );
}
