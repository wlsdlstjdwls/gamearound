// 게시판 목록 줄(기획서 v2.0 5.2 "목록 행"). 한 줄에 제목 하나로 압축해 많은 글을 보여 준다 —
// 말머리, 관련 게임, 제목, 댓글 수가 왼쪽, 작성자, 날짜, 조회, 좋아요가 오른쪽. 좁은 화면에서는 딱지 줄, 제목, 값 줄 세 줄로 선다.
// 말머리는 카테고리 하나짜리 게시판(공략, 개발일지)에서도 세운다 — 기획서 7장 "말머리: 카테고리별 색이 다름" 은 목록 행의 약속이고,
// 리뷰만 스포 딱지가, 홍보만 유형 딱지가 서는 탓에 공략 줄만 맨 제목으로 시작하면 다른 게시판과 줄 모양이 달라진다.
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/cn";
import { AuthorName, CategoryTag, GameChip, PostTags } from "@/components/community/badges";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { formatPostDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import type { PostRowDto } from "@/server/services/community";

/**
 * rankFrom: 순위 번호의 시작값. 쪽을 넘겨도 순위가 1부터 다시 세지 않게 목록이 앞 쪽의 글 수를 넘긴다.
 * bare: 이미 흰 판 안에 서는 목록(게시판 목록, 내 활동) — 판을 한 겹 더 두르지 않고 줄 사이 선만 긋는다.
 * 홍보 게시판 위 유료 고정 글은 이 줄이 아니라 카드 묶음으로 선다(components/promo/promo-pins, 2026-10-29).
 */
/** quiet: 내 활동 화면 차림 — 말머리 딱지 회색, 댓글 수 빨강, 제목 hover 밑줄, 줄 hover 는 딱지보다 옅은 면(2026-11-23 사용자) */
export function PostList({ posts, rank = false, rankFrom = 1, showCategory = true, empty, bare = false, quiet = false }: { posts: PostRowDto[]; rank?: boolean; rankFrom?: number; showCategory?: boolean; empty?: { title: string; description?: string; action?: { href: string; label: string } }; bare?: boolean; quiet?: boolean }) {
  if (posts.length === 0) return <EmptyState title={empty?.title ?? M.emptyTitle} description={empty?.description ?? M.emptyLead} action={empty?.action} />;
  return (
    <ul className={cn("divide-y divide-line-soft", bare ? "-mx-1" : "overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair")}>
      {posts.map((p, i) => {
        const row = (
          // quiet 에서는 줄 hover 면을 회색 딱지(surface-2)보다 옅은 면으로 — 같은 면이면 마우스를 올린 줄의 딱지가 바탕에 묻혔다(2026-11-23 사용자 "뱃지가 구분이 안 된다")
          <Link href={p.href} className={cn("row-beam group flex min-h-[var(--touch-target)] flex-col gap-1.5 py-3.5 transition-colors sm:flex-row sm:items-center sm:gap-4 sm:py-3", quiet ? "hover:bg-surface-4" : "hover:bg-surface-2", bare ? "rounded-lg px-1" : "px-4")}>
            {/* 좁은 화면은 세 줄이다: 딱지 줄 | 제목(두 줄까지) | 값 줄. 한 줄에 말머리, 상태, 게임 딱지와 제목을 다 세우면
                390px 에서 제목이 "유니티 2..." 로 잘려 글이 하나도 안 읽혔다(2026-11-20 사용자 "글도 하나도 눈에 안들어온다").
                넓은 화면은 딱지 줄이 contents 로 풀려 예전처럼 한 줄에 선다 */}
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <span className="flex min-w-0 items-center gap-1.5 empty:hidden sm:contents">
                {rank && <span className="w-6 shrink-0 text-center text-[13px] font-bold tabular-nums text-acc">{rankFrom + i}</span>}
                {/* quiet(내 활동)은 말머리 딱지 하나만 — 스포 여부, 답변 대기, 관련 게임 딱지까지 한 줄에 2~3개씩 서 지저분했다(2026-11-23 사용자) */}
                {quiet ? (
                  showCategory && <CategoryTag category={p.category} quiet />
                ) : (
                  <>
                    <PostTags post={p} showCategory={showCategory} />
                    {p.game && <GameChip title={p.game.title} />}
                  </>
                )}
              </span>
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className={cn("line-clamp-2 min-w-0 text-[15px] font-semibold leading-[1.4] text-ink sm:line-clamp-1 sm:text-[14.5px]", quiet ? "underline-offset-4 group-hover:underline" : "group-hover:text-acc")}>{p.title}</span>
                {/* 댓글 수: quiet(내 활동)은 빨강(2026-11-23 사용자 "댓글 수량은 빨간색") */}
                {p.commentCount > 0 && <span className={cn("shrink-0 text-[12.5px] font-bold", quiet ? "text-danger" : "text-acc")}>[{p.commentCount}]</span>}
              </span>
            </span>
            <span className="flex min-w-0 shrink-0 items-center gap-2.5 text-[12px] tabular-nums text-dim sm:gap-3 sm:text-[12.5px]">
              <AuthorName post={p} className="max-w-[120px] truncate" />
              <span>{formatPostDate(p.createdAt)}</span>
              <span>
                {M.views} {p.viewCount.toLocaleString("ko-KR")}
              </span>
              <span>
                {M.likes} {p.likeCount.toLocaleString("ko-KR")}
              </span>
            </span>
          </Link>
        );
        return (
          <li key={p.id} className="enter-item" style={stagger(i)}>
            {row}
          </li>
        );
      })}
    </ul>
  );
}
