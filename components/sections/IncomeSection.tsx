"use client";

import { NumberField } from "@/components/inputs/NumberField";
import { TextField } from "@/components/inputs/TextField";
import { AddButton, ListItemCard } from "@/components/ListItemCard";
import { Section } from "@/components/Section";
import type { Job, SideJob } from "@/lib/calc/types";
import { usePlanStore } from "@/store/plan-store";

const NEW_JOB = (): Job => ({
  name: "新しい勤務先",
  start: 30,
  end: 60,
  inc: 0,
  raise: 0,
  sev: 0,
  sevAge: 60,
});

const NEW_SIDE_JOB = (): SideJob => ({
  name: "新しい副業",
  start: 30,
  end: 60,
  inc: 0,
});

export function IncomeSection() {
  const plan = usePlanStore((s) => s.plan);
  const setField = usePlanStore((s) => s.setField);

  const updateJob = (i: number, patch: Partial<Job>) =>
    setField("jobs", plan.jobs.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  const addJob = () => setField("jobs", [...plan.jobs, NEW_JOB()]);
  const removeJob = (i: number) => setField("jobs", plan.jobs.filter((_, idx) => idx !== i));

  const updateSide = (i: number, patch: Partial<SideJob>) =>
    setField("sideJobs", plan.sideJobs.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  const addSide = () => setField("sideJobs", [...plan.sideJobs, NEW_SIDE_JOB()]);
  const removeSide = (i: number) => setField("sideJobs", plan.sideJobs.filter((_, idx) => idx !== i));

  return (
    <Section
      id="ch-02"
      no="02"
      title="収入"
      description="勤務先・副業"
      status={plan.jobs.length > 0 ? "entered" : "default"}
    >
      <div className="flex flex-col gap-6">
        <SubGroup title="勤務先">
          <div className="flex flex-col gap-3">
            {plan.jobs.map((j, i) => (
              <ListItemCard
                key={i}
                kicker={`JOB ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeJob(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField label="名称" value={j.name} onChange={(v) => updateJob(i, { name: v })} />
                  <NumberField label="年収" value={j.inc} onChange={(v) => updateJob(i, { inc: v })} unit="円" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField label="開始年齢" value={j.start} onChange={(v) => updateJob(i, { start: v })} unit="歳" />
                    <NumberField label="終了年齢" value={j.end} onChange={(v) => updateJob(i, { end: v })} unit="歳" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField label="退職金" value={j.sev} onChange={(v) => updateJob(i, { sev: v })} unit="円" />
                    <NumberField label="退職金 受取年齢" value={j.sevAge} onChange={(v) => updateJob(i, { sevAge: v })} unit="歳" />
                  </div>
                </div>
              </ListItemCard>
            ))}
            <AddButton label="勤務先を追加" onClick={addJob} />
          </div>
        </SubGroup>

        <SubGroup title="副業">
          <div className="flex flex-col gap-3">
            {plan.sideJobs.map((j, i) => (
              <ListItemCard
                key={i}
                kicker={`SIDE ${String(i + 1).padStart(2, "0")}`}
                onRemove={() => removeSide(i)}
              >
                <div className="grid grid-cols-1 gap-2">
                  <TextField label="名称" value={j.name} onChange={(v) => updateSide(i, { name: v })} />
                  <NumberField label="年収" value={j.inc} onChange={(v) => updateSide(i, { inc: v })} unit="円" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:grid-cols-2">
                    <NumberField label="開始年齢" value={j.start} onChange={(v) => updateSide(i, { start: v })} unit="歳" />
                    <NumberField label="終了年齢" value={j.end} onChange={(v) => updateSide(i, { end: v })} unit="歳" />
                  </div>
                </div>
              </ListItemCard>
            ))}
            <AddButton label="副業を追加" onClick={addSide} />
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
