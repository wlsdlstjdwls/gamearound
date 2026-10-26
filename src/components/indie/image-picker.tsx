"use client";
// 새 글 폼의 그림 고르기(기획서 v2.0 S-23, 목업 indreg 의 "대표 이미지"). 고르기만 하고 올리지는 않는다 —
// 그림은 글 id 가 Blob 경로에 박혀야 올릴 수 있어서(lib/indie/schemas 주석) 폼이 글을 저장한 뒤 ./upload-images 로 올린다.
// 고친 화면의 그림 칸(./image-manager)과 같은 크기, 같은 "첫 장이 대표" 규칙으로 보여 준다 — 올린 뒤 그 칸에서 같은 순서로 다시 만난다.
import { useEffect, useMemo, useRef } from "react";
import { buttonClass } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { INDIE_IMAGE_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";

/** 작은 그림 한 칸 — image-manager 와 같은 크기(카드 커버 가로 비율) */
const THUMB_W = 160;
const THUMB_H = Math.round((THUMB_W * 215) / 460);

export function IndieImagePicker({ files, onChange, disabled }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  // 미리보기 주소는 고른 파일이 바뀔 때만 새로 만들고, 바뀌면 옛 주소를 풀어 준다(안 풀면 고를 때마다 메모리에 쌓인다)
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const room = INDIE_IMAGE_MAX - files.length;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-mut">{M.imagesTitle}</span>
      <p className="text-[12.5px] leading-[1.6] text-dim">{M.imagesLead}</p>
      <ul className="flex flex-wrap gap-3 pt-1">
        {files.map((f, i) => (
          <li key={`${f.name}-${f.lastModified}-${i}`} className="flex flex-col gap-1.5" style={{ width: THUMB_W }}>
            <div className="relative" style={{ width: THUMB_W, height: THUMB_H }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저 안 미리보기(blob: 주소)라 next/image 최적화가 닿지 않는다 */}
              <img src={previews[i]} alt={i === 0 ? M.imageCover : `${M.imagesTitle} ${i + 1}`} className="h-full w-full rounded-[var(--radius-sm)] object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                disabled={disabled}
                aria-label={`${M.imageRemove} ${i + 1}`}
                // 누르는 영역은 44px(AGENTS 6장), 보이는 동그라미는 그림을 덜 가리게 작게
                className="press absolute -top-4 -right-4 flex h-11 w-11 items-center justify-center"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-bg text-ink">
                  <XIcon size={14} aria-hidden />
                </span>
              </button>
            </div>
            {i === 0 && <span className="text-[12px] font-semibold text-acc">{M.imageCover}</span>}
          </li>
        ))}
        {room > 0 && (
          <li>
            <label
              className={buttonClass({ variant: "secondary", size: "sm", className: "relative cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}
              style={{ width: THUMB_W, height: THUMB_H }}
              aria-disabled={disabled}
            >
              {M.imagePick}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={disabled}
                className="sr-only"
                onChange={(e) => {
                  const picked = Array.from(e.currentTarget.files ?? []);
                  onChange([...files, ...picked].slice(0, INDIE_IMAGE_MAX));
                  if (inputRef.current) inputRef.current.value = "";
                }}
              />
            </label>
          </li>
        )}
      </ul>
    </div>
  );
}
