"use client";
// 일정 줄 하나의 상세 팝업(2026-11-04, 사용자 "글 옆 작은 버튼으로 팝업 열어서 수정, 노션처럼"). 오른쪽 서랍으로 열린다 —
// 노션의 옆 보기처럼 차트를 가리지 않고 옆에서 고친다. 고친 값은 화면이 곧바로(자동 저장) 보낸다, 저장 단추가 따로 없다.
// 칸은 앞서 아래 상세 폼(form.tsx)과 같다. 줄 옮기기(위로, 아래로, 들여쓰기, 내어쓰기), 하위 추가, 삭제는 머리 아래 한 줄에 둔다.
import { Sheet } from "@/components/ui/sheet";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import type { PlanCard, PlanItem, PlanRow } from "@/lib/admin/plan";
import type { TaskAssignee } from "@/lib/admin/tasks";
import type { FieldErrors } from "@/lib/admin/validation";
import { PlanCards, PlanForm } from "./form";

export type PlanMove = "up" | "down" | "indent" | "outdent" | "child" | "delete";

const TOOL_BASE = "press rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold disabled:pointer-events-none disabled:opacity-40";
const TOOL = `${TOOL_BASE} text-ink-2 hover:bg-acc-soft hover:text-acc`;
/** 삭제는 빨강 글자로 떼어 둔다(오른쪽 끝) — 옮기기 단추와 같은 색이면 손이 미끄러진다 */
const TOOL_DANGER = `${TOOL_BASE} ml-auto text-danger hover:bg-danger-soft`;

export function PlanDialog({
  item,
  row,
  parents,
  assignees,
  errors,
  set,
  cards,
  saved,
  busy,
  saving,
  onCreateCard,
  onUnlinkCard,
  onMove,
  onClose,
}: {
  item: PlanItem;
  row: PlanRow | undefined;
  parents: PlanRow[];
  assignees: TaskAssignee[];
  errors: FieldErrors;
  set: (next: Partial<PlanItem>) => void;
  cards: PlanCard[];
  /** DB 에 있는 줄인가(업무요청은 저장된 줄에만 잇는다) */
  saved: boolean;
  busy: boolean;
  /** 자동 저장이 나가는 중 */
  saving: boolean;
  onCreateCard: () => void;
  onUnlinkCard: (taskId: string) => void;
  onMove: (m: PlanMove) => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={row ? `${row.no} ${item.title}` : item.title}
      side="right"
      size="wide"
      open
      onOpenChange={(v) => !v && onClose()}
      actions={<span className="text-[12px] text-dim" aria-live="polite">{saving ? M.autosaving : ""}</span>}
    >
      <div className="flex flex-col gap-3 pb-4">
        <div className="-mx-1 flex flex-wrap items-center gap-0.5 border-b border-line pb-2">
          <button type="button" className={TOOL} onClick={() => onMove("up")}>
            {M.moveUp}
          </button>
          <button type="button" className={TOOL} onClick={() => onMove("down")}>
            {M.moveDown}
          </button>
          <button type="button" className={TOOL} onClick={() => onMove("indent")}>
            {M.indent}
          </button>
          <button type="button" className={TOOL} onClick={() => onMove("outdent")} disabled={!item.parentId}>
            {M.outdent}
          </button>
          {item.kind !== "milestone" && (
            <button type="button" className={TOOL} onClick={() => onMove("child")}>
              {M.addChildLabel}
            </button>
          )}
          <button type="button" className={TOOL_DANGER} onClick={() => onMove("delete")}>
            {M.deleteOk}
          </button>
        </div>
        <PlanForm item={item} row={row} parents={parents} assignees={assignees} errors={errors} set={set} />
        <PlanCards cards={cards} saved={saved} busy={busy} onCreate={onCreateCard} onUnlink={onUnlinkCard} />
      </div>
    </Sheet>
  );
}
