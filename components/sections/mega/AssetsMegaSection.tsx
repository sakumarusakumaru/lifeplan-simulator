"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { SelectField } from "@/components/inputs/SelectField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { CollapsibleSubGroup } from "@/components/CollapsibleSubGroup";
import { Section } from "@/components/Section";
import { computeRealEstateValue } from "@/lib/calc/finance";
import type {
  BuildingStructure,
  DrawAsset,
  RealEstate,
  RealEstateType,
} from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

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

const DRAW_LABEL: Record<DrawAsset, string> = {
  f: "投信(課税)",
  s: "株(課税)",
  fNisa: "投信(NISA)",
  sNisa: "株(NISA)",
  k: "仮想通貨",
  g: "金・コモディティ",
  dc: "確定拠出年金",
};

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
      <NumberField label="残高" value={bal} onChange={setBal} unit="円" />
      <PercentField label="リターン(年)" value={r} onChange={setR} />
      <NumberField label="積立(月)" value={saveM} onChange={setSaveM} unit="円" />
      <NumberField label="積立終了" value={saveEnd} onChange={setSaveEnd} unit="歳" />
    </div>
  );
}

// 利回りを上位で共通指定するNISA/課税の入力（残高・月積立・積立終了の3項目）
function Pair({
  bal,
  setBal,
  saveM,
  setSaveM,
  saveEnd,
  setSaveEnd,
}: {
  bal: number;
  setBal: (v: number) => void;
  saveM: number;
  setSaveM: (v: number) => void;
  saveEnd: number;
  setSaveEnd: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <NumberField label="残高" value={bal} onChange={setBal} unit="円" />
      <NumberField label="積立(月)" value={saveM} onChange={setSaveM} unit="円" />
      <NumberField label="積立終了" value={saveEnd} onChange={setSaveEnd} unit="歳" />
    </div>
  );
}

export function AssetsMegaSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const updateRe = (i: number, patch: Partial<RealEstate>) =>
    setField("res", plan.res.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRe = () => setField("res", [...plan.res, NEW_RE()]);
  const removeRe = (i: number) => setField("res", plan.res.filter((_, idx) => idx !== i));

  const moveCustom = (i: number, dir: -1 | 1) => {
    const order = [...plan.drawCustomOrder];
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setField("drawCustomOrder", order);
  };

  const totalBal =
    plan.cashBal +
    plan.fundBal +
    plan.fundNisaBal +
    plan.stockBal +
    plan.stockNisaBal +
    plan.cryptoBal +
    plan.goldBal +
    plan.dcBal;

  return (
    <Section
      id="ch-assets"
      no="03"
      title="資産・運用"
      description="現金・投信・株・DC・仮想通貨・金 / 不動産投資"
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
              label="利息(年)"
              value={plan.cashRate * 100}
              onChange={(v) => setField("cashRate", v / 100)}
            />
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="投信（NISA / 課税）">
          {/* 共通の利回り */}
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <PercentField
              label="想定利回り(年・共通)"
              value={plan.fundR}
              onChange={(v) => setField("fundR", v)}
            />
          </div>

          {/* NISA（非課税）— 緑帯 */}
          <div
            className="mb-3 overflow-hidden rounded-lg"
            style={{ border: "2px solid #22863a40" }}
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ background: "#f0fff4" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#22863a]">
                NISA口座（非課税）
              </span>
              <span className="text-[9px] text-[#0a0a0a]/55">
                つみたて枠 月10万 / 成長枠 月20万 / 生涯1,800万円まで
              </span>
            </div>
            <div className="px-3 pt-2 pb-3">
              <Pair
                bal={plan.fundNisaBal}
                setBal={(v) => setField("fundNisaBal", v)}
                saveM={plan.saveFundNisaM}
                setSaveM={(v) => setField("saveFundNisaM", v)}
                saveEnd={plan.saveFundNisaEndAge}
                setSaveEnd={(v) => setField("saveFundNisaEndAge", v)}
              />
            </div>
          </div>

          {/* 課税口座 — グレー帯 */}
          <div
            className="overflow-hidden rounded-lg"
            style={{ border: "2px solid #0a0a0a30" }}
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ background: "#f0f0ee" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]/70">
                課税口座（特定口座等）
              </span>
              <span className="text-[9px] text-[#0a0a0a]/55">
                譲渡益・分配金に20.315%課税
              </span>
            </div>
            <div className="px-3 pt-2 pb-3">
              <Pair
                bal={plan.fundBal}
                setBal={(v) => setField("fundBal", v)}
                saveM={plan.saveFundM}
                setSaveM={(v) => setField("saveFundM", v)}
                saveEnd={plan.saveFundEndAge}
                setSaveEnd={(v) => setField("saveFundEndAge", v)}
              />
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[#0a0a0a]/55">
            ※ FP視点：非課税のNISAを優先的に活用し、つみたて枠（月10万）・成長枠（月20万）の合計年360万円・生涯1,800万円まで非課税で運用できます。
          </p>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="株（NISA / 課税）" defaultOpen={false}>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <PercentField
              label="想定利回り(年・共通)"
              value={plan.stockR}
              onChange={(v) => setField("stockR", v)}
            />
          </div>

          <div
            className="mb-3 overflow-hidden rounded-lg"
            style={{ border: "2px solid #22863a40" }}
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ background: "#f0fff4" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#22863a]">
                NISA口座（非課税）
              </span>
              <span className="text-[9px] text-[#0a0a0a]/55">
                成長投資枠で個別株・ETF も対象
              </span>
            </div>
            <div className="px-3 pt-2 pb-3">
              <Pair
                bal={plan.stockNisaBal}
                setBal={(v) => setField("stockNisaBal", v)}
                saveM={plan.saveStockNisaM}
                setSaveM={(v) => setField("saveStockNisaM", v)}
                saveEnd={plan.saveStockNisaEndAge}
                setSaveEnd={(v) => setField("saveStockNisaEndAge", v)}
              />
            </div>
          </div>

          <div
            className="overflow-hidden rounded-lg"
            style={{ border: "2px solid #0a0a0a30" }}
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ background: "#f0f0ee" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]/70">
                課税口座（特定口座等）
              </span>
              <span className="text-[9px] text-[#0a0a0a]/55">
                譲渡益・配当に20.315%課税
              </span>
            </div>
            <div className="px-3 pt-2 pb-3">
              <Pair
                bal={plan.stockBal}
                setBal={(v) => setField("stockBal", v)}
                saveM={plan.saveStockM}
                setSaveM={(v) => setField("saveStockM", v)}
                saveEnd={plan.saveStockEndAge}
                setSaveEnd={(v) => setField("saveStockEndAge", v)}
              />
            </div>
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="確定拠出年金 (DC)" defaultOpen={false}>
          <Quad
            bal={plan.dcBal}
            setBal={(v) => setField("dcBal", v)}
            r={plan.dcR}
            setR={(v) => setField("dcR", v)}
            saveM={plan.saveDcM}
            setSaveM={(v) => setField("saveDcM", v)}
            saveEnd={plan.saveDcEndAge}
            setSaveEnd={(v) => setField("saveDcEndAge", v)}
          />
          <div className="mt-2 text-[11px] font-medium text-[#0a0a0a]/55">
            ※ 60歳までは取り崩しの対象外（受給開始は60〜75歳の範囲で選択可、60歳まで非課税で運用継続）
          </div>
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="仮想通貨" defaultOpen={false}>
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
          <div className="mt-2 text-[11px] font-medium text-[#0a0a0a]/55">
            金ETF・現物金・コモディティファンドなど。参考: 長期年利3〜5%
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
