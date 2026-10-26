// /indie/mine — 등록현황(기획서 v2.0 S-22, 목업 mstPage). 내가 올린 게임의 승인 상태를 한 화면에서 본다.
// 머리(제목, "내 게임 등록", 설명), 상단 집계 네 칸(전체 신청, 승인 대기, 등록 완료, 반려), 진행 순서 안내, 줄 목록, 아래 각주.
// 반려 칸을 더한 이유: 기획서와 목업은 세 칸이지만 반려(협의 항목)를 실제로 두고 있어서, 세 칸이면 "전체" 가 나머지 둘의 합과 맞지 않는다.
// 줄은 왼쪽에 이름과 "플랫폼, 장르 | 신청일", 오른쪽에 상태 알약과 한 줄 설명(운영진 확인 중, 노출 중, 반려 사유).
// 반려된 글은 "고쳐서 다시 신청" 으로 고치기 화면에 간다 — 저장하면 다시 승인 대기다(services/indie/write).
import type { Metadata } from "next";
import Link from "next/link";
import { StatTile } from "@/components/community/news-blocks";
import { WriteLink } from "@/components/community/write-link";
import { EmptyState } from "@/components/empty-state";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { formatDotDate } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { INDIE_POSTS_PER_USER_MAX } from "@/lib/indie/constants";
import { genreLabels, INDIE_FORM_MESSAGES as M, INDIE_MESSAGES, INDIE_PLATFORM_LABEL, INDIE_REVIEW_LABEL, INDIE_REVIEW_MESSAGES as RV } from "@/lib/indie/messages";
import { indieDetailHref, INDIE_FROM } from "@/lib/indie/query";
import { indieEditPath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyIndiePosts } from "@/server/services/indie";

export const metadata: Metadata = { title: RV.title, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** 상태 알약 — 테두리 알약(목업 .stt). 승인 대기 주황, 등록 완료 브랜드색, 반려 빨강 */
const PILL: Record<keyof typeof INDIE_REVIEW_LABEL, string> = {
  pending: "bg-warn-soft text-warn shadow-[inset_0_0_0_1px_var(--warn)]",
  approved: "bg-acc-soft text-acc shadow-[inset_0_0_0_1px_var(--acc)]",
  rejected: "bg-danger-soft text-danger shadow-[inset_0_0_0_1px_var(--danger)]",
};

export default async function IndieMinePage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const [posts, sp] = await Promise.all([listMyIndiePosts(user.id), searchParams]);
  const full = posts.length >= INDIE_POSTS_PER_USER_MAX;
  const pending = posts.filter((p) => p.review === "pending").length;
  const approved = posts.filter((p) => p.review === "approved").length;
  const rejected = posts.filter((p) => p.review === "rejected").length;

  return (
    <Page gap={20}>
      <PageHead title={RV.title} action={!full && <WriteLink href={ROUTES.indieNew}>{INDIE_MESSAGES.register}</WriteLink>}>
        <p className="text-[14px] text-mut">{RV.lead}</p>
      </PageHead>
      {firstParam(sp.full) && full && <FormMessage tone="info">{M.tooManyPosts(INDIE_POSTS_PER_USER_MAX)}</FormMessage>}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <StatTile label={RV.total} value={posts.length} />
        <StatTile label={INDIE_REVIEW_LABEL.pending} value={pending} />
        <StatTile label={INDIE_REVIEW_LABEL.approved} value={approved} />
        <StatTile label={INDIE_REVIEW_LABEL.rejected} value={rejected} />
      </div>
      {/* 기획서 S-22 승인 흐름 "신청, 운영진 승인, 최종 등록" 안내. 화살표 글자 대신 순서를 문장으로 말한다(AGENTS 4장) */}
      <p role="note" className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 text-[13.5px] leading-[1.6] text-mut shadow-hair">
        {RV.flow}
      </p>

      {posts.length === 0 ? (
        <EmptyState title={M.mineEmpty} description={RV.emptyLead} action={{ href: ROUTES.indieNew, label: INDIE_MESSAGES.register }} />
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair">
          {posts.map((p) => {
            const meta = [[...p.platforms.map((x) => INDIE_PLATFORM_LABEL[x]), ...genreLabels(p.genres)].join(", "), `${formatDotDate(p.createdAt)} ${RV.applied}`].filter(Boolean).join(" | ");
            const note = p.review === "pending" ? RV.pendingShort : p.review === "approved" ? (p.status === "published" ? (p.hasCover ? RV.liveShort : INDIE_MESSAGES.noCoverShort) : INDIE_MESSAGES.hiddenShort) : `${RV.reason}: ${p.reviewReason ?? "-"}`;
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 flex-col gap-1">
                  {/* 등록 완료 줄은 공개 상세로, 그 밖은 고치기로 간다(기획서 S-22 "등록 완료 행은 S-19 로") */}
                  <Link href={p.review === "approved" ? indieDetailHref(p.slug, INDIE_FROM.mine) : indieEditPath(p.id)} className="min-w-0 truncate text-[15px] font-bold text-ink hover:text-acc">
                    {p.title}
                  </Link>
                  <span className="truncate text-[12.5px] text-dim">{meta}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <span className={cn("rounded-full px-3 py-[3px] text-[12.5px] font-bold", PILL[p.review])}>{INDIE_REVIEW_LABEL[p.review]}</span>
                  {/* 반려 사유는 길 수 있다 — 잘리면 눌러서 전문을 보게 Clamp 로 자른다(AGENTS 3장) */}
                  <Clamp lines={1} className={cn("max-w-[180px] text-[12px] sm:max-w-[280px]", p.review === "rejected" ? "text-danger" : "text-dim")}>
                    {note}
                  </Clamp>
                  {p.review === "rejected" && (
                    <Link href={indieEditPath(p.id)} className="text-[12.5px] font-semibold text-acc hover:underline">
                      {RV.resubmit}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[12px] text-dim">{RV.footnote}</p>
    </Page>
  );
}
