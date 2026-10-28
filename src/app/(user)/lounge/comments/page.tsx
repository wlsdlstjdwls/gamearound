// /lounge/comments — 내 라운지 글에 달린 댓글함(2026-10-28 사용자: "새 댓글 칸을 누르면 내 활동으로만 간다,
// 댓글을 나열해 보여 주고 누르면 그 글의 그 댓글로 스크롤까지").
// 줄 하나가 댓글 하나다. 글 단위로 묶지 않는 이유: 사용자가 찾는 것은 "누가 무슨 말을 했나" 이고, 묶으면 새 댓글이 접힌 칸 안에 숨는다.
// 누르면 글 상세의 #comment-<id> 로 간다 — 글을 열면 그 글의 댓글이 "봤다" 로 적혀(services/community/inbox)
// 돌아왔을 때 이 줄의 "새 댓글" 표시와 라운지 홈 칸의 숫자가 함께 준다.
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ChatIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { Page, PageHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL, commentPath, LOUNGE_CATEGORIES, writePath } from "@/lib/community/constants";
import { formatAgo } from "@/lib/format";
import { LOUNGE_COMMENTS_MESSAGES as M } from "@/lib/lounge/messages";
import { stagger } from "@/lib/motion";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listCommentsOnMyPosts, MY_COMMENTS_WINDOW_DAYS, type MyPostCommentDto } from "@/server/services/community";

// 사람마다 다르고, 글을 열고 돌아올 때마다 "새" 표시가 바뀐다
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: M.title, robots: { index: false } };

/** 줄 머리의 글쓴이 동그라미 — 이름 첫 글자 */
function Avatar({ name, fresh }: { name: string; fresh: boolean }) {
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold", fresh ? "bg-acc-soft text-acc" : "bg-surface-2 text-ink-2")}>
      {name.slice(0, 1)}
    </span>
  );
}

function CommentRow({ c, now, i }: { c: MyPostCommentDto; now: number; i: number }) {
  return (
    <li className="enter-item" style={stagger(i)}>
      <Link
        href={commentPath(c.postId, c.category, c.id)}
        aria-label={M.goLabel(c.postTitle)}
        className={cn(
          "press group/row flex gap-3.5 rounded-[var(--radius-md)] p-4 transition-colors duration-base hover:bg-surface-2",
          c.isNew ? "bg-surface shadow-[var(--elev-card)]" : "bg-surface/70 shadow-hair",
        )}
      >
        <Avatar name={c.authorName} fresh={c.isNew} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-dim">
            <span className="font-semibold text-ink-2">{c.authorName}</span>
            <span>{c.isReply ? M.reply : M.comment}</span>
            <span className="tabular-nums">{formatAgo(c.createdAt, now)}</span>
            {c.isNew && <span className="rounded-full bg-acc px-1.5 py-px text-[11px] font-bold text-on-ink">{M.newMark}</span>}
          </span>
          <Clamp lines={2} className={cn("text-[14.5px] leading-[1.6]", c.isNew ? "font-semibold text-ink" : "text-ink-2")}>
            {c.body}
          </Clamp>
          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-mut">
            <span className="shrink-0 rounded-[var(--radius-xs)] bg-surface-2 px-1.5 py-px text-[11.5px] font-semibold text-ink-2">{CATEGORY_LABEL[c.category]}</span>
            <span className="truncate">{c.postTitle}</span>
          </span>
        </span>
        <ChevronLeftIcon size={16} aria-hidden className="mt-3 shrink-0 rotate-180 text-dim transition-transform duration-base group-hover/row:translate-x-0.5" />
      </Link>
    </li>
  );
}

export default async function LoungeCommentsPage() {
  const user = await requireUserOrRedirect();
  const list = await listCommentsOnMyPosts(user.id, LOUNGE_CATEGORIES);
  const fresh = list.filter((c) => c.isNew).length;
  const now = new Date().getTime();

  return (
    <Page width="tight" gap={18}>
      <PageHead title={M.title}>
        <p className="text-[14px] text-mut">{M.lead(MY_COMMENTS_WINDOW_DAYS)}</p>
      </PageHead>
      {list.length === 0 ? (
        <EmptyState icon={<ChatIcon size={22} />} title={M.emptyTitle} description={M.emptyLead} action={{ href: writePath("devlog"), label: M.emptyAction }} />
      ) : (
        <>
          <p className={cn("text-[13.5px] font-semibold", fresh > 0 ? "text-ink" : "text-dim")}>{fresh > 0 ? M.newCount(fresh) : M.allSeen}</p>
          <ul className="flex flex-col gap-2">
            {list.map((c, i) => (
              <CommentRow key={c.id} c={c} now={now} i={i} />
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
