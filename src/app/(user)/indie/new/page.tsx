// /indie/new — 내 게임 등록(기획서 v2.0 S-23, 목업 indreg). (user) 무리라 레이아웃이 로그인을 이미 본다.
// 배치: 제목과 설명, 승인 안내 띠, 왼쪽 폼, 오른쪽 "내가 올린 게임" 칸(상태 알약과 진행 순서).
// 글 수 상한에 닿은 사람에게는 폼 대신 내 글 목록을 보여 준다 — 다 적고 나서 "더 못 올려요" 를 듣게 하지 않는다.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IndiePostForm } from "@/components/indie/post-form";
import { Page, PageHead } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { formatDate } from "@/lib/format";
import { INDIE_POSTS_PER_USER_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M, INDIE_REVIEW_LABEL, INDIE_REVIEW_MESSAGES as RV, INDIE_REVIEW_TONE } from "@/lib/indie/messages";
import { indieEditPath, indiePath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyIndiePosts } from "@/server/services/indie";

export const metadata: Metadata = { title: M.newTitle, robots: { index: false } };

export default async function IndieNewPage() {
  const user = await requireUserOrRedirect();
  const mine = await listMyIndiePosts(user.id);
  if (mine.length >= INDIE_POSTS_PER_USER_MAX) redirect(`${ROUTES.indieMine}?full=1`);

  return (
    <Page gap={20}>
      <PageHead title={M.newTitle}>
        <p className="text-[14px] text-mut">{M.newLead}</p>
      </PageHead>
      <p role="note" className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 text-[13.5px] leading-[1.6] text-mut shadow-hair">
        {M.approvalNotice}
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:p-6">
          <IndiePostForm />
        </div>
        <aside aria-labelledby="mine-aside" className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <h2 id="mine-aside" className="text-[16px] font-extrabold tracking-[-0.03em] text-ink">
            {M.mineAside}
          </h2>
          {mine.length === 0 ? (
            <div className="flex flex-col gap-1 rounded-[var(--radius-inset)] bg-surface-2 px-3.5 py-4">
              <p className="text-[14px] font-bold text-ink">{M.mineAsideEmpty}</p>
              <p className="text-[12.5px] text-dim">{M.mineAsideEmptyLead}</p>
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {mine.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="flex min-w-0 flex-col">
                    <Link href={p.review === "approved" ? indiePath(p.slug) : indieEditPath(p.id)} className="truncate text-[14px] font-semibold text-ink hover:text-acc">
                      {p.title}
                    </Link>
                    <span className="text-[12px] text-dim">
                      {formatDate(p.createdAt)} {RV.applied}
                    </span>
                  </span>
                  <Tag tone={INDIE_REVIEW_TONE[p.review]}>{INDIE_REVIEW_LABEL[p.review]}</Tag>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12.5px] leading-[1.6] text-dim">{M.mineAsideFlow}</p>
        </aside>
      </div>
    </Page>
  );
}
