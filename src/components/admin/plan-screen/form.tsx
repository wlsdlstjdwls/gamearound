"use client";
// 일정 서랍의 칸(2026-11-04 4차). 노션의 속성 목록처럼 이름표 왼쪽, 값 오른쪽 한 줄씩 낮게 쌓는다 — 사용자 "스크롤 최대한 안 생기게, 필드 줄여도".
//
// FormSection(관리자 입력 묶음)을 쓰지 않는다: 그 상자는 overflow-hidden 이라, 서랍(<dialog>) 안에서 칸 옆에 붙어 펼쳐지는
// 달력, 고르기 목록(ui/select core, ui/date-field 의 inline 모드)이 상자 밖으로 나가는 순간 잘려 "화면 뒤로 가서 안 보였다"(사용자 실측).
// 상위 일정 칸은 걷었다(사용자 "상위 일정 고르는 것 자체가 이해가 안 된다") — 계층은 차트에서 손잡이를 끌어 다른 줄 가운데에 놓아 만든다.
// 진행률 칸을 비우면 자동(업무요청 끝난 비율, 하위 평균)이다. 0 과 빈칸을 가르려고 NumberField(빈칸 = 0) 대신 글자 칸으로 받는다.
import Link from "next/link";
import { DateField } from "@/components/ui/date-field";
import { FormSelect } from "@/components/ui/select/fields";
import { Clamp } from "@/components/ui/tooltip";
import { useCodes } from "@/components/code-book";
import { PLAN_MESSAGES as M, SCREEN_MESSAGES as SM } from "@/lib/admin/messages";
import { PLAN_KIND_LABEL } from "@/lib/admin/messages/plan";
import { PLAN_TRACK_GROUP, useTrackOptions } from "./track-color";
import { SlidersIcon } from "@/components/ui/icons";
import { ROUTES } from "@/lib/routes";
import { ProgramLink } from "@/components/admin/screen/program-link";
import { PLAN_PROGRESS_MAX, type PlanCard, type PlanItem, type PlanRow } from "@/lib/admin/plan";
import type { TaskAssignee } from "@/lib/admin/tasks";
import type { FieldErrors } from "@/lib/admin/validation";
import { cn } from "@/lib/cn";
import { adminTaskPath } from "@/lib/routes";

const NONE = "";
/** 글자 칸 모양. 고르기 칸(size sm)과 같은 높이로 맞춘다. 터치 기기는 16px 글자(iOS 확대 방지) */
const INPUT = "h-9 w-full min-w-0 rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3 text-[16px] text-ink outline-none transition-colors duration-fast hover:border-ink/30 focus:border-acc sm:text-[13.5px]";

/** 공통코드가 비었을 때(읽기 실패) 기본 이름표로 고르기 칸을 세운다 */
function optionsOr(list: Array<{ value: string; label: string }>, fallback: Record<string, string>) {
  return list.length > 0 ? list : Object.entries(fallback).map(([value, label]) => ({ value, label }));
}

