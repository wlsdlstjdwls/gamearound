// 게시판 목록 줄(기획서 v2.0 5.2 "목록 행"). 한 줄에 제목 하나로 압축해 많은 글을 보여 준다 —
// 말머리, 제목, 댓글 수가 왼쪽, 작성자, 날짜, 조회, 좋아요가 오른쪽. 좁은 화면에서는 오른쪽 값이 제목 아래 한 줄로 내려간다.
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/cn";
import { PostTags } from "@/components/community/badges";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { formatPostDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import type { PostRowDto } from "@/server/services/community";

/**
 * rankFrom: 순위 번호의 시작값. 쪽을 넘겨도 순위가 1부터 다시 세지 않게 목록이 앞 쪽의 글 수를 넘긴다.
 * bare: 이미 흰 판 안에 서는 목록(게시판 목록, 내 활동) — 판을 한 겹 더 두르지 않고 줄 사이 선만 긋는다.
 */
export function PostList({ posts, rank = false, rankFrom = 1, showCategory = true, empty, bare = false }: { posts: PostRowDto[]; rank?: boolean; rankFrom?: number; showCategory?: boolean; empty?: { title: string; description?: string; action?: { href: string; label: string } }; bare?: boolean }) {
  if (posts.length === 0) return <EmptyState title={empty?.title ?? M.emptyTitle} description={empty?.description ?? M.emptyLead} action={empty?.action} />;
  return (
    <ul className={cn("divide-y divide-line-soft", bare ? "-mx-1" : "overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair")}>
      {posts.map((p, i) => (
        <li key={p.id} className="enter-item" style={stagger(i)}>
          <Link href={p.href} className={cn("group flex min-h-[var(--touch-target)] flex-col gap-1 py-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4", bare ? "rounded-lg px-1" : "px-4")}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {rank && <span className="w-6 shrink-0 text-center text-[13px] font-bold tabular-nums text-acc">{rankFrom + i}</span>}
              <PostTags post={p} showCategory={showCategory} />
              <span className="truncate text-[14.5px] font-semibold text-ink group-hover:text-acc">{p.title}</span>
              {p.commentCount > 0 && <span className="shrink-0 text-[12.5px] font-bold text-acc">[{p.commentCount}]</span>}
            </span>
            <span className="flex shrink-0 items-center gap-3 text-[12.5px] tabular-nums text-dim">
              <span className="max-w-[120px] truncate">{p.authorName}</span>
              <span>{formatPostDate(p.createdAt)}</span>
              <span>
                {M.views} {p.viewCount.toLocaleString("ko-KR")}
              </span>
              <span>
                {M.likes} {p.likeCount.toLocaleString("ko-KR")}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
