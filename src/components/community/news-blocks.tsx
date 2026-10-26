// 소식 블록 — 게시판 홈(S-10)과 라운지 홈(S-16)이 같은 모양을 쓴다(기획서 v2.0 6.6 "같은 규칙으로 소식을 구성").
// 급상승은 카드 넷, 기다리는 글은 "댓글 남기기"(라운지는 "답변 남기기")가 붙은 줄 여섯이다.
import Link from "next/link";
import { PostTags } from "@/components/community/badges";
import { SectionHead } from "@/components/ui/page";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { formatPostDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import type { PostRowDto } from "@/server/services/community";

export function RisingBlock({ posts, allHref }: { posts: PostRowDto[]; allHref: string }) {
  return (
    <section aria-labelledby="rising-heading" className="flex flex-col gap-3.5">
      <SectionHead
        id="rising-heading"
        size="sub"
        title={M.rising}
        action={
          <Link href={allHref} className="text-[13px] font-semibold text-acc hover:underline">
            {M.allPostsLink}
          </Link>
        }
      />
      {posts.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-4 text-[13.5px] text-dim">{M.emptyTitle}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {posts.map((p, i) => (
            <li key={p.id} className="enter-item" style={stagger(i)}>
              <Link href={p.href} className="lift press flex h-full flex-col gap-2.5 rounded-[var(--radius-md)] bg-surface p-4 shadow-hair transition-colors hover:bg-surface-2">
                <span className="flex items-center gap-1.5">
                  <span className="text-[15px] font-black tabular-nums text-acc">{i + 1}</span>
                  <PostTags post={p} />
                </span>
                <span className="line-clamp-2 text-[15px] font-bold leading-[1.45] text-ink">{p.title}</span>
                <span className="mt-auto flex gap-3 text-[12.5px] tabular-nums text-dim">
                  <span>{p.authorName}</span>
                  <span>
                    {M.likes} {p.likeCount}
                  </span>
                  <span>
                    {M.comments} {p.commentCount}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WaitingBlock({ title, posts, cta }: { title: string; posts: PostRowDto[]; cta: string }) {
  return (
    <section aria-labelledby="waiting-heading" className="flex flex-col gap-3.5">
      <SectionHead id="waiting-heading" size="sub" title={title} />
      {posts.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-4 text-[13.5px] text-dim">{M.emptyTitle}</p>
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair">
          {posts.map((p) => (
            <li key={p.id} className="flex min-h-[var(--touch-target)] items-center gap-3 px-4 py-2.5">
              <PostTags post={p} />
              <Link href={p.href} className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink hover:text-acc">
                {p.title}
              </Link>
              <span className="hidden shrink-0 text-[12.5px] text-dim sm:inline">{formatPostDate(p.createdAt)}</span>
              <Link href={`${p.href}#comments-heading`} className="shrink-0 rounded-full bg-acc-soft px-3 py-1.5 text-[12.5px] font-semibold text-acc hover:bg-acc hover:text-on-ink">
                {cta}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 현황 스트립의 한 칸 — 숫자가 주인공이고, 누르면 그 게시판으로 간다 */
export function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <>
      <span className="text-[12.5px] text-dim">{label}</span>
      <span className="text-[22px] font-black tabular-nums text-ink">{value.toLocaleString("ko-KR")}</span>
    </>
  );
  const cls = "flex flex-col gap-1 rounded-[var(--radius-md)] bg-surface px-4 py-3.5 shadow-hair";
  return href ? (
    <Link href={href} className={`${cls} press transition-colors hover:bg-surface-2`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
