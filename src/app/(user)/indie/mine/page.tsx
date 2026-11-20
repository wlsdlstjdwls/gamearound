// /indie/mine — 등록현황(기획서 v2.0 S-22, 목업 mstPage). 내가 올린 게임의 승인 상태를 한 화면에서 본다.
// 머리(제목, "내 게임 등록", 설명), 상단 집계 네 칸(전체 신청, 승인 대기, 등록 완료, 반려), 줄 목록.
// 진행 순서 안내와 아래 각주는 2026-10-27 걷었다(사용자: 두 문구 지우고 하단 공백 줄이기) — 머리 설명이 같은 말을 이미 한다.
// 반려 줄(2026-10-27 사용자): 사유는 한 줄 맛보기 + "사유 보기"(바닥 시트에 전문, indie/rejection-sheet), "고쳐서 다시 신청" 은 채운 단추.
// 반려 칸을 더한 이유: 기획서와 목업은 세 칸이지만 반려(협의 항목)를 실제로 두고 있어서, 세 칸이면 "전체" 가 나머지 둘의 합과 맞지 않는다.
// 줄(2026-10-28 사용자: "밋밋하다, 이미지도 설명도 없다"): 왼쪽 대표 그림, 가운데 이름과 한 줄 소개와 "플랫폼, 장르 | 신청일",
// 오른쪽 진행 단계 셋(indie/review-steps)과 한 줄 설명, 할 일 단추. 줄은 차례로 떠오른다(stagger). 상태 알약은 단계 그림이 대신한다.
// 공개 중인 게임 줄에는 "광고 걸기", 목록 위에는 광고 안내 판(payments/plan-nudge)을 둔다 — 광고, 멤버십 메뉴 칸 대신(10-28).
// 반려된 글은 "고쳐서 다시 신청" 으로 고치기 화면에 간다 — 저장하면 다시 승인 대기다(services/indie/write).
// 게임 한 줄은 indie/mine-row 가 그린다(2026-11-20 뺐다).
import { PlanNudge } from "@/components/payments/plan-nudge";
import type { Metadata } from "next";
import { WriteLink } from "@/components/community/write-link";
import { EmptyState } from "@/components/empty-state";
import { FameChallenge } from "@/components/indie/fame-challenge";
import { MineRow } from "@/components/indie/mine-row";
import { MineTabs } from "@/components/indie/mine-tabs";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead, PageLead } from "@/components/ui/page";
import { stagger } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { firstParam } from "@/lib/games-query";
import { INDIE_POSTS_PER_USER_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M, INDIE_MESSAGES, INDIE_REVIEW_LABEL, INDIE_REVIEW_MESSAGES as RV } from "@/lib/indie/messages";
import { ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyFameStanding, getMyMonthRanks, listMyIndiePosts } from "@/server/services/indie";
import { PAID_PRODUCTS_ON } from "@/lib/payments/flags";

export const metadata: Metadata = { title: RV.title, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * 위 집계 칸. 색 점(먹, 파랑, 초록, 빨강)을 걷었다(2026-11-20 사용자 "색상도 너무 많이 써서 눈아픔") — 칸 이름이 이미 상태를 말한다.
 * 상태는 글자와 무게로 가른다: 센 것이 있는 칸은 먹색 굵은 숫자, 0 인 칸은 회색. 숫자는 들어올 때 한 번 떠오른다.
 * 좁은 화면은 판 한 장에 네 칸을 한 줄로 세운다 — 2x2 흰 판 네 장이 목록보다 먼저 첫 화면을 먹었다. 넓은 화면은 칸마다 판 그대로다
 */
function Tile({ label, value, i }: { label: string; value: number; i: number }) {
  return (
    <div className="enter-item flex min-w-0 flex-col gap-0.5 px-3 py-3 sm:gap-1 sm:rounded-[var(--radius-md)] sm:bg-surface sm:px-4 sm:py-3.5 sm:shadow-hair" style={stagger(i)}>
      <span className="truncate text-[12px] text-dim sm:text-[12.5px]">{label}</span>
      <span className={cn("text-[20px] font-black tabular-nums sm:text-[26px]", value > 0 ? "text-ink" : "text-dim")}>{value.toLocaleString("ko-KR")}</span>
    </div>
  );
}

export default async function IndieMinePage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  // 명예의 전당 도전 판은 덤이다 — 못 세면 판만 빠지고 화면은 선다. 목록과 기다릴 일이 없어 나란히 묻는다
  const [posts, sp, standing] = await Promise.all([listMyIndiePosts(user.id), searchParams, getMyFameStanding().catch(() => null)]);
  // 순위는 덤이다 — 못 세면 순위 칸만 빠지고 화면은 선다
  const ranks = await getMyMonthRanks(posts.filter((p) => p.review === "approved").map((p) => p.id)).catch(() => new Map<string, number>());
  const full = posts.length >= INDIE_POSTS_PER_USER_MAX;
  const pending = posts.filter((p) => p.review === "pending").length;
  const approved = posts.filter((p) => p.review === "approved").length;
  const rejected = posts.filter((p) => p.review === "rejected").length;

  return (
    <Page gap={20}>
      <MineTabs current={ROUTES.indieMine} />
      <PageHead menuScreen leadRow title={RV.title} action={!full && <WriteLink href={ROUTES.indieNew} size="head">{INDIE_MESSAGES.register}</WriteLink>}>
        <PageLead>{RV.lead}</PageLead>
      </PageHead>
      {firstParam(sp.full) && full && <FormMessage tone="info">{M.tooManyPosts(INDIE_POSTS_PER_USER_MAX)}</FormMessage>}
      <div className="grid grid-cols-4 divide-x divide-line-soft rounded-[var(--radius-md)] bg-surface shadow-hair sm:gap-3.5 sm:divide-x-0 sm:rounded-none sm:bg-transparent sm:shadow-none">
        <Tile label={RV.total} value={posts.length} i={0} />
        <Tile label={INDIE_REVIEW_LABEL.pending} value={pending} i={1} />
        <Tile label={INDIE_REVIEW_LABEL.approved} value={approved} i={2} />
        <Tile label={INDIE_REVIEW_LABEL.rejected} value={rejected} i={3} />
      </div>

      {/* 명예의 전당 도전(2026-10-30) — 명예의 전당 화면에 떠 있던 "내 게임은 지금" 의 오르는 법을 작업실로 옮겼다(indie/fame-challenge).
          공개 게임이 없으면 standing 이 null 이라 안 선다 */}
      {standing && <FameChallenge standing={standing} />}

      {/* 공개 중인 게임이 있을 때만 광고 안내 판 — 걸 게임이 없는 사람에게 값부터 내밀지 않는다(10-28, 메뉴 대신 화면 안 입구) */}
      {PAID_PRODUCTS_ON && posts.some((p) => p.review === "approved" && p.status === "published") && <PlanNudge />}
      {posts.length === 0 ? (
        <EmptyState title={M.mineEmpty} description={RV.emptyLead} action={{ href: ROUTES.indieNew, label: INDIE_MESSAGES.register }} />
      ) : (
        <ul className="flex flex-col gap-3 sm:gap-3.5">
          {posts.map((p, i) => (
            <MineRow key={p.id} post={p} rank={ranks.get(p.id)} i={i} />
          ))}
        </ul>
      )}
    </Page>
  );
}
