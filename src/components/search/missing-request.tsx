"use client";
// 검색 결과의 "이 게임 추가 요청" 단추. 누르는 즉시 "요청했어요" 로 바뀌고 실패하면 되돌린다(AGENTS §6).
// 같은 화면에서 두 번 누르지 못하게 받은 뒤에는 단추 자리를 글로 바꾼다 — 한 사람이 같은 말을 여러 번 세면 순위가 흐려진다.
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon } from "@/components/ui/icons";
import { SEARCH_MESSAGES as M } from "@/lib/search/messages";
import { requestMissingGameAction } from "@/app/(public)/search/actions";

export function MissingGameRequest({ q }: { q: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  if (done) {
    return (
      <p role="status" className="animate-rise inline-flex items-center gap-1.5 text-[13px] font-semibold text-acc">
        <CheckCircleIcon size={16} />
        {M.requested}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        size="sm"
        onClick={() => {
          setDone(true);
          setError(null);
          start(async () => {
            const res = await requestMissingGameAction(q);
            if (!res.ok) {
              setDone(false);
              setError(res.error);
            }
          });
        }}
      >
        {M.request}
      </Button>
      {error && (
        <p role="alert" className="text-[11.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
