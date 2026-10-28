"use client";
// 목록 한 줄(게임 하나에 플랫폼 알림 여럿)의 켜기/끄기와 지우기(기획서 v2.0 S-26 "알림 끄기").
//
// 줄이 게임 단위로 묶였으니(lib/alerts/group) 조작도 묶음 단위다. 새 액션을 만들지 않고 행 액션을
// 묶음의 행마다 부른다 — 소유자 검사와 revalidate 가 한 벌로 남는다. 행 하나짜리 컨트롤(alert-form 의 AlertItemControls)은
// 쓰는 곳이 없어 2026-10-28 걷었다. 스위치는 누른 순간 넘어가고, 전환이 끝나면 서버 값으로 돌아가므로
// 실패하면 저절로 되돌아가고 에러 문구만 남는다(AGENTS §6).
// 지우기는 브라우저 confirm 이 아니라 우리 확인 팝업(ui/confirm-dialog)으로 묻는다(2026-10-28 사용자).
import { useOptimistic, useState, useTransition } from "react";
import { deleteAlertAction, toggleAlertAction, type ActionState } from "@/app/(user)/alerts/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { XIcon } from "@/components/ui/icons";
import { ALERT_MESSAGES as M } from "@/lib/alerts/messages";
import { toggleTargets } from "@/lib/alerts/group";

/** 행 액션 여럿의 결과를 하나로 접는다 — 하나라도 실패하면 그 실패를 보인다 */
function firstFailure(results: ActionState[]): ActionState {
  return results.find((r) => r && !r.ok) ?? null;
}

export function AlertGroupControls({ items, isActive }: { items: Array<{ id: string; isActive: boolean }>; isActive: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(null);
  const [shownActive, setShownActive] = useOptimistic(isActive);
  const [asking, setAsking] = useState(false);

  return (
    <div className="flex items-center gap-2.5">
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
      <Switch
        on={shownActive}
        label={M.toggle}
        onToggle={() =>
          start(async () => {
            const next = !shownActive;
            setShownActive(next);
            setState(firstFailure(await Promise.all(toggleTargets(items, next).map((id) => toggleAlertAction(id)))));
          })
        }
      />
      <button
        type="button"
        disabled={pending}
        aria-label={M.remove}
        onClick={() => setAsking(true)}
        // 그림은 작아도 누르는 넓이는 44px(규약 §6). 지우기는 되돌릴 수 없어 hover 에서 빨강으로 미리 말한다
        className="press tap flex size-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
      >
        <XIcon size={16} />
      </button>
      <ConfirmDialog
        open={asking}
        title={items.length > 1 ? M.removeGroupConfirm : M.removeConfirm}
        description={M.removeConfirmLead}
        confirmLabel={M.removeConfirmAction}
        cancelLabel={M.removeConfirmCancel}
        onClose={() => setAsking(false)}
        onConfirm={() => start(async () => setState(firstFailure(await Promise.all(items.map((v) => deleteAlertAction(v.id))))))}
      />
    </div>
  );
}
