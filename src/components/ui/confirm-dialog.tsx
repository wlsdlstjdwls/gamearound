"use client";
// 확인 팝업 — 지우기처럼 되돌릴 수 없는 일을 한 번 더 묻는다(2026-10-28, 사용자: "삭제 누르면 다시 물어보는 팝업").
// 브라우저 confirm 을 쓰지 않는 이유: 모바일에서 문구가 잘리고 화면 문체("-해요")와 모양을 따르지 않는다.
// <dialog> + showModal() 로 띄운다 — 포커스 가두기, 뒤 화면 비활성화, Esc 닫기를 브라우저가 해 준다(ui/sheet 와 같은 판단).
// 끌어내려 닫기 같은 시트 동작은 필요 없어 Sheet 를 빌리지 않았다. 열리면 "취소" 에 포커스가 간다 — 실수로 Enter 를 눌러도 안 지워진다.
// 확인 뒤의 일(낙관적 반영, 되돌리기)은 부르는 쪽이 onConfirm 에서 한다. 이 팝업은 묻기만 하고 바로 닫힌다.
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** 확인 단추 색. 지우기는 danger, 그 밖의 확인은 primary */
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      cancelRef.current?.focus();
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // 막(바깥) 클릭으로 닫기 — 판 안 클릭은 target 이 판 안쪽 요소다
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="confirm-dialog m-auto w-[min(400px,calc(100vw-32px))] rounded-[var(--radius-panel)] bg-surface p-0 text-ink shadow-3"
    >
      <div className="flex flex-col gap-2 p-5 sm:p-6">
        <h2 id={titleId} className="text-[17px] font-extrabold tracking-[-0.02em]">
          {title}
        </h2>
        {description && (
          <div id={descId} className="text-[14px] leading-[1.6] text-mut">
            {description}
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
