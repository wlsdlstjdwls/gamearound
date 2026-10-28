// /indie/new — 내 게임 등록(기획서 v2.0 S-23, 목업 indreg). (user) 무리라 레이아웃이 로그인을 이미 본다.
// 배치: 제목과 설명, 승인 안내 한 줄(2026-10-28 회색 띠를 걷어 세로를 줄였다), 왼쪽 폼, 오른쪽 "내가 올린 게임" 칸(줄마다 이름, 플랫폼과 장르 알약, 신청일, 상태 알약, 삭제 — 목업 indreg .mgr).
// 줄과 삭제는 클라이언트 부품(components/indie/mine-aside-list)이 그린다 — 누른 즉시 줄을 빼야 해서다.
// 글 수 상한에 닿은 사람에게는 폼 대신 내 글 목록을 보여 준다 — 다 적고 나서 "더 못 올려요" 를 듣게 하지 않는다.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IndieMineAsideList } from "@/components/indie/mine-aside-list";
import { IndiePostForm } from "@/components/indie/post-form";
import { Page, PageHead } from "@/components/ui/page";
import { InfoIcon } from "@/components/ui/icons";
import { INDIE_POSTS_PER_USER_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";
import { ROUTES } from "@/lib/routes";
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
      <p role="note" className="flex items-start gap-2 text-[13px] leading-[1.6] text-mut">
        <InfoIcon size={15} className="mt-[3px] shrink-0 text-acc" />
        {M.approvalNotice}
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:p-6">
          <IndiePostForm />
        </div>
        {/* 내가 올린 게임(2026-10-28 사용자: "좀 더 강조"). 머리에 개수를 달고, 판 위쪽에 브랜드색 띠를 둘러 폼과 다른 판으로 읽히게 한다 */}
        <aside aria-labelledby="mine-aside" className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair [box-shadow:inset_0_3px_0_var(--acc),var(--ring-hair)] lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <h2 id="mine-aside" className="flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.03em] text-ink">
            {M.mineAside}
            <span className="rounded-full bg-acc-soft px-2 py-0.5 text-[12.5px] font-bold tabular-nums text-acc">{mine.length}</span>
          </h2>
          <IndieMineAsideList rows={mine} />
          <p className="text-[12.5px] leading-[1.6] text-dim">{M.mineAsideFlow}</p>
        </aside>
      </div>
    </Page>
  );
}
