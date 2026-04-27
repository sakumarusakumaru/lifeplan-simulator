"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { CollapsibleSubGroup } from "@/components/CollapsibleSubGroup";
import { Section } from "@/components/Section";
import type { DrawAsset, RealEstate } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const DRAW_LABEL: Record<DrawAsset, string> = {
  f: "投信",
  s: "株",
  k: "仮想通貨",
  g: "金・コモディティ",
  dc: "確定拠出年金",
};

const NEW_RE = (): RealEstate => ({
  name: "新しい物件",
  rent: 0,
  cost: 0,
  bal: 0,
  rate: 1.0,
  term: 20,
  start: 35,
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <NumberField label="残高" value={bal} onChange={setBal} unit="円" />
      <PercentField label="リターン(年)" value={r} onChange={setR} />
      <NumberField label="積立(月)" value={saveM} onChange={setSaveM} unit="円" />
      <NumberField label="積立終了年齢" value={saveEnd} onChange={setSaveEnd} unit="歳" />
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
    plan.stockBal +
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
          <div className="grid grid-cols-1 gap-2">
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

        <CollapsibleSubGroup title="投信">
          <Quad
            bal={plan.fundBal}
            setBal={(v) => setField("fundBal", v)}
            r={plan.fundR}
            setR={(v) => setField("fundR", v)}
            saveM={plan.saveFundM}
            setSaveM={(v) => setField("saveFundM", v)}
            saveEnd={plan.saveFundEndAge}
            setSaveEnd={(v) => setField("saveFundEndAge", v)}
          />
        </CollapsibleSubGroup>

        <CollapsibleSubGroup title="株" defaultOpen={false}>
          <Quad
            bal={plan.stockBal}
            setBal={(v) => setField("stockBal", v)}
            r={plan.stockR}
            setR={(v) => setField("stockR", v)}
            saveM={plan.saveStockM}
            setSaveM={(v) => setField("saveStockM", v)}
            saveEnd={plan.saveStockEndAge}
            setSaveEnd={(v) => setField("saveStockEndAge", v)}
          />
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
            {plan.res.map((r, i) => (
              <ListItemCard
                key={i}
                kicker={`PROPERTY ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeRe(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField
                    label="名称"
                    value={r.name}
                    onChange={(v) => updateRe(i, { name: v })}
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField
                      label="家賃(月)"
                      value={r.rent}
                      onChange={(v) => updateRe(i, { rent: v })}
                      unit="円"
                    />
                    <NumberField
                      label="経費(年)"
                      value={r.cost}
                      onChange={(v) => updateRe(i, { cost: v })}
                      unit="円"
                    />
                  </div>
                  <NumberField
                    label="ローン残高"
                    value={r.bal}
                    onChange={(v) => updateRe(i, { bal: v })}
                    unit="円"
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <PercentField
                      label="金利"
                      value={r.rate}
                      onChange={(v) => updateRe(i, { rate: v })}
                    />
                    <NumberField
                      label="ローン期間"
                      value={r.term}
                      onChange={(v) => updateRe(i, { term: v })}
                      unit="年"
                    />
                  </div>
                  <NumberField
                    label="開始年齢"
                    value={typeof r.start === "number" ? r.start : Number(r.start) || 0}
                    onChange={(v) => updateRe(i, { start: v })}
                    unit="歳"
                  />
                </div>
              </ListItemCard>
            ))}
            <AddButton label="物件を追加" onClick={addRe} />
          </div>
        </CollapsibleSubGroup>

        {plan.drawOrder === "custom" ? (
          <CollapsibleSubGroup title="取り崩し順序（カスタム）">
            <div className="flex flex-col gap-2">
              {plan.drawCustomOrder.map((code, i) => (
                <div
                  key={code}
                  className="flex items-center gap-3 px-4 py-2"
                  style={{
                    background: "#ffffff",
                    border: "2.5px solid #0a0a0a",
                    borderRadius: 12,
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm font-bold text-[#0a0a0a]">
                    {DRAW_LABEL[code]}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveCustom(i, -1)}
                    disabled={i === 0}
                    className="px-3 py-1 text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#0a0a0a]"
                    style={{
                      border: "2.5px solid #0a0a0a",
                      borderRadius: 12,
                      background: "#f0f0ee",
                      color: "#0a0a0a",
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCustom(i, 1)}
                    disabled={i === plan.drawCustomOrder.length - 1}
                    className="px-3 py-1 text-xs font-bold transition-colors hover:bg-[#0a0a0a] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#0a0a0a]"
                    style={{
                      border: "2.5px solid #0a0a0a",
                      borderRadius: 12,
                      background: "#f0f0ee",
                      color: "#0a0a0a",
                    }}
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleSubGroup>
        ) : null}
      </div>
    </Section>
  );
}
