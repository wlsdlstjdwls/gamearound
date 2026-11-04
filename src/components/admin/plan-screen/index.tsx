"use client";
// 업무관리 일정(WBS) 화면(2026-11-04, 사용자 "WBS 를 우리 프로그램에서 보고 편집까지").
//
// 노션처럼 차트에서 바로 고친다(같은 날 3차, 사용자 "아래 그리드, 폼 말고 차트에서 바로 수정하거나 글 옆 작은 버튼으로 팝업"):
// 막대 끌기, 작업명 두 번 눌러 고치기, 줄의 "+" 로 하위 추가, "열기" 로 오른쪽 서랍(dialog.tsx). 아래 그리드와 상세 폼은 걷었다.
// 저장도 노션처럼 자동이다 — 고치고 AUTOSAVE_MS 동안 손을 멈추면 바뀐 줄과 지운 줄을 한 묶음으로 보낸다(lib/admin/plan-schemas).
// 툴바 저장(F9, Ctrl+S)은 기다리지 않고 바로 보내는 단추로 남긴다. 검사에 걸린 줄이 있으면 보내지 않고 그 줄을 연다.
// 저장된 값(saved)과 화면 값(value)을 따로 쥔다. 서버가 새 값을 주어도(카드 만들기 뒤 refresh) 아직 안 보낸 고침이 있으면 화면 값은 지킨다.
// 새 줄의 열쇠는 여기서 만든 uuid 다 — 저장 전에 새 상위 아래 새 하위를 달 수 있어야 한다.
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlanTaskAction, linkTaskPlanAction, savePlanAction } from "@/app/(admin)/admin/tasks/plan-actions";
import { reportDirty } from "@/components/admin/program-shell/store";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { useAdminStatus } from "@/components/admin/screen/status";
import { useMobilePolicy } from "@/components/admin/mobile-policy";
import { TaskViewSwitch } from "@/components/admin/task-view-switch";
import { SEGMENT, SEGMENT_ITEM, SEGMENT_ITEM_ON } from "@/components/admin/task-fields";
import { useCodes } from "@/components/code-book";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { ADMIN_NAV, PLAN_MESSAGES as M } from "@/lib/admin/messages";
import {
  buildPlanRows,
  countCards,
  descendantIds,
  groupByAssignee,
  indent,
  insertAfter,
  moveSibling,
  nextMilestone,
  outdent,
  PERSON_ROW_PREFIX,
  PLAN_TRACKS,
  resizeItem,
  shiftDay,
  shiftItem,
  trackSummaries,
  type PlanCard,
  type PlanItem,
  type PlanRow,
} from "@/lib/admin/plan";
import { planItemSchema } from "@/lib/admin/plan-schemas";
import type { TaskAssignee } from "@/lib/admin/tasks";
import { fieldErrors, firstError, type FieldErrors } from "@/lib/admin/validation";
import { cn } from "@/lib/cn";
import { PlanDialog, type PlanMove } from "./dialog";
import { PlanGantt, TRACK_COLOR, type PlanZoom } from "./gantt";
import { PersonSummary, PlanSummary } from "./summary";

/** 새 줄의 기본 기간(일). 한 주 안의 평일 다섯 날 */
const NEW_SPAN_DAYS = 4;
/** 손을 멈추고 자동 저장까지 기다리는 시간(ms). 끌기를 연달아 할 때 한 번에 묶일 만큼, 고친 뒤 기다린다고 느끼지 않을 만큼 */
const AUTOSAVE_MS = 800;
const ZOOMS: { key: PlanZoom; label: string }[] = [
  { key: "day", label: M.zoomDay },
  { key: "week", label: M.zoomWeek },
  { key: "month", label: M.zoomMonth },
];

