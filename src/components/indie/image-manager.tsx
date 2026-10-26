"use client";
// 홍보 글 그림 칸 — 대표 그림(첫 장)과 스크린샷. 고치기 화면에 붙는다.
//
// 올리는 길은 ./upload-images 한 벌이다(새 글 폼과 같이 쓴다).
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { makeIndieCoverAction, removeIndieImageAction } from "@/app/(user)/indie/actions";
import { uploadIndieImages } from "@/components/indie/upload-images";
import { buttonClass } from "@/components/ui/button";
import { FadeImage } from "@/components/ui/fade-image";
import { XIcon } from "@/components/ui/icons";
import { INDIE_IMAGE_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";
import type { IndieImageDto } from "@/lib/indie/dto";

/** 작은 그림 한 칸의 폭(px). 카드 커버와 같은 가로 비율로 보여야 "대표로" 골랐을 때 어떻게 잘릴지 보인다 */
const THUMB_W = 160;
const THUMB_H = Math.round((THUMB_W * 215) / 460);

export function IndieImageManager({ postId, title, images }: { postId: string; title: string; images: IndieImageDto[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const room = INDIE_IMAGE_MAX - images.length;

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > room) setError(M.imageFull(INDIE_IMAGE_MAX));

    const failed = await uploadIndieImages(postId, picked, (done, total) => setProgress({ done, total }));
    if (failed) setError(failed);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startBusy(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? M.imageFailed);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <li key={img.id} className="flex flex-col gap-1.5" style={{ width: THUMB_W }}>
            <div className="relative" style={{ width: THUMB_W, height: THUMB_H }}>
              <FadeImage
                src={img.url}
                alt={i === 0 ? M.imageCover : `${title} ${i + 1}`}
                width={THUMB_W}
                height={THUMB_H}
                sizes={`${THUMB_W}px`}
                className="h-full w-full rounded-[var(--radius-sm)] object-cover"
              />
              <button
                type="button"
                onClick={() => run(() => removeIndieImageAction(postId, img.id))}
                disabled={busy}
                aria-label={`${M.imageRemove} ${i + 1}`}
                // 누르는 영역은 44px(AGENTS §6), 보이는 동그라미는 그림을 덜 가리게 작게
                className="press absolute -top-4 -right-4 flex h-11 w-11 items-center justify-center"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-bg text-ink">
                  <XIcon size={14} aria-hidden />
                </span>
              </button>
            </div>
            {i === 0 ? (
              <span className="text-[12px] font-semibold text-acc">{M.imageCover}</span>
            ) : (
              <button
                type="button"
                onClick={() => run(() => makeIndieCoverAction(postId, img.id))}
                disabled={busy}
                className="tap self-start text-[12px] text-mut hover:text-ink"
              >
                {M.imageMakeCover}
              </button>
            )}
          </li>
        ))}
        {room > 0 && (
          <li>
            <label
              className={buttonClass({ variant: "secondary", size: "sm", className: "relative cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}
              style={{ width: THUMB_W, height: THUMB_H }}
              aria-disabled={progress !== null}
            >
              {progress ? M.imageUploading(progress.done + 1, progress.total) : M.imageAdd}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={progress !== null}
                className="sr-only"
                onChange={(e) => void onPick(e.currentTarget.files)}
              />
            </label>
          </li>
        )}
      </ul>
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
