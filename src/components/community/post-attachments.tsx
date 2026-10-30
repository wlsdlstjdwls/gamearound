"use client";
// 글쓰기 첨부파일 — 본문 에디터 아래 파일 목록과 "파일 첨부" 단추. 툴바에 클립을 따로 두지 않았다 — 입구가 둘이면
// 올리는 중 표시가 한쪽에만 서고, 첨부는 본문 속 자리가 없는 것이라 본문 꾸미기 단추 줄과 섞일 까닭이 없다.
// 고르는 순간 하나씩 올리고, 다 올라간 파일만 목록에 선다. 등록 때 폼이 목록을 본문 끝 묶음으로 붙인다(post-media 의 attachmentsHtml).
// 목록에서 뺀 파일은 저장소에 남는다 — 글에 안 실리면 아무도 주소를 모른다(정리는 lib/community/media 머리 주석).
import { useRef, useState } from "react";
import { uploadPostFile, type UploadedFile } from "@/components/community/post-media";
import { FileTextIcon, SpinnerIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatFileSize, POST_FILE_ACCEPT, POST_FILE_MAX, POST_FILE_MAX_BYTES } from "@/lib/community/media";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { ToolIcon } from "./rich-editor-icons";

type Props = {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => void;
};

/** 파일 고르기 창 + 차례로 올리기 */
function usePicker({ files, onChange, onBusyChange, onError }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const pick = async (picked: File[]) => {
    const room = POST_FILE_MAX - files.length;
    if (room <= 0) return onError(M.fileLimit(POST_FILE_MAX));
    const take = picked.slice(0, room);
    if (take.length < picked.length) onError(M.fileLimit(POST_FILE_MAX));
    setBusy(take.length);
    onBusyChange(true);
    let next = files;
    for (const [i, f] of take.entries()) {
      try {
        next = [...next, await uploadPostFile(f)];
        onChange(next);
      } catch (e) {
        onError(e instanceof Error && e.message ? e.message : M.uploadFailed);
      }
      setBusy(take.length - i - 1);
    }
    onBusyChange(false);
  };
  const input = (
    <input
      ref={ref}
      type="file"
      accept={POST_FILE_ACCEPT}
      multiple
      hidden
      onChange={(e) => {
        const picked = Array.from(e.target.files ?? []);
        e.target.value = "";
        void pick(picked);
      }}
    />
  );
  return { open: () => ref.current?.click(), busy, input };
}

export function PostAttachments(props: Props) {
  const { files, onChange } = props;
  const { open, busy, input } = usePicker(props);
  const full = files.length >= POST_FILE_MAX;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[12.5px] font-medium text-mut">
          {M.attachments} <span className="tabular-nums text-dim">{`${files.length}/${POST_FILE_MAX}`}</span>
        </span>
        <span className="min-w-0 flex-1 text-[12px] text-dim">{M.attachmentsHint(POST_FILE_MAX, formatFileSize(POST_FILE_MAX_BYTES))}</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {files.map((f, i) => (
          <li key={f.url} className="enter-item flex min-w-0 items-center gap-3 rounded-[var(--radius-inset)] bg-surface-4 py-2 pl-3 pr-1 shadow-hair">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-acc-soft text-acc">
              <FileTextIcon size={17} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13.5px] font-semibold text-ink">{f.name}</span>
              <span className="text-[11.5px] tabular-nums text-dim">{f.sizeLabel ?? formatFileSize(f.size)}</span>
            </span>
            <button
              type="button"
              aria-label={M.attachmentRemove(f.name)}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="press flex size-11 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-surface-2 hover:text-danger"
            >
              <XIcon size={16} />
            </button>
          </li>
        ))}
        {busy > 0 && (
          <li role="status" className="flex items-center gap-3 rounded-[var(--radius-inset)] bg-surface-4 px-3 py-3 text-[13px] text-mut shadow-hair">
            <SpinnerIcon size={16} className="animate-spin" />
            {M.uploading} ({busy})
          </li>
        )}
        {!full && (
          <li>
            <button
              type="button"
              onClick={open}
              className={cn(
                "press flex h-full min-h-[54px] w-full items-center justify-center gap-2 rounded-[var(--radius-inset)] border border-dashed border-line-strong text-[13.5px] font-semibold text-mut transition-colors hover:border-acc hover:bg-acc-soft hover:text-acc",
              )}
            >
              <ToolIcon name="file" size={16} />
              {M.toolFile}
            </button>
          </li>
        )}
      </ul>
      {input}
    </div>
  );
}