const same = (a: PlanItem | undefined, b: PlanItem | undefined) => JSON.stringify(a) === JSON.stringify(b);
const errorsOf = (it: PlanItem): FieldErrors => fieldErrors(planItemSchema.safeParse(it), { endOn: M.periodOrder, parentId: M.parentSelf });
const diffOf = (value: PlanItem[], saved: PlanItem[]) => {
  const byId = new Map(saved.map((i) => [i.id, i]));
  const ids = new Set(value.map((i) => i.id));
  return { upsert: value.filter((i) => !same(i, byId.get(i.id))), deleted: saved.filter((i) => !ids.has(i.id)).map((i) => i.id) };
};

export function PlanScreen({ items, cards, assignees, today }: { items: PlanItem[]; cards: PlanCard[]; assignees: TaskAssignee[]; today: string }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const { mobile } = useMobilePolicy();
  const codes = useCodes();
  const [saved, setSaved] = useState(items);
  const [value, setValue] = useState(items);
  const [selected, setSelected] = useState<string | null>(null);
  /** 서랍으로 연 줄 */
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [zoom, setZoom] = useState<PlanZoom>("week");
  // 묶어 보기: 담당자별(서로 무엇을 하고 있나, 기본) | WBS(계층)
  const [group, setGroup] = useState<"person" | "wbs">("person");
  // 요약 카드는 접힌 한 줄 띠가 기본이다 — 펼친 카드는 간트를 화면 밖으로 민다(사용자)
  const [summaryOpen, setSummaryOpen] = useState(false);
  const fold = { open: summaryOpen, onToggle: () => setSummaryOpen((o) => !o) };
  const [pending, start] = useTransition();
  const [cardBusy, startCard] = useTransition();

  const { upsert, deleted } = diffOf(value, saved);
  const dirty = upsert.length > 0 || deleted.length > 0;

  // 서버가 새 값을 주면 저장된 값을 맞추고, 안 보낸 고침이 없을 때만 화면 값도 바꾼다
  const [source, setSource] = useState(items);
  if (source !== items) {
    setSource(items);
    setSaved(items);
    if (!dirty) setValue(items);
  }

  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  /** 바뀐 것을 보낸다. 검사에 걸린 줄이 있으면 보내지 않고(loud 면) 그 줄을 연다 */
  const flush = (loud: boolean) => {
    if (pending) return;
    const bad = value.find((i) => firstError(errorsOf(i)));
    if (bad) {
      if (loud) {
        setOpenId(bad.id);
        say(`${M.invalid} ${firstError(errorsOf(bad))!.message}`, "error");
      }
      return;
    }
    const snapshot = value;
    const diff = diffOf(snapshot, saved);
    if (diff.upsert.length === 0 && diff.deleted.length === 0) return;
    start(async () => {
      const r = await savePlanAction(diff).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) return say(r.error, "error");
      setSaved(snapshot);
      say(M.saved, "ok");
    });
  };

  // 자동 저장: 고침이 멈추고 AUTOSAVE_MS 뒤에 보낸다. 보내는 동안 또 고치면 저장이 끝나 saved 가 바뀔 때 다시 잰다
  useEffect(() => {
    if (!dirty || pending) return;
    const t = setTimeout(() => flush(false), AUTOSAVE_MS);
    return () => clearTimeout(t);
    // flush 는 매 렌더 새로 만들어지지만 값(value, saved)이 같으면 하는 일이 같다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, saved, pending, dirty]);

  const rows = useMemo(() => buildPlanRows(value, countCards(cards)), [value, cards]);
  const names = useMemo(() => new Map(assignees.map((a) => [a.id, a.name])), [assignees]);
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? "") : M.noAssignee);
  const people = useMemo(() => groupByAssignee(rows, today, assignees.map((a) => a.id)), [rows, today, assignees]);
  // 담당자별 간트: 사람 머리 줄(그 사람 몫의 처음과 끝, 진행률) + 그 아래 작업 줄. 머리 줄은 일정 줄이 아니라 고르기, 끌기를 건너뛴다
  const personRows = useMemo<PlanRow[]>(
    () =>
      people.flatMap((p) => {
        const id = `${PERSON_ROW_PREFIX}${p.assigneeId ?? "none"}`;
        const lead = p.rows[0]!;
        const head: PlanRow = { ...lead, id, parentId: null, title: p.assigneeId ? (names.get(p.assigneeId) ?? "") : M.noAssignee, no: "", depth: 0, hasChildren: true, kind: "task", start: p.start, end: p.end, pct: p.pct, pctFrom: "children", progress: null };
        return [head, ...(collapsed.has(id) ? [] : p.rows.map((r) => ({ ...r, depth: 1, parentId: id })))];
      }),
    [people, collapsed, names],
  );
  const visible = useMemo(() => {
    if (group === "person") return personRows;
    const hidden = new Set<string>();
    for (const id of collapsed) for (const d of descendantIds(value, id)) hidden.add(d);
    return rows.filter((r) => !hidden.has(r.id));
  }, [group, personRows, rows, collapsed, value]);
  const pick = (id: string) => {
    if (!id.startsWith(PERSON_ROW_PREFIX)) setSelected(id);
  };

  const tracks = useMemo(() => trackSummaries(rows, today), [rows, today]);
  const milestone = useMemo(() => nextMilestone(rows, today), [rows, today]);
  const opened = value.find((i) => i.id === openId) ?? null;
  const openedRow = rows.find((r) => r.id === openId);
  const savedIds = useMemo(() => new Set(saved.map((i) => i.id)), [saved]);

  const patch = (id: string, next: (it: PlanItem) => PlanItem) => setValue((v) => v.map((i) => (i.id === id ? next(i) : i)));
  const setOpened = (next: Partial<PlanItem>) => {
    if (!opened) return;
    // 상위를 바꾸면 새 상위의 맨 끝에 선다
    if ("parentId" in next && next.parentId !== opened.parentId) {
      const last = value.filter((i) => i.parentId === next.parentId).reduce((n, i) => Math.max(n, i.sortOrder + 1), 0);
      next = { ...next, sortOrder: last };
    }
    patch(opened.id, (i) => ({ ...i, ...next }));
  };

  /** 새 줄. 상위를 주면 그 아래 맨 끝, 아니면 기준 줄 바로 아래 형제(없으면 맨 끝) */
  const add = (opts: { parentId?: string; after?: string | null }) => {
    const parent = opts.parentId ? value.find((i) => i.id === opts.parentId) : undefined;
    const base = value.find((i) => i.id === (opts.after ?? null));
    const fresh: PlanItem = {
      id: crypto.randomUUID(),
      parentId: null,
      sortOrder: 0,
      title: M.newTitle,
      track: parent?.track ?? base?.track ?? "dev",
      kind: "task",
      startOn: today,
      endOn: shiftDay(today, NEW_SPAN_DAYS),
      progress: null,
      assigneeId: null,
      output: null,
      memo: null,
    };
    if (parent) {
      const last = value.filter((i) => i.parentId === parent.id).reduce((n, i) => Math.max(n, i.sortOrder + 1), 0);
      setValue((v) => [...v, { ...fresh, parentId: parent.id, sortOrder: last }]);
      setCollapsed((s) => {
        const n = new Set(s);
        n.delete(parent.id);
        return n;
      });
    } else setValue((v) => insertAfter(v, fresh, opts.after ?? null));
    setSelected(fresh.id);
    setOpenId(fresh.id);
  };

  const remove = async (id: string) => {
    const it = value.find((i) => i.id === id);
    if (!it) return;
    const under = descendantIds(value, id);
    if (!(await askConfirm(M.deleteBody(it.title, under.size), { title: M.deleteTitle, confirmLabel: M.deleteOk, tone: "danger" }))) return;
    const gone = new Set([id, ...under]);
    setValue((v) => v.filter((i) => !gone.has(i.id)));
    setOpenId(null);
    setSelected(null);
  };

  const move = (m: PlanMove) => {
    if (!opened) return;
    const id = opened.id;
    if (m === "up") setValue((v) => moveSibling(v, id, -1));
    else if (m === "down") setValue((v) => moveSibling(v, id, 1));
    else if (m === "indent") setValue((v) => indent(v, id));
    else if (m === "outdent") setValue((v) => outdent(v, id));
    else if (m === "child") add({ parentId: id });
    else void remove(id);
  };

  const card = (run: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    startCard(async () => {
      const r = await run().catch(() => ({ ok: false, error: M.failed }));
      if (!r.ok) return say(r.error ?? M.failed, "error");
      say(done, "ok");
      router.refresh();
    });

  const parents = openedRow ? rows.filter((r) => r.kind !== "milestone" && r.id !== openedRow.id && !descendantIds(value, openedRow.id).has(r.id)) : [];

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.tasks}
        count={value.length}
        tools={{
          retrieve: () => {
            setValue(saved);
            router.refresh();
            say(M.reloaded);
          },
          insert: () => add({ after: selected }),
          delete: selected ? () => void remove(selected) : undefined,
          save: () => flush(true),
          saveDisabled: !dirty,
          saving: pending,
          dirty,
        }}
      />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TaskViewSwitch />
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label={M.groupBy} className={cn(SEGMENT, "w-fit")}>
              {(["person", "wbs"] as const).map((g) => (
                <button key={g} type="button" role="radio" aria-checked={group === g} onClick={() => setGroup(g)} className={cn(SEGMENT_ITEM, "flex-none px-3", group === g && SEGMENT_ITEM_ON)}>
                  {g === "person" ? M.groupPerson : M.groupWbs}
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label={M.zoom} className={cn(SEGMENT, "w-fit")}>
              {ZOOMS.map((z) => (
                <button key={z.key} type="button" role="radio" aria-checked={zoom === z.key} onClick={() => setZoom(z.key)} className={cn(SEGMENT_ITEM, "flex-none px-3", zoom === z.key && SEGMENT_ITEM_ON)}>
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {group === "person" ? (
          <PersonSummary people={people} nameOf={nameOf} milestone={milestone} today={today} onPick={setOpenId} fold={fold} />
        ) : (
          <PlanSummary tracks={tracks} milestone={milestone} today={today} onPick={setOpenId} fold={fold} />
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12.5px] text-dim" aria-label={M.legend}>
          {PLAN_TRACKS.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: TRACK_COLOR[t] }} aria-hidden />
              {codes.name("PLAN_TRACK", t)}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rotate-45 rounded-[2px] bg-ink-2" aria-hidden />
            {M.legendMilestone}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-px bg-danger" aria-hidden />
            {M.legendToday}
          </span>
          <span className="ml-auto" aria-live="polite">
            {pending ? M.autosaving : ""}
          </span>
        </div>

        <PlanGantt
          rows={visible}
          allRows={rows}
          today={today}
          zoom={zoom}
          selected={selected}
          onSelect={pick}
          collapsed={collapsed}
          onToggle={(id) =>
            setCollapsed((s) => {
              const n = new Set(s);
              if (n.has(id)) n.delete(id);
              else n.add(id);
              return n;
            })
          }
          onOpen={(id) => {
            setSelected(id);
            setOpenId(id);
          }}
          onAddChild={(id) => add({ parentId: id })}
          onAddRoot={group === "wbs" ? () => add({ after: null }) : undefined}
          onRename={(id, title) => patch(id, (i) => ({ ...i, title }))}
          onShift={(id, by) => patch(id, (i) => shiftItem(i, by))}
          onResize={(id, edge, by) => patch(id, (i) => resizeItem(i, edge, by))}
          editable={!mobile}
        />
      </div>

      {opened && (
        <PlanDialog
          key={opened.id}
          item={opened}
          row={openedRow}
          parents={parents}
          assignees={assignees}
          errors={errorsOf(opened)}
          set={setOpened}
          cards={cards.filter((c) => c.planItemId === opened.id)}
          saved={savedIds.has(opened.id)}
          busy={cardBusy}
          saving={pending}
          onCreateCard={() => card(() => createPlanTaskAction(opened.id), M.cardCreated)}
          onUnlinkCard={(taskId) => card(() => linkTaskPlanAction(taskId, null), M.cardUnlinked)}
          onMove={move}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
