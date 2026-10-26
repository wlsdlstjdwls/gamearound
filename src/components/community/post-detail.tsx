// 글 상세(기획서 v2.0 S-15): 말머리, 제목, 작성자, 작성일, 조회수, 본문, 좋아요, 저장, 댓글, 이전/다음 글, 목록으로.
// 게시판 글(/board/p/<id>)과 라운지 글(/lounge/p/<id>)이 같은 틀을 쓴다. 본문은 글자 그대로 보인다(HTML 로 읽지 않는다).
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostTags } from "@/components/community/badges";
import { Comments, PostReactions, SpoilerGate } from "@/components/community/post-interactions";
import { DbUnavailablePage } from "@/components/db-unavailable";
import { BackLink } from "@/components/ui/back-link";
import { Page } from "@/components/ui/page";
import { CATEGORY_LIST_PATH } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { getPostDetail, listComments } from "@/server/services/community";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PostDetail({ id, lounge }: { id: string; lounge: boolean }) {
  if (!UUID.test(id)) notFound();
  const loaded = await orDbDown(Promise.all([getPostDetail(id), listComments(id)]));
  if (loaded === DB_DOWN) return <DbUnavailablePage retryHref={`${lounge ? ROUTES.lounge : ROUTES.board}/p/${id}`} />;
  const [post, comments] = loaded;
  // 라운지 글을 게시판 주소로(또는 반대로) 열면 없는 글로 본다 — 메뉴 소속이 주소로 정해지기 때문이다
  if (!post || (post.category === "devlog" || post.category === "qna") !== lounge) notFound();
  const listPath = CATEGORY_LIST_PATH[post.category];
  const body = <div className="whitespace-pre-wrap break-words text-[15.5px] leading-[1.85] text-ink">{post.body}</div>;

  return (
    <Page width="tight" gap={22}>
      <BackLink href={listPath}>{M.backToList}</BackLink>
      <article className="flex flex-col gap-6 rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-8">
        <header className="flex flex-col gap-3 border-b border-line-soft pb-5">
          <p className="flex flex-wrap items-center gap-1.5">
            <PostTags post={post} />
          </p>
          <h1 className="text-[22px] font-extrabold leading-[1.35] tracking-[-0.02em] text-ink sm:text-[26px]">{post.title}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-dim">
            <span className="font-semibold text-ink-2">{post.authorName}</span>
            <span>{formatDateTime(post.createdAt)}</span>
            <span>
              {M.views} {post.viewCount.toLocaleString("ko-KR")}
            </span>
          </p>
        </header>
        {post.spoiler ? <SpoilerGate isMine={post.isMine}>{body}</SpoilerGate> : body}
        {post.link && (
          <a href={post.link} target="_blank" rel="noopener noreferrer nofollow" className="w-fit break-all text-[14px] font-semibold text-acc hover:underline">
            {post.link}
            <span className="sr-only">(새 창에서 열림)</span>
          </a>
        )}
        <PostReactions postId={post.id} liked={post.liked} likeCount={post.likeCount} saved={post.saved} />
      </article>

      <div className="rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-8">
        <Comments postId={post.id} initial={comments} />
      </div>

      <nav aria-label={M.backToList} className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair">
        {[
          { label: M.prev, n: post.prev },
          { label: M.next, n: post.next },
        ].map(({ label, n }) =>
          n ? (
            <Link key={label} href={n.href} className="flex min-h-[var(--touch-target)] items-center gap-3 px-4 text-[14px] hover:bg-surface-2">
              <span className="w-14 shrink-0 text-[12.5px] text-dim">{label}</span>
              <span className="truncate text-ink">{n.title}</span>
            </Link>
          ) : null,
        )}
        <Link href={listPath} className="flex min-h-[var(--touch-target)] items-center justify-center text-[14px] font-semibold text-acc hover:bg-surface-2">
          {M.backToList}
        </Link>
      </nav>
    </Page>
  );
}
