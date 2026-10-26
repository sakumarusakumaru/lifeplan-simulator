"use client";

import { NumberField } from "@/components/v4/inputs/NumberField";
import { PercentField } from "@/components/v4/inputs/PercentField";
import { SelectField } from "@/components/v4/inputs/SelectField";
import { TextField } from "@/components/v4/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/v4/ListItemCard";
import { CollapsibleSubGroup } from "@/components/v4/CollapsibleSubGroup";
import { Section } from "@/components/v4/Section";
import { CheckboxField } from "@/components/v4/inputs/CheckboxField";
import { computeRealEstateValue } from "@/lib/v4/calc/finance";
import { DC_TYPE_OPTIONS, dcSelfLimit } from "@/lib/v4/calc/rules";
import type {
  BuildingStructure,
  DcPayoutMethod,
  RealEstate,
  RealEstateType,
} from "@/lib/v4/calc/types";
import { usePlanStore } from "@/store/v4/plan-store";

const PROP_TYPE_OPTIONS: { value: RealEstateType; label: string }[] = [
  { value: "mansion", label: "マンション（区分所有）" },
  { value: "house", label: "戸建て" },
  { value: "land", label: "土地のみ" },
];

const STRUCTURE_OPTIONS: { value: BuildingStructure; label: string }[] = [
  { value: "wood", label: "木造（耐用22年）" },
  { value: "lightSteel", label: "軽量鉄骨（27年）" },
  { value: "heavySteel", label: "重量鉄骨（34年）" },
  { value: "rc", label: "RC造（47年）" },
  { value: "src", label: "SRC造（47年）" },
];

const fmtMan = (yen: number) => {
  const sign = yen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(yen / 10000));
  return `${sign}${abs.toLocaleString()}万円`;
};

const DC_METHOD_OPTIONS: { value: DcPayoutMethod; label: string }[] = [
  { value: "lump", label: "一時金（退職所得）" },
  { value: "annuity", label: "年金（分割で受取）" },
];

const NEW_RE = (): RealEstate => ({
  name: "新しい物件",
  rent: 0,
  cost: 0,
  propTax: 0,
  bal: 0,
  rate: 1.0,
  term: 20,
  start: 35,
  propType: "mansion",
  structure: "rc",
  builtYear: new Date().getFullYear() - 5,
  purchasePrice: 0,
  landRatio: 30,
  currentValueOverride: 0,
});

function Quad({
  bal,
  setBal,
  r,
  setR,
  saveM,
  setSaveM,
  saveEnd,
  setSaveEnd,
}: {
  bal: number;
  setBal: (v: number) => void;
  r: number;
  setR: (v: number) => void;
  saveM: number;
  setSaveM: (v: number) => void;
  saveEnd: number;
  setSaveEnd: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberField label="残高（時価）" value={bal} onChange={setBal} unit="円" />
      <PercentField label="想定利回り(年)" value={r} onChange={setR} />
      <NumberField label="積立(月)" value={saveM} onChange={setSaveM} unit="円" />
      <NumberField label="積立終了" value={saveEnd} onChange={setSaveEnd} unit="歳" />
    </div>
  );
}

// 口座ごとの色帯ヘッダー
function AccountBox({
  tone,
  title,
  note,
  children,
}: {
  tone: "green" | "gray" | "blue";
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  const c =
    tone === "green"
      ? { border: "#22863a40", bg: "#f0fff4", fg: "#22863a" }
      : tone === "blue"
        ? { border: "#1a6fa840", bg: "#eef6fc", fg: "#1a6fa8" }
        : { border: "#0a0a0a30", bg: "#f0f0ee", fg: "#0a0a0ab3" };
  return (
    <div className="overflow-hidden rounded-lg" style={{ border: `2px solid ${c.border}` }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-1.5" style={{ background: c.bg }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: c.fg }}>
          {title}
        </span>
        <span className="text-[9px] text-[#0a0a0a]/55">{note}</span>
      </div>
      <div className="flex flex-col gap-2 px-3 pt-2 pb-3">{children}</div>
    </div>
  );
}

// 使用率メーター（NISA生涯枠など）
function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (used / max) * 100));
  const over = used > max;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] font-bold text-[#0a0a0a]/70">
        <span>{label}</span>
        <span className="tabular-nums" style={{ color: over ? "#c8383a" : undefined }}>
          {fmtMan(used)} / {fmtMan(max)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#0a0a0a15" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: over ? "#c8383a" : "#22863a" }}
        />
      </div>
    </div>
  );
}

