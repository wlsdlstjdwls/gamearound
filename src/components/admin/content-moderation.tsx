"use client";
// 게시글, 댓글 한 줄의 숨기기 / 되살리기 단추(/admin/posts).
//
// 누른 순간 단추와 딱지가 먼저 바뀐다(AGENTS §6, settings/personalization-controls 가 본보기). 서버가 실패하면 되돌리고 까닭을 띄운다.
// disabled 로 흐리지 않는다 — 다시 누르면 반대 동작이 되고, 그것도 같은 규칙으로 즉시 바뀐다.
// 확인 창을 묻지 않는 이유: 숨김은 지우기가 아니라 되살리기가 단추 한 번이다. 백 줄을 훑는 화면에서 줄마다 묻는 창은 비용만 크다.
//
// 상태를 처음 값으로만 받는다. 서버가 줄을 다시 그리면 부모가 key 에 상태를 섞어 이 단추를 새로 세운다(page 의 key).
import { useState, useTransition } from "react";
import { moderateContentAction } from "@/app/(admin)/admin/posts/actions";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { POST_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import type { ContentModerationInput } from "@/lib/admin/moderation-schema";

type Status = "published" | "hidden";

export function ContentModeration({ kind, id, status }: { kind: ContentModerationInput["kind"]; id: string; status: Status }) {
  const [current, setCurrent] = useState<Status>(status);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const changed = current !== status;

  function toggle() {
    const prev = current;
    const next: Status = prev === "published" ? "hidden" : "published";
    setCurrent(next);
    setError(null);
    start(async () => {
      const res = await moderateContentAction({ kind, id, decision: next === "hidden" ? "hide" : "restore" }).catch(() => ({ ok: false as const, error: M.failed }));
      if (!res.ok) {
        setCurrent(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={current === "published" ? "danger" : "secondary"} onClick={toggle}>
          {current === "published" ? M.hide : M.restore}
        </Button>
        {/* 방금 바꾼 줄에만 딱지를 단다 — 백 줄 가운데 어느 줄을 눌렀는지가 남아야 한다 */}
        {changed && (
          <span role="status">
            <Tag tone={current === "hidden" ? "warn" : "ok"}>{current === "hidden" ? M.hidden : M.restored}</Tag>
          </span>
        )}
      </div>
      {error && (
        <span role="alert" className="text-[11.5px] text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
