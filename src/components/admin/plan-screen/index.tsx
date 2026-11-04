"use client";
// 업무관리 일정(WBS) 화면(2026-11-04, 사용자 "WBS 를 우리 프로그램에서 보고 편집까지"). 위 간트, 아래 WBS 목록 + 고른 줄 상세.
//
// 저장은 화면 전체 단위다(lib/admin/plan-schemas 머리 주석) — 끌기, 들여쓰기, 칸 고치기를 여러 번 하고 F9 한 번에 보낸다.
// 저장 전 값은 이 화면이 쥐고, 간트와 목록은 같은 값(buildPlanRows)에서 그린다. 둘이 따로 계산하면 막대와 표 날짜가 어긋난다.
// 새 줄의 열쇠는 여기서 만든 uuid 다 — 저장 전에 새 상위 아래 새 하위를 달 수 있어야 한다.
// 업무요청 카드 만들기, 연결 해제는 저장과 따로 곧바로 나간다(카드는 칸반 쪽 값이다). 그 뒤 다시 읽어 진행률이 따라온다.
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlanTaskAction, linkTaskPlanAction, savePlanAction } from "@/app/(admin)/admin/tasks/plan-actions";
import { reportDirty } from "@/components/admin/program-shell/store";
import { DataGrid } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { MasterDetail } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { useMobilePolicy } from "@/components/admin/mobile-policy";
import { TaskViewSwitch } from "@/components/admin/task-view-switch";
import { SEGMENT, SEGMENT_ITEM, SEGMENT_ITEM_ON } from "@/components/admin/task-fields";
import { useCodes } from "@/components/code-book";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { ADMIN_NAV, PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { buildPlanRows, countCards, descendantIds, groupByAssignee, nextMilestone, PERSON_ROW_PREFIX, PLAN_TRACKS, trackSummaries, type PlanRow, indent, insertAfter, moveSibling, outdent, resizeItem, shiftDay, shiftItem, type PlanCard, type PlanItem } from "@/lib/admin/plan";
import { planItemSchema } from "@/lib/admin/plan-schemas";
import type { TaskAssignee } from "@/lib/admin/tasks";
import { fieldErrors, firstError, type FieldErrors } from "@/lib/admin/validation";
import { cn } from "@/lib/cn";
import { planColumns } from "./columns";
import { PlanCards, PlanForm } from "./form";
import { PlanGantt, TRACK_COLOR, type PlanZoom } from "./gantt";
import { PersonSummary, PlanSummary } from "./summary";
import { PendingRegion } from "@/components/ui/nav-pending";

/** 새 줄의 기본 기간(일). 한 주 안의 평일 다섯 날 */
const NEW_SPAN_DAYS = 4;
const ZOOMS: { key: PlanZoom; label: string }[] = [
  { key: "day", label: M.zoomDay },
  { key: "week", label: M.zoomWeek },
  { key: "month", label: M.zoomMonth },
];

const same = (a: PlanItem | undefined, b: PlanItem | undefined) => JSON.stringify(a) === JSON.stringify(b);
const errorsOf = (it: PlanItem): FieldErrors => fieldErrors(planItemSchema.safeParse(it), { endOn: M.periodOrder, parentId: M.parentSelf });

export function PlanScreen({ items, cards, assignees, today }: { items: PlanItem[]; cards: PlanCard[]; assignees: TaskAssignee[]; today: string }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const { mobile } = useMobilePolicy();
  const codes = useCodes();
  const [saved, setSaved] = useState(items);
  const [value, setValue] = useState(items);
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [zoom, setZoom] = useState<PlanZoom>("week");
  // 묶어 보기: 담당자별(서로 무엇을 하고 있나, 기본) | WBS(계층). 아래 목록은 늘 WBS 계층이다
  const [group, setGroup] = useState<"person" | "wbs">("person");
  const [pending, start] = useTransition();
  const [cardBusy, startCard] = useTransition();

  // 서버가 새 값을 주면(저장 뒤 refresh, 조회) 그 값으로 다시 선다
  const [source, setSource] = useState(items);
  if (source !== items) {
    setSource(items);
    setSaved(items);
    setValue(items);
  }

  const savedById = useMemo(() => new Map(saved.map((i) => [i.id, i])), [saved]);
  const changed = value.filter((i) => !same(i, savedById.get(i.id)));
  const deleted = saved.filter((i) => !value.some((v) => v.id === i.id)).map((i) => i.id);
  const dirty = changed.length > 0 || deleted.length > 0;

  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

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
  const current = value.find((i) => i.id === selected) ?? null;
  const currentRow = rows.find((r) => r.id === selected);
  const errors = current ? errorsOf(current) : {};
  const columns = useMemo(() => planColumns({ name: codes.name, who: (id) => (id ? (names.get(id) ?? "") : ""), today }), [codes, names, today]);

  const patch = (id: string, next: (it: PlanItem) => PlanItem) => setValue((v) => v.map((i) => (i.id === id ? next(i) : i)));
  const setCurrent = (next: Partial<PlanItem>) => {
    if (!current) return;
    // 상위를 바꾸면 새 상위의 맨 끝에 선다
    if ("parentId" in next && next.parentId !== current.parentId) {
      const last = value.filter((i) => i.parentId === next.parentId).reduce((n, i) => Math.max(n, i.sortOrder + 1), 0);
      next = { ...next, sortOrder: last };
    }
    patch(current.id, (i) => ({ ...i, ...next }));
  };

  const save = () => {
    const bad = value.find((i) => firstError(errorsOf(i)));
    if (bad) {
      setSelected(bad.id);
      say(`${M.invalid} ${firstError(errorsOf(bad))!.message}`, "error");
      return;
    }
    const upsert = changed;
    start(async () => {
      const r = await savePlanAction({ upsert, deleted }).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) return say(r.error, "error");
      setSaved(value);
      say(M.saved, "ok");
      router.refresh();
    });
  };

  const insert = () => {
    const base = current;
    const fresh: PlanItem = {
      id: crypto.randomUUID(),
      parentId: null,
      sortOrder: 0,
      title: M.newTitle,
      track: base?.track ?? "dev",
      kind: "task",
      startOn: today,
      endOn: shiftDay(today, NEW_SPAN_DAYS),
      progress: null,
      assigneeId: null,
      output: null,
      memo: null,
    };
    setValue((v) => insertAfter(v, fresh, base?.id ?? null));
    setSelected(fresh.id);
  };

  const remove = async () => {
    if (!current) return;
    const under = descendantIds(value, current.id);
    if (!(await askConfirm(M.deleteBody(current.title, under.size), { title: M.deleteTitle, confirmLabel: M.deleteOk, tone: "danger" }))) return;
    const at = rows.findIndex((r) => r.id === current.id);
    const gone = new Set([current.id, ...under]);
    setValue((v) => v.filter((i) => !gone.has(i.id)));
    setSelected(rows.slice(0, at).reverse().find((r) => !gone.has(r.id))?.id ?? null);
    say(M.deletedNote);
  };

  const card = (run: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    startCard(async () => {
      const r = await run().catch(() => ({ ok: false, error: M.failed }));
      if (!r.ok) return say(r.error ?? M.failed, "error");
      say(done, "ok");
      router.refresh();
    });

  const parents = currentRow ? rows.filter((r) => r.kind !== "milestone" && r.id !== currentRow.id && !descendantIds(value, currentRow.id).has(r.id)) : [];
  const toolButton = "press rounded-md px-2 py-1 text-[12.5px] font-semibold text-ink-2 hover:bg-acc-soft hover:text-acc disabled:opacity-40";

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
          insert,
          delete: current ? () => void remove() : undefined,
          save,
          saveDisabled: !dirty,
          saving: pending,
          dirty,
        }}
      />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TaskViewSwitch view="plan" />
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

        <PendingRegion className="flex flex-col gap-3">
        {group === "person" ? (
          <PersonSummary people={people} nameOf={nameOf} milestone={milestone} today={today} onPick={setSelected} />
        ) : (
          <PlanSummary tracks={tracks} milestone={milestone} today={today} onPick={setSelected} />
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
          onShift={(id, by) => patch(id, (i) => shiftItem(i, by))}
          onResize={(id, edge, by) => patch(id, (i) => resizeItem(i, edge, by))}
          editable={!mobile}
        />

        <MasterDetail
          listWidth="640px"
          detailOpenKey={selected}
          list={
            <DataGrid
              label={M.list}
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              fileKey={(r) => ({ code: r.no, name: r.title })}
              selected={selected}
              onSelect={setSelected}
              rowState={(r) => (firstError(errorsOf(r)) ? "error" : !savedById.has(r.id) ? "new" : same(value.find((i) => i.id === r.id), savedById.get(r.id)) ? undefined : "changed")}
              rowTone={(r) => (r.pct >= 100 ? "muted" : undefined)}
              empty={M.empty}
              searchable
            />
          }
          detailTitle={currentRow ? `${currentRow.no} ${currentRow.title}` : M.detail}
          detailActions={
            current && (
              <div className="flex items-center gap-0.5">
                <button type="button" className={toolButton} onClick={() => setValue((v) => moveSibling(v, current.id, -1))}>
                  {M.moveUp}
                </button>
                <button type="button" className={toolButton} onClick={() => setValue((v) => moveSibling(v, current.id, 1))}>
                  {M.moveDown}
                </button>
                <button type="button" className={toolButton} onClick={() => setValue((v) => indent(v, current.id))}>
                  {M.indent}
                </button>
                <button type="button" className={toolButton} onClick={() => setValue((v) => outdent(v, current.id))} disabled={!current.parentId}>
                  {M.outdent}
                </button>
              </div>
            )
          }
          detail={
            current ? (
              <div key={current.id} className="flex flex-col gap-3">
                <PlanForm item={current} row={currentRow} parents={parents} assignees={assignees} errors={errors} set={setCurrent} />
                <PlanCards
                  cards={cards.filter((c) => c.planItemId === current.id)}
                  saved={savedById.has(current.id)}
                  busy={cardBusy}
                  onCreate={() => card(() => createPlanTaskAction(current.id), M.cardCreated)}
                  onUnlink={(taskId) => card(() => linkTaskPlanAction(taskId, null), M.cardUnlinked)}
                />
              </div>
            ) : (
              <p className="px-1 py-6 text-[13px] text-dim">{M.pick}</p>
            )
          }
        />
        </PendingRegion>
      </div>
    </>
  );
}
