"use client";

// 할 일 첨부의 화면 조각 셋(2026-10-02) — 붙은 파일 목록, 저장 전에 파일 고르기, 팝업의 본문 첨부 마디.
//
// 이미지는 작은 그림으로, 나머지는 이름과 크기를 단 줄로 보인다. 누르면 새 창에서 원본이 열린다 —
// 판 안에 뷰어를 두지 않는 이유: PDF, 로그를 판 폭 안에서 읽을 일이 없고, 브라우저가 이미 잘 연다.
//
// 고르기(AttachmentPicker)는 **아직 안 올린** 파일을 들고만 있다. 추가 폼과 기록 칸은 글을 먼저 저장해
// id 를 받아야 거기에 파일을 붙일 수 있어서, 올리는 일은 그 폼의 액션이 한다(task-attachment-upload).
// 팝업의 본문 마디(TaskAttachmentsPart)는 할 일이 이미 있으니 고르는 즉시 올린다 — 저장 단추를 또 누르게 하지 않는다.
import { useRef, useState, useTransition } from "react";
import { FadeImage } from "@/components/ui/fade-image";
import { buttonClass } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { TASK_ATTACHMENT_MESSAGES as M } from "@/lib/admin/messages";
import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES, formatBytes, isImageType } from "@/lib/admin/task-attachments";
import type { TaskAttachment } from "@/lib/admin/tasks";
import { checkFiles, uploadTaskFiles } from "@/components/admin/task-attachment-upload";
import { removeAttachmentAction } from "@/app/(admin)/admin/tasks/actions";

/** 작은 그림 한 변(px). 지우기 단추가 모서리에 얹혀도 그림이 읽히는 크기 — 매장 사진 칸(72)보다 조금 크게 */
const THUMB = 88;
const MAX_MB = ATTACHMENT_MAX_BYTES / (1024 * 1024);

/** 지우기 단추. 누르는 영역은 44px(AGENTS §6), 보이는 동그라미는 작게 */
function RemoveButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="press flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-surface text-ink">
        <XIcon size={14} aria-hidden />
      </span>
    </button>
  );
}

/** 붙은 파일 목록. `removable` 이 아니면 읽기만 한다(지난 일 화면) */
export function AttachmentList({ items, removable = false }: { items: TaskAttachment[]; removable?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (items.length === 0) return null;

  const images = items.filter((a) => isImageType(a.contentType));
  const files = items.filter((a) => !isImageType(a.contentType));
  const remove = (a: TaskAttachment) => {
    if (!confirm(M.removeConfirm)) return;
    setError(null);
    start(async () => {
      const r = await removeAttachmentAction(a.id);
      if (r && !r.ok) setError(r.error);
    });
  };

  return (
    <div className={cn("flex flex-col gap-2", pending && "opacity-70")}>
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((a) => (
            <li key={a.id} className="relative" style={{ width: THUMB, height: THUMB }}>
              <a href={a.url} target="_blank" rel="noreferrer" className="block h-full w-full overflow-hidden rounded-lg border border-line">
                <FadeImage src={a.url} alt={M.openImage(a.name)} width={THUMB} height={THUMB} sizes={`${THUMB}px`} className="h-full w-full object-cover" />
                <span className="sr-only">{M.newWindow}</span>
              </a>
              {removable && (
                <span className="absolute -right-4 -top-4">
                  <RemoveButton label={`${M.remove} ${a.name}`} disabled={pending} onClick={() => remove(a)} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg bg-surface-2 pl-3">
              <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 py-2.5 text-[13.5px] text-ink hover:text-acc">
                <span className="block truncate font-semibold">{a.name}</span>
                <span className="text-[12px] tabular-nums text-mut">{formatBytes(a.size)}</span>
                <span className="sr-only">{M.newWindow}</span>
              </a>
              {removable && <RemoveButton label={`${M.remove} ${a.name}`} disabled={pending} onClick={() => remove(a)} />}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * 저장 전에 파일 고르기. 고른 파일은 부모가 들고 있다(value, onChange) — 부모의 액션이 글을 저장한 뒤 올린다.
 * 못 받는 파일은 고르는 자리에서 바로 걸러 사유를 띄운다 — 저장을 누른 뒤에 알면 글까지 다시 보게 된다.
 */
export function AttachmentPicker({ value, onChange, compact = false }: { value: File[]; onChange: (files: File[]) => void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* 테두리 단추다 — ghost 로 두니 기록 칸 밑에서 그냥 글자로 읽혔다(2026-10-02 화면 점검) */}
        <label className={buttonClass({ variant: "secondary", size: "sm", className: "tap cursor-pointer" })}>
          {M.attach}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const { ok, errors: bad } = checkFiles(e.currentTarget.files ?? []);
              setErrors(bad);
              onChange([...value, ...ok]);
              // 같은 파일을 빼고 다시 고를 수 있게 비운다
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
        </label>
        {!compact && <span className="text-[12.5px] text-dim">{M.hint(MAX_MB)}</span>}
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center rounded-lg bg-surface-2 pl-2.5 text-[13px] text-ink">
              <span className="max-w-[16rem] truncate">{f.name}</span>
              <span className="ml-1.5 tabular-nums text-mut">{formatBytes(f.size)}</span>
              <RemoveButton label={`${M.unpick} ${f.name}`} onClick={() => onChange(value.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ul>
      )}
      {errors.map((e) => (
        <p key={e} role="alert" className="text-[13px] text-danger">
          {e}
        </p>
      ))}
    </div>
  );
}

/** 팝업의 본문 첨부 마디. 할 일이 이미 있으므로 고르는 즉시 올린다 */
export function TaskAttachmentsPart({ taskId, items }: { taskId: string; items: TaskAttachment[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function onPick(list: FileList | null) {
    const { ok, errors: bad } = checkFiles(list ?? []);
    setErrors(bad);
    if (inputRef.current) inputRef.current.value = "";
    if (ok.length === 0) return;
    const failed = await uploadTaskFiles(taskId, ok, null, (done, total) => setProgress({ done, total }));
    setProgress(null);
    if (failed) setErrors((prev) => [...prev, failed]);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? <p className="text-[13.5px] text-dim">{M.empty}</p> : <AttachmentList items={items} removable />}
      <div className="flex flex-wrap items-center gap-2">
        <label className={buttonClass({ variant: "secondary", size: "sm", className: "tap cursor-pointer" })} aria-disabled={progress !== null}>
          {progress ? M.uploading(progress.done, progress.total) : M.add}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            disabled={progress !== null}
            className="sr-only"
            onChange={(e) => void onPick(e.currentTarget.files)}
          />
        </label>
        <span className="text-[12.5px] text-dim">{M.hint(MAX_MB)}</span>
      </div>
      {errors.map((e) => (
        <p key={e} role="alert" className="text-[13px] text-danger">
          {e}
        </p>
      ))}
    </div>
  );
}
