"use client";
// 글 지우기 — 고치기 화면과 공개 상세(본인 게임, 기획서 S-19 "본인 게임이면 수정, 삭제", 목업 mgDetail 의 삭제)가 같이 쓴다.
// 확인은 브라우저 confirm 대신 공용 확인 팝업(ui/confirm-dialog)으로 묻는다 — confirm 창은 모바일에서 문구가 잘리고
// 화면 문체("-해요")를 따르지 않는다. 예전에는 단추 자리에서 문구 한 줄로 되물었는데(2026-10-28 사용자: "문구만으로 하네")
// 줄 안의 작은 글자라 눈에 안 띄어 팝업으로 바꿨다.
// 지우기가 실패하면 처음 단추 옆에 사유를 보인다.
// onConfirm 을 주면 확인만 여기서 받고 지우기는 부르는 쪽이 한다 — 등록 화면 "내가 올린 게임" 줄은 누른 즉시 줄을 빼고
// 실패하면 되돌려야 해서(AGENTS 6장), 줄과 함께 사라지는 이 단추가 결과를 기다릴 수 없다(components/indie/mine-aside-list).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteIndiePostAction } from "@/app/(user)/indie/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ROUTES } from "@/lib/routes";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";

export function DeleteIndiePost({ postId, title, label = M.delete, onConfirm }: { postId: string; title?: string; label?: string; onConfirm?: () => void }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    if (onConfirm) {
      onConfirm();
      return;
    }
    start(async () => {
      const r = await deleteIndiePostAction(postId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(ROUTES.indieMine);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="danger"
        size="sm"
        loading={pending}
        onClick={() => {
          setError(null);
          setAsking(true);
        }}
      >
        {label}
      </Button>
      {error && (
        <p role="alert" className="w-full text-[12.5px] text-danger">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={asking}
        title={title ? M.deleteTitle(title) : M.delete}
        description={M.deleteConfirm}
        confirmLabel={M.deleteYes}
        cancelLabel={M.deleteNo}
        onConfirm={confirm}
        onClose={() => setAsking(false)}
      />
    </div>
  );
}
