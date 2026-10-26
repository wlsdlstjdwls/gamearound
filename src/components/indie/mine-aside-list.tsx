"use client";
// 내 게임 등록(S-23) 오른쪽 "내가 올린 게임" 줄들 — 줄마다 이름, 플랫폼과 장르 알약, 신청일, 상태 알약, 삭제(목업 indreg 의 .mgr, .rm).
//
// 삭제는 확인을 한 번 받은 뒤 누른 즉시 줄을 뺀다(AGENTS 6장 "누른 순간 화면이 먼저 바뀐다"). 실패하면 줄을 되살리고 사유를 위에 띄운다.
// 확인 줄은 상세, 고치기 화면과 같은 부품(DeleteIndiePost)을 onConfirm 으로 빌린다 — 확인 문구와 모양이 화면마다 갈라지지 않게.
// 성공하면 서버 화면을 새로 읽는다(router.refresh) — 글 수 상한에 닿아 폼이 막혀 있던 사람이 지운 뒤 바로 다시 쓸 수 있게.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteIndiePostAction } from "@/app/(user)/indie/actions";
import { DeleteIndiePost } from "@/components/indie/delete-post";
import { IndieTagPills } from "@/components/indie/indie-card";
import { Tag } from "@/components/ui/tag";
import { formatDate } from "@/lib/format";
import type { IndieMineRowDto } from "@/lib/indie/dto";
import { INDIE_FORM_MESSAGES as M, INDIE_REVIEW_LABEL, INDIE_REVIEW_MESSAGES as RV, INDIE_REVIEW_TONE } from "@/lib/indie/messages";
import { indieEditPath, indiePath } from "@/lib/routes";

type Row = Pick<IndieMineRowDto, "id" | "slug" | "title" | "platforms" | "genres" | "review" | "createdAt">;

export function IndieMineAsideList({ rows }: { rows: readonly Row[] }) {
  const router = useRouter();
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<{ tone: "error" | "done"; text: string } | null>(null);
  const [, start] = useTransition();
  const visible = rows.filter((r) => !removed.has(r.id));

  function remove(id: string) {
    setNotice(null);
    setRemoved((cur) => new Set(cur).add(id));
    start(async () => {
      const r = await deleteIndiePostAction(id).catch(() => ({ ok: false as const, error: M.badRequest }));
      if (!r.ok) {
        setRemoved((cur) => {
          const next = new Set(cur);
          next.delete(id);
          return next;
        });
        setNotice({ tone: "error", text: r.error });
        return;
      }
      setNotice({ tone: "done", text: M.deleted });
      router.refresh();
    });
  }

  return (
    <>
      <p role={notice?.tone === "error" ? "alert" : "status"} className={notice ? (notice.tone === "error" ? "text-[12.5px] text-danger" : "text-[12.5px] text-mut") : "sr-only"}>
        {notice?.text}
      </p>
      {visible.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-[var(--radius-inset)] bg-surface-2 px-3.5 py-4">
          <p className="text-[14px] font-bold text-ink">{M.mineAsideEmpty}</p>
          <p className="text-[12.5px] text-dim">{M.mineAsideEmptyLead}</p>
        </div>
      ) : (
        <ul className="divide-y divide-line-soft">
          {visible.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 flex-col gap-1">
                  <Link href={p.review === "approved" ? indiePath(p.slug) : indieEditPath(p.id)} className="truncate text-[14px] font-semibold text-ink hover:text-acc">
                    {p.title}
                  </Link>
                  <IndieTagPills platforms={p.platforms} genres={p.genres} />
                  <span className="text-[12px] text-dim">
                    {formatDate(p.createdAt)} {RV.applied}
                  </span>
                </span>
                <Tag tone={INDIE_REVIEW_TONE[p.review]}>{INDIE_REVIEW_LABEL[p.review]}</Tag>
              </div>
              <div className="flex justify-end">
                <DeleteIndiePost postId={p.id} label={M.deleteShort} onConfirm={() => remove(p.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
