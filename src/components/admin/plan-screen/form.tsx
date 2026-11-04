"use client";
// 업무 일정 상세 폼(2026-11-04). 고른 줄 하나를 고친다 — 칸은 admin-form-rules(이름표 앞 *, 두 열 컴팩트, 설명 문구 없음).
// 하위가 있는 줄의 기간은 읽기 칸이다: 하위의 처음과 끝이라 여기서 고칠 값이 아니다.
// 진행률 칸을 비우면 자동(업무요청 끝난 비율, 하위 평균)이다. 0 과 빈칸을 가르려고 NumberField(빈칸 = 0) 대신 TextField 로 받는다.
import Link from "next/link";
import { CodeName, Field, FieldPair, FormSection, ReadValue } from "@/components/admin/screen/layout";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { Clamp } from "@/components/ui/tooltip";
import { useCodes } from "@/components/code-book";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { PLAN_KIND_LABEL, PLAN_TRACK_LABEL } from "@/lib/admin/messages/plan";
import { PLAN_PROGRESS_MAX, type PlanCard, type PlanItem, type PlanRow } from "@/lib/admin/plan";
import type { TaskAssignee } from "@/lib/admin/tasks";
import type { FieldErrors } from "@/lib/admin/validation";
import { adminTaskPath } from "@/lib/routes";

const NONE = "";

/** 공통코드가 비었을 때(읽기 실패) 기본 이름표로 고르기 칸을 세운다 */
function optionsOr(list: Array<{ value: string; label: string }>, fallback: Record<string, string>) {
  return list.length > 0 ? list : Object.entries(fallback).map(([value, label]) => ({ value, label }));
}

