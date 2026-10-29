// /admin/posts — 게시글 관리(기획서 v2.0 2.2 운영진 "부적절한 글 숨김", 9.2 관리자 콘솔 "게시글 관리").
// 게임 게시판(리뷰, 공략, 홍보)과 라운지(개발일지, 질문 피드백)의 글, 댓글을 최신순으로 보고 숨기거나 되살린다.
//
// 큐가 아니라 목록이다 — 글은 승인 없이 바로 서고 신고 장치가 아직 없다(기획서 6.1 "신고는 협의").
// 그래서 메뉴 배지를 달지 않고, 오래된 글은 쪽 넘기기 대신 찾기로 간다(줄 수 상한은 services/community/admin).
// 숨긴 칸을 따로 둔 이유: 되살리기는 숨긴 것을 찾아야 할 수 있다. 전체 칸에 섞으면 백 줄 안에서 묻힌다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import Link from "next/link";
import { ContentModeration } from "@/components/admin/content-moderation";
import { DataCell, DataHead, DataList, DataRow } from "@/components/admin/data-rows";
import { ADMIN_FIELD } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Tag } from "@/components/ui/tag";
import { Clamp } from "@/components/ui/tooltip";
import { POST_ADMIN_MESSAGES as M, ADMIN_NAV } from "@/lib/admin/messages";
import { COMMENT_ADMIN_COLS, POST_ADMIN_COLS } from "@/lib/admin/table-cols";
import { CATEGORY_LABEL, CATEGORY_TONE } from "@/lib/community/constants";
import { formatDateTime } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listAllCommentsForAdmin } from "@/server/services/indie";
import { listPostsForAdmin, POST_ADMIN_LIMIT, POST_ADMIN_TABS, type AdminCommentRowDto, type AdminPostRowDto, type PostAdminTab } from "@/server/services/community";

export const metadata: Metadata = { title: ADMIN_NAV.posts };

const TAB_LABEL: Record<PostAdminTab, string> = { posts: M.tabPosts, hidden: M.tabHidden, comments: M.tabComments, hiddenComments: M.tabHiddenComments };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function tabHref(tab: PostAdminTab): string {
  return tab === POST_ADMIN_TABS[0] ? ROUTES.adminPosts : `${ROUTES.adminPosts}?tab=${tab}`;
}

function PostRows({ rows }: { rows: AdminPostRowDto[] }) {
  if (rows.length === 0) return <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{M.empty}</p>;
  return (
    <div>
      <DataHead cols={POST_ADMIN_COLS} labels={[M.colPost, M.colCategory, M.colAuthor, M.colWhen, M.colReaction, M.colAction]} />
      <DataList>
        {rows.map((r) => (
          <DataRow key={`${r.id}-${r.status}`} cols={POST_ADMIN_COLS}>
            <DataCell label={M.colPost}>
              <Link href={r.href} className="font-semibold text-ink hover:text-acc hover:underline">
                <Clamp lines={2} className="break-words">
                  {r.title}
                </Clamp>
              </Link>
            </DataCell>
            <DataCell label={M.colCategory}>
              <Tag tone={CATEGORY_TONE[r.category]}>{CATEGORY_LABEL[r.category]}</Tag>
            </DataCell>
            <DataCell label={M.colAuthor} className="text-mut">
              <span className="block truncate">{r.authorName}</span>
              <span className="block truncate text-[11.5px] text-dim">{r.authorEmail}</span>
            </DataCell>
            <DataCell label={M.colWhen} className="text-[12px] text-mut tabular-nums">
              {formatDateTime(r.createdAt)}
            </DataCell>
            <DataCell label={M.colReaction} className="text-[12px] text-mut tabular-nums">
              {M.reaction(r.viewCount, r.likeCount, r.commentCount)}
            </DataCell>
            <DataCell>
              <ContentModeration kind="post" id={r.id} status={r.status} />
            </DataCell>
          </DataRow>
        ))}
      </DataList>
    </div>
  );
}