function Note({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <p
      className="text-[10px] leading-relaxed"
      style={{ color: warn ? "#c8383a" : "#0a0a0a8c", fontWeight: warn ? 700 : 400 }}
    >
      {children}
    </p>
  );
}

export function AssetsMegaSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const updateRe = (i: number, patch: Partial<RealEstate>) =>
    setField("res", plan.res.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRe = () => setField("res", [...plan.res, NEW_RE()]);
  const removeRe = (i: number) => setField("res", plan.res.filter((_, idx) => idx !== i));

  const totalBal =
    plan.cashBal + plan.nisaBal + plan.tokuBal + plan.cryptoBal + plan.goldBal + plan.dcBal;

  // NISA: 生涯枠の消化状況と、枠を使い切る年齢
  const nisaCostNow = plan.nisaCost > 0 ? plan.nisaCost : plan.nisaBal;
  const nisaYearOver = plan.nisaTsumitateM > 100_000 || plan.nisaGrowthM > 200_000;
  const nisaFullAge = (() => {
    const perYear =
      Math.min(plan.nisaTsumitateM * 12, 1_200_000) + Math.min(plan.nisaGrowthM * 12, 2_400_000);
    if (perYear <= 0) return null;
    const years = Math.ceil(Math.max(0, 18_000_000 - nisaCostNow) / perYear);
    const age = plan.curAge + years;
    return age < plan.nisaEndAge ? age : null;
  })();

  // iDeCo・DC の掛金上限
  const thisYear = new Date().getFullYear();
  const dcLimitNow = dcSelfLimit(plan.dcType, plan.dcEmployerM, thisYear);
  const dcLimitNew = dcSelfLimit(plan.dcType, plan.dcEmployerM, Math.max(2027, thisYear));
  const dcOver = plan.saveDcM > dcLimitNew.selfMax || plan.saveDcM > dcLimitNow.selfMax;

  return (
    <Section
      id="ch-assets"
      no="03"
      title="資産・運用"
      description="現金・NISA・特定口座・iDeCo/DC・暗号資産・金 / 不動産投資"
      status={totalBal > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-2">
        <CollapsibleSubGroup title="現金・預金">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="残高"
              value={plan.cashBal}
              onChange={(v) => setField("cashBal", v)}
              unit="円"
            />
            <PercentField
              label="金利(年)"
              hint="普通預金0.2%前後。利息は20.315%引かれて計算"
              value={plan.cashRate * 100}
              onChange={(v) => setField("cashRate", v / 100)}
            />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="NISA口座（非課税）">
          <AccountBox tone="green" title="NISA" note="運用益・売却益が一生非課税。投信も株もここでまとめて入力">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="残高（時価）"
                value={plan.nisaBal}
                onChange={(v) => setField("nisaBal", v)}
                unit="円"
              />
              <NumberField
                label="これまでの投資額（簿価）"
                value={plan.nisaCost}
                onChange={(v) => setField("nisaCost", v)}
                unit="円"
                hint="生涯枠1,800万の残りの計算に使用。空欄=残高と同じ"
              />
              <NumberField
                label="つみたて投資枠(月)"
                value={plan.nisaTsumitateM}
                onChange={(v) => setField("nisaTsumitateM", v)}
                unit="円"
                hint="上限 月10万（年120万）"
              />
              <NumberField
                label="成長投資枠(月)"
                value={plan.nisaGrowthM}
                onChange={(v) => setField("nisaGrowthM", v)}
                unit="円"
                hint="上限 月20万（年240万）。個別株もこちら"
              />
              <PercentField
                label="想定利回り(年)"
                value={plan.nisaR}
                onChange={(v) => setField("nisaR", v)}
                hint="全世界株インデックス中心なら4〜5%が目安"
              />
              <NumberField
                label="積立終了"
                value={plan.nisaEndAge}
                onChange={(v) => setField("nisaEndAge", v)}
                unit="歳"
              />
            </div>
            <Meter label="生涯枠（簿価）の使用状況" used={nisaCostNow} max={18_000_000} />
            {nisaYearOver ? (
              <Note warn>
                年間枠を超えています（つみたて月10万・成長月20万まで）。超えた分は
                {plan.nisaOverflowToToku ? "特定口座" : "現金のまま"}として計算します。
              </Note>
            ) : null}
            {nisaFullAge ? (
              <Note>
                このペースだと{nisaFullAge}歳ごろに生涯枠1,800万を使い切ります。以降は
                {plan.nisaOverflowToToku ? "特定口座に積み立てる" : "積み立てない"}計算です。
              </Note>
            ) : null}
            <CheckboxField
              label="NISA枠を超えた積立は特定口座で続ける"
              value={plan.nisaOverflowToToku}
              onChange={(v) => setField("nisaOverflowToToku", v)}
            />
          </AccountBox>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="特定口座（課税）" defaultOpen={false}>
          <AccountBox tone="gray" title="特定口座・一般口座" note="売却したときに、利益部分へ20.315%">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="残高（時価）"
                value={plan.tokuBal}
                onChange={(v) => setField("tokuBal", v)}
                unit="円"
              />
              <NumberField
                label="取得額（元本）"
                value={plan.tokuCost}
                onChange={(v) => setField("tokuCost", v)}
                unit="円"
                hint="含み益の計算に使用。空欄=残高と同じ"
              />
              <NumberField
                label="積立(月)"
                value={plan.saveTokuM}
                onChange={(v) => setField("saveTokuM", v)}
                unit="円"
              />
              <NumberField
                label="積立終了"
                value={plan.saveTokuEndAge}
                onChange={(v) => setField("saveTokuEndAge", v)}
                unit="歳"
              />
              <PercentField
                label="想定利回り(年)"
                value={plan.tokuR}
                onChange={(v) => setField("tokuR", v)}
              />
            </div>
            <Note>
              税金は「売ったとき」に利益部分だけにかかります（毎年の運用益には課税しない計算）。NISAに空きがあるなら、新しい積立はNISAが先です。
            </Note>
          </AccountBox>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="iDeCo・企業型DC（確定拠出年金）" defaultOpen={false}>
          <AccountBox tone="blue" title="確定拠出年金" note="掛金は全額所得控除。60〜75歳の間に一時金か年金で受け取る">
            <SelectField
              label="あなたの区分（掛金の上限が決まる）"
              value={plan.dcType}
              onChange={(v) => setField("dcType", v)}
              options={DC_TYPE_OPTIONS}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="残高（時価）"
                value={plan.dcBal}
                onChange={(v) => setField("dcBal", v)}
                unit="円"
              />
              <PercentField
                label="想定利回り(年)"
                value={plan.dcR}
                onChange={(v) => setField("dcR", v)}
              />
              <NumberField
                label="自分で出す掛金(月)"
                value={plan.saveDcM}
                onChange={(v) => setField("saveDcM", v)}
                unit="円"
                hint="iDeCo・マッチング拠出。手取りから出る"
              />
              <NumberField
                label="会社が出す掛金(月)"
                value={plan.dcEmployerM}
                onChange={(v) => setField("dcEmployerM", v)}
                unit="円"
                hint="企業型DCの事業主掛金。手取りは減らない"
              />
              <NumberField
                label="加入した年齢"
                value={plan.dcJoinAge}
                onChange={(v) => setField("dcJoinAge", v)}
                unit="歳"
                hint="受取時の退職所得控除の年数に使う"
              />
              <NumberField
                label="掛金をやめる年齢"
                value={plan.saveDcEndAge}
                onChange={(v) => setField("saveDcEndAge", v)}
                unit="歳"
                hint="iDeCoは70歳未満まで（2026年12月〜）"
              />
            </div>
            <div
              className="rounded-md px-2.5 py-1.5 text-[10px] leading-relaxed"
              style={{ background: dcOver ? "#fff1f1" : "#f0f0ee", color: dcOver ? "#c8383a" : "#0a0a0ab3" }}
            >
              上限（2027年〜）: {dcLimitNew.note}
              {dcLimitNew.note !== dcLimitNow.note ? <><br />2026年11月掛金分まで: {dcLimitNow.note}</> : null}
              {dcOver ? <><br />→ 上限を超える分は計算に入れていません</> : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="受取開始年齢"
                value={plan.dcStartAge}
                onChange={(v) => setField("dcStartAge", v)}
                unit="歳"
                min={60}
                max={75}
                hint="60〜75歳。加入10年未満だと60歳から受け取れない場合あり"
              />
              <SelectField
                label="受け取り方"
                value={plan.dcMethod}
                onChange={(v) => setField("dcMethod", v)}
                options={DC_METHOD_OPTIONS}
              />
              {plan.dcMethod === "annuity" ? (
                <NumberField
                  label="受取年数"
                  value={plan.dcYears}
                  onChange={(v) => setField("dcYears", v)}
                  unit="年"
                  min={5}
                  max={20}
                  hint="5〜20年"
                />
              ) : null}
            </div>
            <Note>
              一時金は「退職所得」として退職金と同じ控除が使えます。ただし退職金との受取間隔が近いと控除が減ります（DC一時金→退職金は10年、退職金→DC一時金は20年空けると調整なし）。年金で受け取ると公的年金と合算して課税されます。
            </Note>
          </AccountBox>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="暗号資産" defaultOpen={false}>
          <Quad
            bal={plan.cryptoBal}
            setBal={(v) => setField("cryptoBal", v)}
            r={plan.cryptoR}
            setR={(v) => setField("cryptoR", v)}
            saveM={plan.saveCryptoM}
            setSaveM={(v) => setField("saveCryptoM", v)}
            saveEnd={plan.saveCryptoEndAge}
            setSaveEnd={(v) => setField("saveCryptoEndAge", v)}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NumberField
              label="取得額（元本）"
              value={plan.cryptoCost}
              onChange={(v) => setField("cryptoCost", v)}
              unit="円"
              hint="空欄=残高と同じ"
            />
            <PercentField
              label="売却益の税率（2027年まで）"
              value={plan.cryptoTaxRate}
              onChange={(v) => setField("cryptoTaxRate", v)}
              step={1}
              hint="現在は雑所得で総合課税（15〜55%）"
            />
          </div>
          <div className="mt-2">
            <Note>
              2026年度税制改正で、登録済みの暗号資産は20.315%の分離課税に移る予定です（金商法改正の施行後、早くて2028年から）。2028年以降の売却は20.315%で計算しています。
            </Note>
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="金・コモディティ" defaultOpen={false}>
          <Quad
            bal={plan.goldBal}
            setBal={(v) => setField("goldBal", v)}
            r={plan.goldR}
            setR={(v) => setField("goldR", v)}
            saveM={plan.saveGoldM}
            setSaveM={(v) => setField("saveGoldM", v)}
            saveEnd={plan.saveGoldEndAge}
            setSaveEnd={(v) => setField("saveGoldEndAge", v)}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NumberField
              label="取得額（元本）"
              value={plan.goldCost}
              onChange={(v) => setField("goldCost", v)}
              unit="円"
              hint="空欄=残高と同じ"
            />
          </div>
          <div className="mt-2">
            <Note>
              金ETFなどを想定し、売却益に20.315%で計算します（現物の金は総合課税で、5年超保有なら利益の1/2に課税）。
            </Note>
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="不動産投資" defaultOpen={false}>
          <div className="flex flex-col gap-3">
            {plan.res.map((r, i) => {
              const currentYear = new Date().getFullYear();
              const estimatedValue = computeRealEstateValue(r, currentYear);
              const propType = r.propType ?? "mansion";
              const isHouse = propType === "house";
              const isLand = propType === "land";
              const useOverride = (r.currentValueOverride ?? 0) > 0;
              return (
                <ListItemCard
                  key={i}
                  kicker={`PROPERTY ${String(i + 1).padStart(2, "0")}`}
                  onRemove={() => removeRe(i)}
                >
                  <div className="flex flex-col gap-2">
                    <TextField
                      label="名称"
                      value={r.name}
                      onChange={(v) => updateRe(i, { name: v })}
                    />

                    {/* 物件種別・構造 */}
                    <div className="grid grid-cols-2 gap-2">
                      <SelectField
                        label="物件種別"
                        value={propType}
                        onChange={(v) => updateRe(i, { propType: v })}
                        options={PROP_TYPE_OPTIONS}
                      />
                      {isHouse ? (
                        <SelectField
                          label="建物構造"
                          value={r.structure ?? "rc"}
                          onChange={(v) => updateRe(i, { structure: v })}
                          options={STRUCTURE_OPTIONS}
                        />
                      ) : (
                        <div />
                      )}
                    </div>

                    {/* 評価額算定 */}
                    {!isLand && (
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField
                          label="築年（西暦）"
                          value={r.builtYear ?? currentYear}
                          onChange={(v) => updateRe(i, { builtYear: v })}
                          unit="年"
                          hint={`築${Math.max(0, currentYear - (r.builtYear ?? currentYear))}年`}
                        />
                        <NumberField
                          label="購入価格"
                          value={r.purchasePrice ?? 0}
                          onChange={(v) => updateRe(i, { purchasePrice: v })}
                          unit="円"
                          hint="諸費用込みの取得時総額"
                        />
                      </div>
                    )}
                    {isLand && (
                      <NumberField
                        label="購入価格"
                        value={r.purchasePrice ?? 0}
                        onChange={(v) => updateRe(i, { purchasePrice: v })}
                        unit="円"
                        hint="土地の購入価格"
                      />
                    )}

                    {isHouse && (
                      <NumberField
                        label="土地価格比率"
                        value={r.landRatio ?? 30}
                        onChange={(v) => updateRe(i, { landRatio: v })}
                        unit="%"
                        hint="購入価格のうち土地が占める割合（残りが建物）"
                      />
                    )}

                    {/* 推定評価額表示 + 手動上書き */}
                    <div
                      className="rounded-lg p-2"
                      style={{ background: useOverride ? "#fff8e7" : "#f0fff4", border: `1.5px solid ${useOverride ? "#d4a017" : "#22863a"}40` }}
                    >
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: useOverride ? "#a07900" : "#22863a" }}>
                          {useOverride ? "現在評価額（手動指定）" : "推定現在評価額"}
                        </span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: useOverride ? "#a07900" : "#22863a" }}>
                          {fmtMan(estimatedValue)}
                        </span>
                      </div>
                      <NumberField
                        label="現在評価額（手動上書き・空欄=自動）"
                        value={r.currentValueOverride ?? 0}
                        onChange={(v) => updateRe(i, { currentValueOverride: v })}
                        unit="円"
                        hint={
                          isLand
                            ? "土地は経年劣化なし。市場変動を反映したい場合のみ入力"
                            : isHouse
                              ? "戸建ての場合、土地は維持・建物は構造別の耐用年数で減価"
                              : "マンションは実勢相場ベースの減価カーブ（築40年で40%、その後30%が床）"
                        }
                      />
                    </div>

                    {/* 収支 */}
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="家賃収入(月)"
                        value={r.rent}
                        onChange={(v) => updateRe(i, { rent: v })}
                        unit="円"
                        hint="物件全体の月額家賃"
                      />
                      <NumberField
                        label="管理費＋修繕積立費(年)"
                        value={r.cost}
                        onChange={(v) => updateRe(i, { cost: v })}
                        unit="円"
                        hint="区分マンション等の管理組合費"
                      />
                    </div>
                    <NumberField
                      label="固定資産税(年)"
                      value={r.propTax ?? 0}
                      onChange={(v) => updateRe(i, { propTax: v })}
                      unit="円"
                      hint="土地＋家屋の年間固定資産税・都市計画税"
                    />

                    {/* ローン */}
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="ローン残高"
                        value={r.bal}
                        onChange={(v) => updateRe(i, { bal: v })}
                        unit="円"
                      />
                      <PercentField
                        label="金利"
                        value={r.rate}
                        onChange={(v) => updateRe(i, { rate: v })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="ローン期間"
                        value={r.term}
                        onChange={(v) => updateRe(i, { term: v })}
                        unit="年"
                      />
                      <NumberField
                        label="開始年齢"
                        value={typeof r.start === "number" ? r.start : Number(r.start) || 0}
                        onChange={(v) => updateRe(i, { start: v })}
                        unit="歳"
                        hint="運用開始年齢"
                      />
                    </div>
                  </div>
                </ListItemCard>
              );
            })}
            <AddButton label="物件を追加" onClick={addRe} />
          </div>
        </CollapsibleSubGroup>

      </div>
    </Section>
  );
}
