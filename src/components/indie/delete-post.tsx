"use client";
// 글 지우기 — 고치기 화면과 공개 상세(본인 게임, 기획서 S-19 "본인 게임이면 수정, 삭제", 목업 mgDetail 의 삭제)가 같이 쓴다.
// 확인은 브라우저 confirm 대신 같은 자리에서 한 번 더 묻는다 — confirm 창은 모바일에서 문구가 잘리고
// 화면 문체("-해요")를 따르지 않는다.
// 지우기가 실패하면 확인 줄을 접고 처음 단추로 되돌린 뒤 사유를 보인다 — 확인 줄에 머물면 "지우는 중" 처럼 읽힌다.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteIndiePostAction } from "@/app/(user)/indie/actions";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";

export function DeleteIndiePost({ postId }: { postId: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const errorLine = error && (
    <p role="alert" className="w-full text-[12.5px] text-danger">
      {error}
    </p>
  );

  if (!asking) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            setError(null);
            setAsking(true);
          }}
        >
          {M.delete}
        </Button>
        {errorLine}
      </div>
    );
  }
  return (
    <div role="group" aria-label={M.delete} className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-ink">{M.deleteConfirm}</span>
      <Button
        variant="danger"
        size="sm"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await deleteIndiePostAction(postId);
            if (!r.ok) {
              setAsking(false);
              setError(r.error);
              return;
            }
            router.push(ROUTES.indieMine);
          })
        }
      >
        {M.deleteYes}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setAsking(false)} disabled={pending}>
        {M.deleteNo}
      </Button>
    </div>
  );
}
