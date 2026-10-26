// /indie/mine — 등록현황(기획서 v2.0 S-22). 내가 올린 게임의 승인 상태를 한 화면에서 본다.
// 상단 집계(총 수, 승인 대기, 등록 완료), 줄마다 상태 알약(승인 대기 주황, 등록 완료 브랜드색, 반려 빨강)과 반려 사유.
// 반려된 글은 "고쳐서 다시 신청" 으로 고치기 화면에 간다 — 저장하면 다시 승인 대기다(services/indie/write).
import type { Metadata } from "next";
import Link from "next/link";
import { StatTile } from "@/components/community/news-blocks";
import { EmptyState } from "@/components/empty-state";
import { IndieStageBadge } from "@/components/indie/stage-badge";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead, ROW, ROWS } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { INDIE_POSTS_PER_USER_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M, INDIE_MESSAGES, INDIE_REVIEW_LABEL, INDIE_REVIEW_MESSAGES as RV, INDIE_REVIEW_TONE } from "@/lib/indie/messages";
import { indieEditPath, indiePath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyIndiePosts } from "@/server/services/indie";

export const metadata: Metadata = { title: RV.title, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function IndieMinePage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const [posts, sp] = await Promise.all([listMyIndiePosts(user.id), searchParams]);
  const full = posts.length >= INDIE_POSTS_PER_USER_MAX;
  const pending = posts.filter((p) => p.review === "pending").length;
  const approved = posts.filter((p) => p.review === "approved").length;

  return (
    <Page width="tight" gap={18}>
      <PageHead
        title={RV.title}
        note={RV.flow}
        action={
          !full && (
            <Link href={ROUTES.indieNew} className={buttonClass({ variant: "primary" })}>
              {INDIE_MESSAGES.cta}
            </Link>
          )
        }
      />
      {firstParam(sp.full) && full && <FormMessage tone="info">{M.tooManyPosts(INDIE_POSTS_PER_USER_MAX)}</FormMessage>}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label={RV.total} value={posts.length} />
        <StatTile label={INDIE_REVIEW_LABEL.pending} value={pending} />
        <StatTile label={INDIE_REVIEW_LABEL.approved} value={approved} />
      </div>

      {posts.length === 0 ? (
        <EmptyState title={M.mineEmpty} description={INDIE_MESSAGES.lead} action={{ href: ROUTES.indieNew, label: INDIE_MESSAGES.cta }} />
      ) : (
        <ul className={ROWS}>
          {posts.map((p) => (
            <li key={p.id} className="flex flex-col gap-1.5 py-3">
              <span className="flex items-center gap-2">
                <Tag tone={INDIE_REVIEW_TONE[p.review]}>{INDIE_REVIEW_LABEL[p.review]}</Tag>
                <IndieStageBadge stage={p.stage} />
                {/* 등록 완료 줄은 공개 상세로, 그 밖은 고치기로 간다(기획서 S-22 "등록 완료 행은 S-19 로") */}
                <Link href={p.review === "approved" ? indiePath(p.slug) : indieEditPath(p.id)} className={cn(ROW, "min-w-0 truncate text-[15px] font-semibold text-ink hover:text-acc")}>
                  {p.title}
                </Link>
              </span>
              <span className="text-[12.5px] text-dim">{RV.appliedAt} {formatDate(p.createdAt)}</span>
              {p.review === "rejected" && (
                <span className="flex flex-wrap items-center gap-2 text-[12.5px] text-danger">
                  {RV.reason}: {p.reviewReason ?? "-"}
                  <Link href={indieEditPath(p.id)} className="font-semibold text-acc hover:underline">
                    {RV.resubmit}
                  </Link>
                </span>
              )}
              {p.status !== "published" && (
                <span className="text-[12.5px] text-warn">
                  {INDIE_MESSAGES.hiddenNotice}
                  {p.statusReason && ` ${p.statusReason}`}
                </span>
              )}
              {p.status === "published" && !p.hasCover && <span className="text-[12.5px] text-mut">{INDIE_MESSAGES.noCoverNotice}</span>}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
