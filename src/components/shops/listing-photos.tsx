"use client";
// 판매 줄 한 줄의 사진 칸 — 작은 사진 줄, 지우기, 추가. 매장주 판매 목록(listing-rows)에 붙는다.
//
// 올리는 길: 고른 사진을 브라우저가 줄이고(lib/shops/photo-resize) → 토큰을 받아 Blob 으로 곧장 올리고 →
// registerPhotoAction 으로 적는다. 우리 서버는 파일을 안 받는다(api/shops/photos/upload 주석).
// 여러 장을 고르면 한 장씩 차례로 올린다. 한꺼번에 보내면 장수 상한 셈이 전부 "아직 비었다" 로 읽힌다.
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { registerPhotoAction, removePhotoAction } from "@/app/(user)/vendor/[shopSlug]/listings/photo-actions";
import { buttonClass } from "@/components/ui/button";
import { FadeImage } from "@/components/ui/fade-image";
import { XIcon } from "@/components/ui/icons";
import { SHOP_PHOTO_UPLOAD_PATH } from "@/lib/routes";
import { LISTING_PHOTO_MAX } from "@/lib/shops/constants";
import { PHOTO_MESSAGES as M } from "@/lib/shops/listing-messages";
import { photoPathPrefix } from "@/lib/shops/photo";
import { resizePhoto } from "@/lib/shops/photo-resize";
import type { ListingPhotoDto } from "@/server/services/listings";

/** 작은 사진 한 칸의 한 변(px). 44px 터치 타깃(AGENTS §6)보다 크게 둔다 — 지우기 버튼이 그 위에 얹힌다 */
const THUMB = 72;

export function ListingPhotos({
  shopSlug,
  shopId,
  listingId,
  listingName,
  photos,
}: {
  shopSlug: string;
  shopId: string;
  listingId: string;
  listingName: string;
  photos: ListingPhotoDto[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();
  const room = LISTING_PHOTO_MAX - photos.length;

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > room) setError(M.full(LISTING_PHOTO_MAX));

    for (let i = 0; i < picked.length; i++) {
      setProgress({ done: i, total: picked.length });
      try {
        const photo = await resizePhoto(picked[i]).catch(() => {
          throw new Error(M.unreadable);
        });
        const blob = await upload(`${photoPathPrefix(shopId, listingId)}photo.${photo.ext}`, photo.blob, {
          access: "public",
          handleUploadUrl: SHOP_PHOTO_UPLOAD_PATH,
          clientPayload: JSON.stringify({ shopSlug, listingId }),
          contentType: photo.blob.type,
        });
        const r = await registerPhotoAction(shopSlug, {
          listingId,
          url: blob.url,
          pathname: blob.pathname,
          width: photo.width,
          height: photo.height,
        });
        if (!r.ok) throw new Error(r.error);
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : M.failed);
        break;
      }
    }
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function onRemove(photoId: string) {
    setError(null);
    startRemove(async () => {
      const r = await removePhotoAction(shopSlug, photoId);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <li key={p.id} className="relative" style={{ width: THUMB, height: THUMB }}>
            <FadeImage
              src={p.url}
              alt={M.alt(listingName, i + 1)}
              width={THUMB}
              height={THUMB}
              sizes={`${THUMB}px`}
              className="h-full w-full rounded-[var(--radius-sm)] object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              disabled={removing}
              aria-label={`${M.remove} ${i + 1}`}
              // 누르는 영역은 44px(AGENTS §6), 보이는 동그라미는 사진을 덜 가리게 작게
              className="press absolute -top-4 -right-4 flex h-11 w-11 items-center justify-center"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-bg text-ink">
                <XIcon size={14} aria-hidden />
              </span>
            </button>
          </li>
        ))}
        {room > 0 && (
          <li>
            <label
              className={buttonClass({ variant: "ghost", size: "sm", className: "relative cursor-pointer" })}
              style={{ height: THUMB }}
              aria-disabled={progress !== null}
            >
              {progress ? M.uploading(progress.done + 1, progress.total) : M.add}
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
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
