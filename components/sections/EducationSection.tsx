"use client";

import { CheckboxField } from "@/components/inputs/CheckboxField";
import { DateField } from "@/components/inputs/DateField";
import { NumberField } from "@/components/inputs/NumberField";
import { SelectField } from "@/components/inputs/SelectField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import { kidAge, kidOffset } from "@/lib/calc/age";
import type { Kid, SchoolType } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const SCHOOL_OPTIONS = [
  { value: "pub" as SchoolType, label: "公立" },
  { value: "pri" as SchoolType, label: "私立" },
] as const;

const NEW_KID = (): Kid => ({
  name: "新しい子",
  birth: "",
  offset: 0,
  s: { k: "pub", e: "pub", j: "pub", h: "pub", u: "pub" },
  opt: { ronin: false, grad: false, dormU: false, dormG: false, send: 0 },
});

export function EducationSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const updateKid = (i: number, patch: Partial<Kid>) => {
    const kids = plan.kids.map((k, idx) => (idx === i ? { ...k, ...patch } : k));
    if (patch.birth !== undefined) {
      kids[i] = { ...kids[i], offset: kidOffset(plan.selfBirth, plan.baseDate, patch.birth) };
    }
    setField("kids", kids);
  };
  const addKid = () => setField("kids", [...plan.kids, NEW_KID()]);
  const removeKid = (i: number) => setField("kids", plan.kids.filter((_, idx) => idx !== i));

  const updateStage = (i: number, key: keyof Kid["s"], value: SchoolType) => {
    const kid = plan.kids[i];
    updateKid(i, { s: { ...kid.s, [key]: value } });
  };
  const updateOpt = <K extends keyof Kid["opt"]>(i: number, key: K, value: Kid["opt"][K]) => {
    const kid = plan.kids[i];
    updateKid(i, { opt: { ...kid.opt, [key]: value } });
  };

  return (
    <Section
      id="ch-05"
      no="05"
      title="教育費"
      description="学校・塾・大学・下宿"
      status={plan.kids.length > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-6">
        <SubGroup title="塾の月額（万円換算前の円）">
          <div className="grid grid-cols-1 gap-3 grid-cols-1">
            <NumberField label="幼児(3-5)" value={plan.jukuM.pre} onChange={(v) => setField("jukuM", { ...plan.jukuM, pre: v })} unit="円" />
            <NumberField label="小1-3" value={plan.jukuM.e13} onChange={(v) => setField("jukuM", { ...plan.jukuM, e13: v })} unit="円" />
            <NumberField label="小4-6" value={plan.jukuM.e46} onChange={(v) => setField("jukuM", { ...plan.jukuM, e46: v })} unit="円" />
            <NumberField label="中学" value={plan.jukuM.jh} onChange={(v) => setField("jukuM", { ...plan.jukuM, jh: v })} unit="円" />
            <NumberField label="高校" value={plan.jukuM.hs} onChange={(v) => setField("jukuM", { ...plan.jukuM, hs: v })} unit="円" />
            <NumberField label="浪人" value={plan.jukuM.ronin} onChange={(v) => setField("jukuM", { ...plan.jukuM, ronin: v })} unit="円" />
          </div>
        </SubGroup>

        <SubGroup title="お子さま">
          <div className="flex flex-col gap-3">
            {plan.kids.map((k, i) => {
              const ca = kidAge(k.birth, plan.baseDate);
              return (
                <ListItemCard
                  key={i}
                  kicker={`KID ${String(i + 1).padStart(2, "0")}`}
                  onRemove={() => removeKid(i)}
                >
                  <div className="grid grid-cols-1 gap-2">
                    <TextField label="名前" value={k.name} onChange={(v) => updateKid(i, { name: v })} />
                    <DateField label="生年月日" value={k.birth} onChange={(v) => updateKid(i, { birth: v })} />
                    <NumberField label="現在年齢" value={ca ?? 0} onChange={() => {}} unit="歳" hint="生年月日から自動" />
                    <NumberField label="仕送り(月)" value={k.opt.send} onChange={(v) => updateOpt(i, "send", v)} unit="円" />
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                      — 進学プラン
                    </div>
                    <div className="grid grid-cols-1 gap-3 grid-cols-1">
                      <SelectField label="幼" value={k.s.k} onChange={(v) => updateStage(i, "k", v)} options={SCHOOL_OPTIONS} />
                      <SelectField label="小" value={k.s.e} onChange={(v) => updateStage(i, "e", v)} options={SCHOOL_OPTIONS} />
                      <SelectField label="中" value={k.s.j} onChange={(v) => updateStage(i, "j", v)} options={SCHOOL_OPTIONS} />
                      <SelectField label="高" value={k.s.h} onChange={(v) => updateStage(i, "h", v)} options={SCHOOL_OPTIONS} />
                      <SelectField label="大" value={k.s.u} onChange={(v) => updateStage(i, "u", v)} options={SCHOOL_OPTIONS} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66666a]">
                      — オプション
                    </div>
                    <div className="grid grid-cols-1 gap-2 grid-cols-1">
                      <CheckboxField label="浪人" value={k.opt.ronin} onChange={(v) => updateOpt(i, "ronin", v)} />
                      <CheckboxField label="大学院" value={k.opt.grad} onChange={(v) => updateOpt(i, "grad", v)} />
                      <CheckboxField label="下宿(大)" value={k.opt.dormU} onChange={(v) => updateOpt(i, "dormU", v)} />
                      <CheckboxField label="下宿(院)" value={k.opt.dormG} onChange={(v) => updateOpt(i, "dormG", v)} />
                    </div>
                  </div>
                </ListItemCard>
              );
            })}
            <AddButton label="お子さまを追加" onClick={addKid} />
          </div>
        </SubGroup>
      </div>
    </Section>
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
