// 게시판 목록 줄(기획서 v2.0 5.2 "목록 행"). 한 줄에 제목 하나로 압축해 많은 글을 보여 준다 —
// 말머리, 관련 게임, 제목, 댓글 수가 왼쪽, 작성자, 날짜, 조회, 좋아요가 오른쪽. 좁은 화면에서는 오른쪽 값이 제목 아래 한 줄로 내려간다.
// 말머리는 카테고리 하나짜리 게시판(공략, 개발일지)에서도 세운다 — 기획서 7장 "말머리: 카테고리별 색이 다름" 은 목록 행의 약속이고,
// 리뷰만 스포 딱지가, 홍보만 유형 딱지가 서는 탓에 공략 줄만 맨 제목으로 시작하면 다른 게시판과 줄 모양이 달라진다.
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { AdLabel } from "@/components/ui/ad-label";
import { AdTrack } from "@/components/promo/ad-track";
import { cn } from "@/lib/cn";
import { AuthorName, GameChip, PostTags } from "@/components/community/badges";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { formatPostDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import type { PostRowDto } from "@/server/services/community";

/**
 * rankFrom: 순위 번호의 시작값. 쪽을 넘겨도 순위가 1부터 다시 세지 않게 목록이 앞 쪽의 글 수를 넘긴다.
 * bare: 이미 흰 판 안에 서는 목록(게시판 목록, 내 활동) — 판을 한 겹 더 두르지 않고 줄 사이 선만 긋는다.
 * adBoostIds: 유료 고정 줄(2026-10-27, 홍보 게시판 위)이면 줄마다 걸기 줄 id(posts 와 같은 순서). 줄마다 "광고" 표시를 달고
 *   보임, 누름을 센다(components/promo/ad-track).
 */
export function PostList({ posts, rank = false, rankFrom = 1, showCategory = true, empty, bare = false, adBoostIds }: { posts: PostRowDto[]; rank?: boolean; rankFrom?: number; showCategory?: boolean; empty?: { title: string; description?: string; action?: { href: string; label: string } }; bare?: boolean; adBoostIds?: readonly string[] }) {
  if (posts.length === 0) return <EmptyState title={empty?.title ?? M.emptyTitle} description={empty?.description ?? M.emptyLead} action={empty?.action} />;
  return (
    <ul className={cn("divide-y divide-line-soft", bare ? "-mx-1" : "overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair")}>
      {posts.map((p, i) => {
        const boostId = adBoostIds?.[i];
        const row = (
          <Link href={p.href} className={cn("row-beam group flex min-h-[var(--touch-target)] flex-col gap-1 py-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4", bare ? "rounded-lg px-1" : "px-4")}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {rank && <span className="w-6 shrink-0 text-center text-[13px] font-bold tabular-nums text-acc">{rankFrom + i}</span>}
              {adBoostIds && <AdLabel />}
              <PostTags post={p} showCategory={showCategory} />
              {p.game && <GameChip title={p.game.title} />}
              <span className="truncate text-[14.5px] font-semibold text-ink group-hover:text-acc">{p.title}</span>
              {p.commentCount > 0 && <span className="shrink-0 text-[12.5px] font-bold text-acc">[{p.commentCount}]</span>}
            </span>
            <span className="flex shrink-0 items-center gap-3 text-[12.5px] tabular-nums text-dim">
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
            {boostId ? <AdTrack boostId={boostId}>{row}</AdTrack> : row}
          </li>
        );
      })}
    </ul>
  );
}