function CommentRows({ rows }: { rows: AdminCommentRowDto[] }) {
  if (rows.length === 0) return <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{M.emptyComments}</p>;
  return (
    <div>
      <DataHead cols={COMMENT_ADMIN_COLS} labels={[M.colComment, M.colOnPost, M.colAuthor, M.colWhen, M.colAction]} />
      <DataList>
        {rows.map((r) => (
          <DataRow key={`${r.kind}-${r.id}-${r.status}`} cols={COMMENT_ADMIN_COLS} align="start">
            <DataCell label={M.colComment}>
              <Clamp lines={3} className="whitespace-pre-line break-words text-ink">
                {r.body}
              </Clamp>
            </DataCell>
            <DataCell label={M.colOnPost} className="text-mut">
              <Link href={r.postHref} className="hover:text-acc hover:underline">
                <Clamp lines={2} className="break-words">
                  {r.postTitle}
                </Clamp>
              </Link>
              {r.postStatus === "hidden" && (
                <span className="mt-1 inline-block">
                  <Tag tone="warn">{M.postHidden}</Tag>
                </span>
              )}
            </DataCell>
            <DataCell label={M.colAuthor} className="text-mut">
              <span className="block truncate">{r.authorName}</span>
              <span className="block truncate text-[11.5px] text-dim">{r.authorEmail}</span>
            </DataCell>
            <DataCell label={M.colWhen} className="text-[12px] text-mut tabular-nums">
              {formatDateTime(r.createdAt)}
            </DataCell>
            <DataCell>
              <ContentModeration kind={r.kind} id={r.id} status={r.status} />
            </DataCell>
          </DataRow>
        ))}
      </DataList>
    </div>
  );
}

export default async function AdminPostsPage({ searchParams }: Props) {
  await requireRoleOrForbid("admin");
  const sp = await searchParams;
  const raw = firstParam(sp.tab);
  const tab: PostAdminTab = (POST_ADMIN_TABS as readonly string[]).includes(raw ?? "") ? (raw as PostAdminTab) : POST_ADMIN_TABS[0];
  const q = (firstParam(sp.q) ?? "").trim();
  const isComments = tab === "comments" || tab === "hiddenComments";
  const comments = isComments ? await listAllCommentsForAdmin(tab === "hiddenComments", q) : null;
  const postRows = isComments ? null : await listPostsForAdmin(tab === "hidden" ? "hidden" : "posts", q);
  const shown = (comments ?? postRows ?? []).length;

  return (
    <NavPendingScope>
      <div className="flex flex-col gap-5">
        <AdminScreenHead title={ADMIN_NAV.posts} lead={M.lead} />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <nav aria-label={M.title} className="flex flex-wrap gap-1.5">
            {POST_ADMIN_TABS.map((t) => (
              <NavChip key={t} group="tab" current="page" href={tabHref(t)} active={tab === t}>
                {TAB_LABEL[t]}
              </NavChip>
            ))}
          </nav>
          {/* 찾기는 주소에 싣는다 — 칸을 바꿔도 찾던 말은 버린다(글과 댓글은 찾는 칸이 다르다) */}
          <form action={ROUTES.adminPosts} method="get" role="search" className="flex w-full gap-2 md:w-[340px]">
            {tab !== POST_ADMIN_TABS[0] && <input type="hidden" name="tab" value={tab} />}
            <label htmlFor="admin-posts-q" className="sr-only">
              {isComments ? M.searchCommentLabel : M.searchLabel}
            </label>
            <input id="admin-posts-q" name="q" type="search" defaultValue={q} placeholder={M.searchPlaceholder} className={ADMIN_FIELD} />
            <Button type="submit" size="sm" variant="secondary" className="shrink-0">
              {M.search}
            </Button>
          </form>
        </div>

        <PendingRegion>
          <div className="flex flex-col gap-3">
            {comments ? <CommentRows rows={comments} /> : <PostRows rows={postRows ?? []} />}
            {/* 상한만큼 왔으면 더 있을 수 있다 — 오래된 글은 찾기로 간다 */}
            {shown >= POST_ADMIN_LIMIT && <p className="text-[12px] text-dim">{M.limitNote(POST_ADMIN_LIMIT)}</p>}
          </div>
        </PendingRegion>
      </div>
    </NavPendingScope>
  );
}
