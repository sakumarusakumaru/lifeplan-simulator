"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { PercentField } from "@/components/inputs/PercentField";
import { Section } from "@/components/Section";
import type { DrawAsset } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const DRAW_LABEL: Record<DrawAsset, string> = {
  f: "投信",
  s: "株",
  k: "仮想通貨",
  g: "金・コモディティ",
  dc: "確定拠出年金",
};

export function AssetsSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const moveCustom = (i: number, dir: -1 | 1) => {
    const order = [...plan.drawCustomOrder];
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setField("drawCustomOrder", order);
  };

  return (
    <Section
      id="ch-04"
      no="04"
      title="資産"
      description="現金・投信・株・暗号資産・確定拠出年金（DC）"
      status={
        plan.cashBal + plan.fundBal + plan.stockBal + plan.cryptoBal + plan.dcBal > 0
          ? "entered"
          : "default"
      }
    >
      <div className="flex flex-col gap-6">
        {/* 現金 */}
        <SubGroup title="現金">
          <div className="grid grid-cols-1 gap-2">
            <NumberField label="残高" value={plan.cashBal} onChange={(v) => setField("cashBal", v)} unit="円" />
            <PercentField
              label="利息(年)"
              value={plan.cashRate * 100}
              onChange={(v) => setField("cashRate", v / 100)}
            />
          </div>
        </SubGroup>

        {/* 投信 */}
        <SubGroup title="投信">
          <Quad
            bal={plan.fundBal} setBal={(v) => setField("fundBal", v)}
            r={plan.fundR} setR={(v) => setField("fundR", v)}
            saveM={plan.saveFundM} setSaveM={(v) => setField("saveFundM", v)}
            saveEnd={plan.saveFundEndAge} setSaveEnd={(v) => setField("saveFundEndAge", v)}
          />
        </SubGroup>

        {/* 株 */}
        <SubGroup title="株">
          <Quad
            bal={plan.stockBal} setBal={(v) => setField("stockBal", v)}
            r={plan.stockR} setR={(v) => setField("stockR", v)}
            saveM={plan.saveStockM} setSaveM={(v) => setField("saveStockM", v)}
            saveEnd={plan.saveStockEndAge} setSaveEnd={(v) => setField("saveStockEndAge", v)}
          />
        </SubGroup>

        {/* 仮想通貨 */}
        <SubGroup title="仮想通貨">
          <Quad
            bal={plan.cryptoBal} setBal={(v) => setField("cryptoBal", v)}
            r={plan.cryptoR} setR={(v) => setField("cryptoR", v)}
            saveM={plan.saveCryptoM} setSaveM={(v) => setField("saveCryptoM", v)}
            saveEnd={plan.saveCryptoEndAge} setSaveEnd={(v) => setField("saveCryptoEndAge", v)}
          />
        </SubGroup>

        {/* DC */}
        <SubGroup title="確定拠出年金 (DC)">
          <Quad
            bal={plan.dcBal} setBal={(v) => setField("dcBal", v)}
            r={plan.dcR} setR={(v) => setField("dcR", v)}
            saveM={plan.saveDcM} setSaveM={(v) => setField("saveDcM", v)}
            saveEnd={plan.saveDcEndAge} setSaveEnd={(v) => setField("saveDcEndAge", v)}
          />
          <div className="mt-2 text-[11px] font-medium text-[#0a0a0a]/55">
            ※ 60歳までは取り崩しの対象外
          </div>
        </SubGroup>

        {/* 取り崩し順序のカスタム並べ替え */}
        {plan.drawOrder === "custom" ? (
          <SubGroup title="取り崩し順序（カスタム）">
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
          </SubGroup>
        ) : null}

        <NumberField
          label="最低現金（これを下回ると資産取り崩し）"
          value={plan.cashFloor}
          onChange={(v) => setField("cashFloor", v)}
          unit="円"
          className="sm:max-w-md"
        />
      </div>
    </Section>
  );
}

function Quad({
  bal, setBal, r, setR, saveM, setSaveM, saveEnd, setSaveEnd,
}: {
  bal: number; setBal: (v: number) => void;
  r: number; setR: (v: number) => void;
  saveM: number; setSaveM: (v: number) => void;
  saveEnd: number; setSaveEnd: (v: number) => void;
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

function SubGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
        — {title}
      </div>
      {children}
    </div>
  );
}
