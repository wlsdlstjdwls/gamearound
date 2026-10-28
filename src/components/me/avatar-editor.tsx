"use client";
// 프로필 사진 바꾸기(기획서 v2.0 S-24, 6.1 "프로필 사진 변경"): 원본은 20MB 까지 받아 브라우저가 줄이고, 넘으면 안내만 하고 바꾸지 않는다.
// 고른 그림은 바로 미리보기로 바뀌고(누른 순간 화면이 먼저 바뀐다), 올리기가 실패하면 원래 사진으로 되돌린다.
// 올리는 길은 인디 그림과 같다: 브라우저가 줄이고(resizePhoto) 토큰을 받아 Blob 으로 곧장 올린 뒤 액션이 주소를 적는다.
import { upload } from "@vercel/blob/client";
import { useRef, useState, useTransition } from "react";
import { resetAvatarAction, setAvatarAction } from "@/app/(user)/me/actions";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AVATAR_PICK_MAX_BYTES, avatarPrefix, ME_MESSAGES as M } from "@/lib/me/constants";
import { ROUTES } from "@/lib/routes";
import { resizePhoto } from "@/lib/shops/photo-resize";

export function AvatarEditor({ userId, name, initialUrl }: { userId: string; name: string; initialUrl: string | null }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const onPick = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > AVATAR_PICK_MAX_BYTES) {
      setError(M.avatarTooBig);
      if (input.current) input.current.value = "";
      return;
    }
    const before = url;
    setUrl(URL.createObjectURL(file));
    start(async () => {
      try {
        const photo = await resizePhoto(file);
        const blob = await upload(`${avatarPrefix(userId)}avatar.${photo.ext}`, photo.blob, { access: "public", handleUploadUrl: ROUTES.apiAvatarUpload, contentType: photo.blob.type });
        const r = await setAvatarAction({ url: blob.url, pathname: blob.pathname });
        if (!r.ok) throw new Error(r.error);
        setUrl(blob.url);
        toast(M.avatarChanged);
      } catch (e) {
        setUrl(before);
        setError(e instanceof Error && e.message ? e.message : M.avatarFailed);
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  };

  const reset = () =>
    start(async () => {
      const before = url;
      setUrl(null);
      const r = await resetAvatarAction();
      if (!r.ok) {
        setUrl(before);
        setError(r.error);
        return;
      }
      toast(M.avatarResetDone);
    });

  return (
    <div className="flex items-center gap-5">
      <span className="relative flex size-24 shrink-0 sm:size-28 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-[34px] font-black text-acc shadow-hair">
        {url ? (
          // 미리보기는 blob: 주소라 next/image 최적화를 탈 수 없다 — 그냥 img 다
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </span>
      <div className="flex flex-col gap-2">
        <p className="text-[18px] font-extrabold text-ink">{name}</p>
        <div className="flex flex-wrap gap-2">
          <label className={buttonClass({ variant: "secondary", size: "sm", className: busy ? "pointer-events-none opacity-60" : "cursor-pointer" })}>
            {M.avatarChange}
            <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
          </label>
          {url && (
            <button type="button" onClick={reset} disabled={busy} className={buttonClass({ variant: "ghost", size: "sm" })}>
              {M.avatarReset}
            </button>
          )}
        </div>
        <p className="text-[12px] text-dim">{M.avatarHint}</p>
        {error && (
          <p role="alert" className="text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
