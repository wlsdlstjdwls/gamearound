"use client";
// 일정 줄 하나의 상세 팝업(2026-11-04, 사용자 "글 옆 작은 버튼으로 팝업 열어서 수정, 노션처럼"). 오른쪽 서랍으로 열린다 —
// 노션의 옆 보기처럼 차트를 가리지 않고 옆에서 고친다. 고친 값은 화면이 곧바로(자동 저장) 보낸다, 저장 단추가 따로 없다.
// 칸은 앞서 아래 상세 폼(form.tsx)과 같다. 위로, 아래로, 들여쓰기, 내어쓰기 단추는 걷었다(사용자 "와닿지 않는다") — 순서는 차트의 손잡이 끌기,
// 계층은 차트에서 손잡이를 끌어 다른 줄 가운데에 놓아 만든다(상위 일정 칸도 걷었다). 삭제는 머리 오른쪽 휴지통 하나다.
import { Sheet } from "@/components/ui/sheet";
import { TrashIcon } from "@/components/ui/icons";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import type { PlanCard, PlanItem, PlanRow } from "@/lib/admin/plan";
import type { TaskAssignee } from "@/lib/admin/tasks";
import type { FieldErrors } from "@/lib/admin/validation";
import { PlanCards, PlanForm } from "./form";
import { AttachmentsPart } from "@/components/admin/task-attachments";
import { uploadFiles } from "@/components/admin/task-attachment-upload";
import { registerPlanAttachmentAction, removePlanAttachmentAction } from "@/app/(admin)/admin/tasks/plan-actions";
import { planAttachmentPathPrefix } from "@/lib/admin/task-attachments";
import type { PlanAttachment } from "@/lib/admin/plan";

export function PlanDialog({
  item,
  row,
  assignees,
  errors,
  set,
  cards,
  files,
  onFilesChanged,
  saved,
  busy,
  saving,
  onCreateCard,
  onUnlinkCard,
  onDelete,
  onClose,
}: {
  item: PlanItem;
  row: PlanRow | undefined;
  assignees: TaskAssignee[];
  errors: FieldErrors;
  set: (next: Partial<PlanItem>) => void;
  cards: PlanCard[];
  files: PlanAttachment[];
  /** 파일을 올리고 지운 뒤 화면이 다시 읽는다 */
  onFilesChanged: () => void;
  /** DB 에 있는 줄인가(업무요청은 저장된 줄에만 잇는다) */
  saved: boolean;
  busy: boolean;
  /** 자동 저장이 나가는 중 */
  saving: boolean;
  onCreateCard: () => void;
  onUnlinkCard: (taskId: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={row ? `${row.no} ${item.title}` : item.title}
      side="right"
      size="wide"
      open
      onOpenChange={(v) => !v && onClose()}
      actions={
        <span className="flex items-center gap-2">
          <span className="text-[12px] text-dim" aria-live="polite">
            {saving ? M.autosaving : ""}
          </span>
          <button type="button" onClick={onDelete} aria-label={M.deleteTitle} title={M.deleteTitle} className="press flex size-8 items-center justify-center rounded-md text-dim hover:bg-danger-soft hover:text-danger">
            <TrashIcon size={16} />
          </button>
        </span>
      }
    >
      <div className="flex flex-col gap-3 pb-4">
        <PlanForm item={item} row={row} assignees={assignees} errors={errors} set={set} />
        <section className="flex flex-col gap-2 border-t border-line pt-3">
          <h3 className="text-[13.5px] font-bold text-ink">{M.sectionFiles}</h3>
          {saved ? (
            <AttachmentsPart
              items={files}
              upload={(list, onProgress) =>
                uploadFiles(
                  {
                    prefix: planAttachmentPathPrefix(item.id),
                    payload: { planItemId: item.id },
                    register: (b, name) => registerPlanAttachmentAction({ planItemId: item.id, url: b.url, pathname: b.pathname, name }),
                  },
                  list,
                  onProgress,
                )
              }
              onRemove={async (id) => {
                const r = await removePlanAttachmentAction(id);
                onFilesChanged();
                return r;
              }}
              onDone={onFilesChanged}
            />
          ) : (
            <p className="text-[13px] text-dim">{M.filesNeedSave}</p>
          )}
        </section>
        <PlanCards cards={cards} saved={saved} busy={busy} onCreate={onCreateCard} onUnlink={onUnlinkCard} />
      </div>
    </Sheet>
  );
}
