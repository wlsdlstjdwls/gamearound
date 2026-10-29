"use client";
// 확인 팝업 — 지우기처럼 되돌릴 수 없는 일을 한 번 더 묻는다(2026-10-28, 사용자: "삭제 누르면 다시 물어보는 팝업").
// 브라우저 confirm 을 쓰지 않는 이유: 모바일에서 문구가 잘리고 화면 문체("-해요")와 모양을 따르지 않는다.
// <dialog> + showModal() 로 띄운다 — 포커스 가두기, 뒤 화면 비활성화, Esc 닫기를 브라우저가 해 준다(ui/sheet 와 같은 판단).
// 끌어내려 닫기 같은 시트 동작은 필요 없어 Sheet 를 빌리지 않았다. 열리면 "취소" 에 포커스가 간다 — 실수로 Enter 를 눌러도 안 지워진다.
// 확인 뒤의 일(낙관적 반영, 되돌리기)은 부르는 쪽이 onConfirm 에서 한다. 이 팝업은 묻기만 하고 바로 닫힌다.
import { useEffect, useId, useRef, useState } from "react";
import { CONFIRM_MESSAGES } from "@/lib/messages/confirm";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, InfoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  altLabel,
  onAlt,
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
  /** 세 번째 갈래(행 이동 때 "저장 안 함"). 있으면 취소와 확인 사이에 선다 */
  altLabel?: string;
  onAlt?: () => void;
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
      {/* 아이콘, 제목, 본문 셋으로 선다(2026-10-30 사용자 "타이틀도 없고 아이콘도 없어서 투박"). 묻는 말은 제목이 아니라 본문이다 —
          앞 판은 묻는 문장 하나를 굵은 제목으로 세워 글자만 덩그러니 보였다 */}
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden
            className={cn("grid size-10 shrink-0 place-items-center rounded-full", tone === "danger" ? "bg-danger-soft text-danger" : "bg-acc-soft text-acc")}
          >
            {tone === "danger" ? <AlertCircleIcon width={22} height={22} /> : <InfoIcon width={22} height={22} />}
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-1">
            <h2 id={titleId} className="text-[16px] font-bold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description && (
              <div id={descId} className="text-[14px] leading-[1.6] text-mut [text-wrap:pretty]">
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          {altLabel && onAlt && (
            <Button
              variant="secondary"
              onClick={() => {
                onAlt();
                onClose();
              }}
            >
              {altLabel}
            </Button>
          )}
          <Button
            variant={tone}
            // 확인을 먼저 알린다 — 닫기를 먼저 부르면 askConfirm 이 닫기를 "취소" 로 받아 답이 거기서 굳는다
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// ---- askConfirm: 브라우저 confirm 을 대신하는 한 줄 확인(2026-10-29, 사용자 "자체 alert 가 아닌 브라우저 alert 가 나온다") ----
// `if (!confirm(문구)) return;` 자리를 `if (!(await askConfirm(문구))) return;` 로 바꾸면 된다. 화면마다 열림 상태를 따로 쥐지 않도록
// 루트 레이아웃에 ConfirmHost 하나를 세우고, askConfirm 이 그 하나에 묻는다. 확인을 누르면 true, 취소, Esc, 바깥 누름은 false.

// 2026-10-30: 첫 인자는 본문(묻는 말)이고 제목은 opts.title, 없으면 tone 별 기본 제목. askChoice 는 세 갈래(확인, 다른 갈래, 취소)를 묻는다.

export type ConfirmTone = "danger" | "primary";
type ConfirmOptions = { title?: string; description?: string; confirmLabel?: string; tone?: ConfirmTone };
export type ConfirmChoice = "confirm" | "alt" | "cancel";
type ConfirmRequest = ConfirmOptions & { message: string; altLabel?: string; resolve: (c: ConfirmChoice) => void };
let pushRequest: ((r: ConfirmRequest) => void) | null = null;

/** 세 갈래 확인. 행을 옮길 때 "저장, 저장 안 함, 취소" 처럼 확인 말고 갈래가 하나 더 있을 때 쓴다 */
export function askChoice(message: string, opts: ConfirmOptions & { altLabel: string }): Promise<ConfirmChoice> {
  // 호스트가 없으면(테스트, 레이아웃 밖) 묻지 않고 하지 않는다 — 되돌릴 수 없는 일을 확인 없이 하는 쪽보다 낫다
  if (!pushRequest) return Promise.resolve("cancel");
  const push = pushRequest;
  return new Promise((resolve) => push({ message, ...opts, resolve }));
}

export async function askConfirm(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  if (!pushRequest) return false;
  const push = pushRequest;
  const c = await new Promise<ConfirmChoice>((resolve) => push({ message, ...opts, resolve }));
  return c === "confirm";
}

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  useEffect(() => {
    pushRequest = (r) =>
      setReq((cur) => {
        // 앞 질문이 떠 있는데 또 물으면 앞 질문은 취소로 닫는다 — 둘을 겹쳐 띄우지 않는다
        cur?.resolve("cancel");
        return r;
      });
    return () => {
      pushRequest = null;
    };
  }, []);
  const settle = (c: ConfirmChoice) => {
    req?.resolve(c);
    setReq(null);
  };
  const tone = req?.tone ?? "primary";
  // 본문이 따로 오면(description) 묻는 말이 둘째 줄로 붙는다
  const body = req ? (req.description ? `${req.message} ${req.description}` : req.message) : undefined;
  return (
    <ConfirmDialog
      open={req !== null}
      title={req?.title ?? CONFIRM_MESSAGES.title[tone]}
      description={body}
      confirmLabel={req?.confirmLabel ?? CONFIRM_MESSAGES.ok}
      cancelLabel={CONFIRM_MESSAGES.cancel}
      tone={tone}
      altLabel={req?.altLabel}
      onAlt={() => settle("alt")}
      onConfirm={() => settle("confirm")}
      onClose={() => settle("cancel")}
    />
  );
}