/** 속성 한 줄: 이름표(필수면 앞에 빨간 *) + 값. 오류는 값 아래 한 줄 */
function Prop({ label, required, error, htmlFor, children }: { label: string; required?: boolean; error?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-x-3">
      <label htmlFor={htmlFor} className="flex h-9 items-center text-[13px] font-semibold text-dim">
        {required && (
          <span className="mr-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
        {label}
        {required && <span className="sr-only">{SM.required}</span>}
      </label>
      <div className="min-w-0">
        {children}
        {error && (
          <p role="alert" className="mt-1 text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function PlanForm({ item, row, assignees, errors, set }: { item: PlanItem; row: PlanRow | undefined; assignees: TaskAssignee[]; errors: FieldErrors; set: (next: Partial<PlanItem>) => void }) {
  const codes = useCodes();
  const tracks = useTrackOptions();
  const k = item.id;
  const group = !!row?.hasChildren;

  return (
    <div className="flex flex-col gap-2">
      {/* 제목은 노션 문서 제목처럼 크게, 테두리 없이 */}
      <div>
        <input
          id={`pl-title-${k}`}
          aria-label={M.fieldTitle}
          value={item.title}
          onChange={(e) => set({ title: e.target.value })}
          className="w-full rounded-md bg-transparent px-1 py-1 text-[20px] font-bold text-ink outline-none hover:bg-surface-2 focus:bg-surface-2"
        />
        {errors.title && <p role="alert" className="px-1 text-[12.5px] text-danger">{errors.title}</p>}
      </div>

      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <Prop label={M.fieldTrack} required>
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <FormSelect name={`pl-track-${k}`} label={M.fieldTrack} hideLabel size="sm" value={item.track} onChange={(v) => set({ track: v as PlanItem["track"] })} options={tracks} />
            </div>
            {/* 파트 더하기: 공통코드관리의 일정 파트 그룹을 탭으로 연다(관리 화면 링크는 프로그램 껍데기가 탭으로 받는다) */}
            <ProgramLink href={ROUTES.adminCodes} select={PLAN_TRACK_GROUP} icon={<SlidersIcon size={15} />} label={M.tracksHint} />
          </div>
        </Prop>
        <Prop label={M.fieldKind} required>
          <FormSelect
            name={`pl-kind-${k}`}
            label={M.fieldKind}
            hideLabel
            size="md"
            value={item.kind}
            // 하위가 있는 줄은 이정표가 될 수 없다 — 이정표는 날 하나라 하위를 품지 않는다
            disabled={group}
            onChange={(v) => set({ kind: v as PlanItem["kind"], endOn: v === "milestone" ? item.startOn : item.endOn })}
            options={optionsOr(codes.options("PLAN_KIND"), PLAN_KIND_LABEL)}
          />
        </Prop>
        <Prop label={M.fieldAssignee}>
          <FormSelect
            name={`pl-who-${k}`}
            label={M.fieldAssignee}
            hideLabel
            size="md"
            value={item.assigneeId ?? NONE}
            onChange={(v) => set({ assigneeId: v || null })}
            options={[{ value: NONE, label: M.noAssignee }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </Prop>
        <Prop label={M.fieldProgress} htmlFor={`pl-pct-${k}`} error={errors.progress}>
          <div className="flex items-center gap-1.5">
            <input
              id={`pl-pct-${k}`}
              inputMode="numeric"
              placeholder={row && item.progress == null ? `${M.progressAuto} ${row.pct}` : M.progressAuto}
              value={item.progress == null ? "" : String(item.progress)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                set({ progress: raw === "" ? null : Math.min(PLAN_PROGRESS_MAX, Number(raw)) });
              }}
              className={cn(INPUT, "w-24 text-right tabular-nums")}
            />
            <span className="text-[13.5px] font-semibold text-dim">%</span>
          </div>
        </Prop>
      </div>

      {group ? (
        <Prop label={M.fieldPeriod}>
          <p className="flex h-9 items-center text-[13.5px] tabular-nums text-ink-2">
            {row?.start && row.end ? `${row.start} ~ ${row.end}` : "-"}
            <span className="ml-2 text-[12.5px] text-dim">{M.groupPeriod}</span>
          </p>
        </Prop>
      ) : item.kind === "milestone" ? (
        <Prop label={M.fieldDate} required error={errors.startOn}>
          <DateField label={M.fieldDate} hideLabel size="sm" value={item.startOn} onChange={(v) => set({ startOn: v, endOn: v })} clearable={false} className="max-w-[220px]" />
        </Prop>
      ) : (
        <Prop label={M.fieldPeriod} error={errors.endOn ?? errors.startOn}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
            <DateField label={M.colStart} hideLabel size="sm" value={item.startOn} onChange={(v) => set({ startOn: v, endOn: item.endOn ?? v })} />
            <span className="text-dim">~</span>
            <DateField label={M.colEnd} hideLabel size="sm" value={item.endOn} min={item.startOn} onChange={(v) => set({ endOn: v })} />
          </div>
        </Prop>
      )}

      <Prop label={M.fieldMemo} htmlFor={`pl-memo-${k}`} error={errors.memo}>
        <textarea
          id={`pl-memo-${k}`}
          rows={2}
          value={item.memo ?? ""}
          onChange={(e) => set({ memo: e.target.value || null })}
          className={cn(INPUT, "h-auto min-h-[60px] resize-y py-2 leading-relaxed")}
        />
      </Prop>
    </div>
  );
}

/** 이 일정 줄에 이은 업무요청 카드. 만들기는 저장한 줄에만 — 카드가 가리킬 행이 DB 에 있어야 한다 */
export function PlanCards({ cards, saved, busy, onCreate, onUnlink }: { cards: PlanCard[]; saved: boolean; busy: boolean; onCreate: () => void; onUnlink: (taskId: string) => void }) {
  const codes = useCodes();
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-ink">{M.sectionCards}</h3>
        <button type="button" onClick={onCreate} disabled={!saved || busy} className="press rounded-md border border-line-strong px-2.5 py-1 text-[12.5px] font-semibold text-ink-2 hover:border-acc hover:text-acc disabled:opacity-40">
          {M.cardCreate}
        </button>
      </div>
      {!saved ? (
        <p className="text-[13px] text-dim">{M.cardsNeedSave}</p>
      ) : cards.length === 0 ? (
        <p className="text-[13px] text-dim">{M.cardsEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
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
    </section>
  );
}