export function PlanForm({
  item,
  row,
  parents,
  assignees,
  errors,
  set,
}: {
  item: PlanItem;
  row: PlanRow | undefined;
  /** 상위로 고를 수 있는 줄(자기와 자기 하위, 이정표 뺀 것) */
  parents: PlanRow[];
  assignees: TaskAssignee[];
  errors: FieldErrors;
  set: (next: Partial<PlanItem>) => void;
}) {
  const codes = useCodes();
  const k = item.id;
  const group = !!row?.hasChildren;
  const pctNote = row ? (row.pctFrom === "cards" ? M.progressFrom.cards(row.cards.done, row.cards.total) : row.pctFrom === "manual" ? M.progressFrom.manual : row.pctFrom === "children" ? M.progressFrom.children : M.progressFrom.none) : "";

  return (
    <>
      <FormSection title={M.sectionBasic}>
        <Field label={M.fieldTitle} htmlFor={`pl-title-${k}`} required wide error={errors.title}>
          <CodeName code={row?.no ?? "-"}>
            <TextField id={`pl-title-${k}`} label={M.fieldTitle} hideLabel value={item.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} compact />
          </CodeName>
        </Field>
        <Field label={M.fieldParent} wide>
          <FormSelect
            name={`pl-parent-${k}`}
            label={M.fieldParent}
            hideLabel
            size="lg"
            value={item.parentId ?? NONE}
            onChange={(v) => set({ parentId: v || null })}
            options={[{ value: NONE, label: M.noParent }, ...parents.map((p) => ({ value: p.id, label: `${p.no} ${p.title}` }))]}
          />
        </Field>
        <Field label={M.fieldTrack} required>
          <FormSelect name={`pl-track-${k}`} label={M.fieldTrack} hideLabel size="lg" value={item.track} onChange={(v) => set({ track: v as PlanItem["track"] })} options={optionsOr(codes.options("PLAN_TRACK"), PLAN_TRACK_LABEL)} />
        </Field>
        <Field label={M.fieldKind} required>
          <FormSelect
            name={`pl-kind-${k}`}
            label={M.fieldKind}
            hideLabel
            size="lg"
            value={item.kind}
            // 하위가 있는 줄은 이정표가 될 수 없다 — 이정표는 날 하나라 하위를 품지 않는다
            disabled={group}
            onChange={(v) => set({ kind: v as PlanItem["kind"], endOn: v === "milestone" ? item.startOn : item.endOn })}
            options={optionsOr(codes.options("PLAN_KIND"), PLAN_KIND_LABEL)}
          />
        </Field>
        <Field label={M.fieldAssignee}>
          <FormSelect
            name={`pl-who-${k}`}
            label={M.fieldAssignee}
            hideLabel
            size="lg"
            value={item.assigneeId ?? NONE}
            onChange={(v) => set({ assigneeId: v || null })}
            options={[{ value: NONE, label: M.noAssignee }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </Field>
        <Field label={M.fieldOutput} htmlFor={`pl-out-${k}`}>
          <TextField id={`pl-out-${k}`} label={M.fieldOutput} hideLabel value={item.output ?? ""} onChange={(e) => set({ output: e.target.value || null })} error={errors.output} compact />
        </Field>
      </FormSection>

      <FormSection title={M.sectionSchedule}>
        {group ? (
          <Field label={M.fieldPeriod} wide>
            <ReadValue>
              {row?.start && row.end ? `${row.start} ~ ${row.end}` : "-"} <span className="text-dim">({M.groupPeriod})</span>
            </ReadValue>
          </Field>
        ) : item.kind === "milestone" ? (
          <Field label={M.fieldDate} required error={errors.startOn}>
            <DateField label={M.fieldDate} hideLabel size="sm" value={item.startOn} onChange={(v) => set({ startOn: v, endOn: v })} clearable={false} />
          </Field>
        ) : (
          <Field label={M.fieldPeriod} wide error={errors.endOn ?? errors.startOn}>
            <FieldPair
              from={<DateField label={M.colStart} hideLabel size="sm" value={item.startOn} onChange={(v) => set({ startOn: v, endOn: item.endOn ?? v })} />}
              to={<DateField label={M.colEnd} hideLabel size="sm" value={item.endOn} min={item.startOn} onChange={(v) => set({ endOn: v })} />}
            />
          </Field>
        )}
        <Field label={M.fieldProgress} htmlFor={`pl-pct-${k}`} error={errors.progress}>
          <div className="flex items-center gap-2">
            <TextField
              id={`pl-pct-${k}`}
              label={M.fieldProgress}
              hideLabel
              inputMode="numeric"
              placeholder={M.progressAuto}
              value={item.progress == null ? "" : String(item.progress)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                set({ progress: raw === "" ? null : Math.min(PLAN_PROGRESS_MAX, Number(raw)) });
              }}
              wrapperClassName="w-24"
              className="text-right tabular-nums"
              compact
            />
            <span className="whitespace-nowrap text-[13px] text-dim">
              {row?.pct ?? 0}% | {pctNote}
            </span>
          </div>
        </Field>
        <Field label={M.fieldMemo} htmlFor={`pl-memo-${k}`} wide>
          <TextField id={`pl-memo-${k}`} label={M.fieldMemo} hideLabel value={item.memo ?? ""} onChange={(e) => set({ memo: e.target.value || null })} error={errors.memo} compact />
        </Field>
      </FormSection>
    </>
  );
}

/** 이 일정 줄에 이은 업무요청 카드. 만들기는 저장한 줄에만 — 카드가 가리킬 행이 DB 에 있어야 한다 */
export function PlanCards({
  cards,
  saved,
  busy,
  onCreate,
  onUnlink,
}: {
  cards: PlanCard[];
  saved: boolean;
  busy: boolean;
  onCreate: () => void;
  onUnlink: (taskId: string) => void;
}) {
  const codes = useCodes();
  return (
    <FormSection
      title={M.sectionCards}
      action={
        <Button variant="soft" size="sm" onClick={onCreate} disabled={!saved || busy} loading={busy}>
          {M.cardCreate}
        </Button>
      }
    >
      {!saved ? (
        <p className="col-span-full text-[13px] text-dim">{M.cardsNeedSave}</p>
      ) : cards.length === 0 ? (
        <p className="col-span-full text-[13px] text-dim">{M.cardsEmpty}</p>
      ) : (
        <ul className="col-span-full flex flex-col divide-y divide-line rounded-lg border border-line">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
              <span className={c.status === "done" ? "shrink-0 font-semibold text-dim" : "shrink-0 font-semibold text-acc"}>{codes.name("TASK_STATUS", c.status)}</span>
              <Clamp className="min-w-0 flex-1">{c.title}</Clamp>
              <Link href={adminTaskPath(c.id)} className="shrink-0 font-semibold text-acc hover:underline">
                {M.cardOpen}
              </Link>
              <button type="button" onClick={() => onUnlink(c.id)} disabled={busy} className="press shrink-0 text-dim hover:text-danger">
                {M.cardUnlink}
              </button>
            </li>
          ))}
        </ul>
      )}
    </FormSection>
  );
}
