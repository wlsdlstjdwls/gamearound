// 글 상세(기획서 v2.0 S-15): 말머리, 제목, 작성자, 작성일, 조회수, 본문, 관련 게임, 좋아요, 저장, 댓글, 이전/다음 글, 목록으로.
// 게시판 글(/board/<게시판>/p/<id>)과 라운지 글(/lounge/p/<id>)이 같은 틀을 쓴다.
// 본문은 에디터가 낸 HTML 이면 한 번 더 걸러(lib/community/sanitize) 그리고, 옛 글자 본문은 글자 그대로 보인다(lib/community/rich-text).
//
// 게시판 글은 맨 위 "이전 화면" 과 경로("게임 게시판 > 리뷰 > 게시글")를 머리띠 아래 공용 줄(components/page-trail)이 세운다 —
// 주소에 게시판이 들어 있어 하위 메뉴 띠와 같은 표로 소속을 읽는다(lib/community/constants 의 postPath). 그래서 여기서는
// 되돌아가기 링크를 다시 세우지 않는다(두 줄이 같은 말을 한다). 라운지 글은 아직 공용 줄이 서지 않아 제 링크를 둔다.
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AuthorName, PostTags } from "@/components/community/badges";
import { Comments, PostReactions, SpoilerGate } from "@/components/community/post-interactions";
import { PostGameCard } from "@/components/community/post-game-card";
import { DbUnavailablePage } from "@/components/db-unavailable";
import { BackLink } from "@/components/ui/back-link";
import { Page } from "@/components/ui/page";
import { CATEGORY_LIST_PATH, isPostId, postPath } from "@/lib/community/constants";
import { isRichBody } from "@/lib/community/rich-text";
import { sanitizePostHtml } from "@/lib/community/sanitize";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_MESSAGES } from "@/lib/payments/messages";
import { boardPinPath, ROUTES } from "@/lib/routes";
import type { PostCategory } from "@/server/db/schema";
import { getPostDetail, getPostGameCard, listComments } from "@/server/services/community";

/** category: 게시판 글 주소가 품은 게시판(/board/reviews/p/<id> 면 review). 라운지 글은 주소에 카테고리가 없어 비운다 */
export async function PostDetail({ id, lounge, category }: { id: string; lounge: boolean; category?: PostCategory }) {
  if (!isPostId(id)) notFound();
  // 관련 게임 카드는 글과 같이 묻는다 — 글을 받은 뒤 물으면 왕복 하나가 줄 선다(게임이 없는 글은 null 이 돌아온다)
  const loaded = await orDbDown(Promise.all([getPostDetail(id), listComments(id), getPostGameCard(id)]));
  if (loaded === DB_DOWN) return <DbUnavailablePage retryHref={category ? postPath(id, category) : `${lounge ? ROUTES.lounge : ROUTES.board}/p/${id}`} />;
  const [post, comments, game] = loaded;
  // 라운지 글을 게시판 주소로(또는 반대로) 열면 없는 글로 본다 — 메뉴 소속이 주소로 정해지기 때문이다
  if (!post || (post.category === "devlog" || post.category === "qna") !== lounge) notFound();
  // 다른 게시판 주소로 연 글(/board/guides/p/<리뷰 id>)은 제 주소로 보낸다 — 띠와 경로가 엉뚱한 게시판을 켜지 않게
  if (category && post.category !== category) permanentRedirect(postPath(post.id, post.category));
  const listPath = CATEGORY_LIST_PATH[post.category];
  const body = isRichBody(post.body) ? (
    <div className="post-body break-words" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.body) }} />
  ) : (
    <div className="whitespace-pre-wrap break-words text-[15.5px] leading-[1.85] text-ink">{post.body}</div>
  );

  return (
    <Page width="tight" gap={22}>
      {lounge && <BackLink href={listPath}>{M.backToList}</BackLink>}
      <article className="flex flex-col gap-6 rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-8">
        <header className="flex flex-col gap-3 border-b border-line-soft pb-5">
          <p className="flex flex-wrap items-center gap-1.5">
            <PostTags post={post} />
          </p>
          <h1 className="text-[22px] font-extrabold leading-[1.35] tracking-[-0.02em] text-ink sm:text-[26px]">{post.title}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-dim">
            <AuthorName post={post} className="font-semibold text-ink-2" />
            <span>{formatDateTime(post.createdAt)}</span>
            <span>
              {M.views} {post.viewCount.toLocaleString("ko-KR")}
            </span>
            {/* 내 홍보 글에만 — 홍보 목록 위 고정을 사는 입구(2026-10-27). 남에게는 보이지 않는다 */}
            {post.isMine && post.category === "promo" && (
              <Link href={boardPinPath(post.id)} className="tap ml-auto inline-flex items-center font-semibold text-acc hover:underline">
                {PAYMENT_MESSAGES.adBuy}
              </Link>
            )}
          </p>
        </header>
        {/* 관련 게임 — 이 글이 무엇에 대한 글인지, 그 게임이 지금 얼마인지(components/community/post-game-card) */}
        {game && <PostGameCard game={game} />}
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
        <Comments postId={post.id} initial={comments} replies />
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
