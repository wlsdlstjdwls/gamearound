"use client";
// 글 상세의 내 글 단추 — 수정, 삭제(2026-10-30 사용자 "수정/삭제 기능 다 제공하나"). 글쓴이에게만 선다(post-detail 이 isMine 으로 가른다).
// 지우기는 되돌릴 수 없어 공용 확인 팝업(ui/confirm-dialog 의 askConfirm)으로 한 번 묻는다. 브라우저 confirm 은 쓰지 않는다(no-browser-dialogs).
// 지운 뒤에는 그 카테고리 목록으로 간다 — 지운 글 주소에 남으면 404 다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deletePostAction } from "@/app/(public)/board/actions";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { POST_EDIT_MESSAGES as M } from "@/lib/community/messages";

const LINK = "tap inline-flex items-center font-semibold hover:underline disabled:opacity-60";

export function PostOwnerActions({ postId, title, editHref }: { postId: string; title: string; editHref: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const remove = async () => {
    const ok = await askConfirm(M.deleteBody(title), { title: M.deleteTitle, confirmLabel: M.deleteYes, tone: "danger" });
    if (!ok) return;
    start(async () => {
      const r = await deletePostAction(postId);
      if (!r.ok) return toast(r.error);
      toast(M.deleted);
      router.push(r.redirectTo);
    });
  };

  return (
    <span className="flex items-center gap-3">
      <Link href={editHref} className={`${LINK} text-ink-2`}>
        {M.edit}
      </Link>
      <button type="button" onClick={remove} disabled={pending} className={`${LINK} text-danger`}>
        {M.delete}
      </button>
    </span>
  );
}
